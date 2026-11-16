import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { purgeEdgeOne } from "@/lib/edgeone";
import { validateProductForPublication } from "@/lib/publication";
import { chooseSourcedValue } from "@/lib/source-priority";

const extractedSchema = z.object({
  facts: z.array(z.object({
    label: z.string().trim().min(1),
    value: z.string().trim().min(1),
    sourceQuote: z.string().trim().min(1),
  })).max(50),
}).passthrough();

function normalizedLabel(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replaceAll(/[^\p{L}\p{N}]/gu, "");
}

function localizedLabels(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.values(value as Record<string, unknown>).filter((item): item is string => typeof item === "string");
}

function selectOptions(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (!value || typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap((item) => Array.isArray(item) ? item : [item]).filter((item): item is string => typeof item === "string");
}

function parsedAttribute(type: "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT", raw: string, options: unknown) {
  const value = raw.trim();
  if (type === "NUMBER") return /^-?\d+(?:\.\d+)?$/.test(value) ? { textValue: null, numberValue: value, booleanValue: null } : null;
  if (type === "BOOLEAN") {
    const normalized = normalizedLabel(value);
    if (["true", "yes", "1", "是", "да"].includes(normalized)) return { textValue: null, numberValue: null, booleanValue: true };
    if (["false", "no", "0", "否", "нет"].includes(normalized)) return { textValue: null, numberValue: null, booleanValue: false };
    return null;
  }
  if (type === "SELECT") {
    const match = selectOptions(options).find((option) => normalizedLabel(option) === normalizedLabel(value));
    return match ? { textValue: match, numberValue: null, booleanValue: null } : null;
  }
  return { textValue: value, numberValue: null, booleanValue: null };
}

export async function applyImportedRecordToProduct(recordId: string, productId: string, actorId: string) {
  const result = await db.$transaction(async (tx) => {
    const [record, product, automation] = await Promise.all([
      tx.importedRecord.findUnique({ where: { id: recordId }, include: { crawlJob: { include: { source: true } } } }),
      tx.product.findUnique({ where: { id: productId }, include: { attributes: true, category: { include: { attributes: { where: { archivedAt: null } } } } } }),
      tx.siteSetting.findUnique({ where: { key: "automation" } }),
    ]);
    if (!record || !product) throw new Error("IMPORT_TARGET_NOT_FOUND");

    const extracted = extractedSchema.parse(record.extracted);
    const definitions = product.category.attributes;
    const applied: string[] = [];
    const ignored: string[] = [];
    const handledDefinitions = new Set<string>();

    for (const fact of extracted.facts) {
      const factLabel = normalizedLabel(fact.label);
      const definition = definitions.find((item) => normalizedLabel(item.key) === factLabel || localizedLabels(item.labels).some((label) => normalizedLabel(label) === factLabel));
      if (!definition || handledDefinitions.has(definition.id)) { ignored.push(fact.label); continue; }
      const parsed = parsedAttribute(definition.type, fact.value, definition.options);
      if (!parsed) { ignored.push(fact.label); continue; }
      const current = product.attributes.find((item) => item.definitionId === definition.id);
      const selected = chooseSourcedValue<"current" | "candidate">(
        current ? { value: "current", origin: current.origin, locked: current.locked } : undefined,
        { value: "candidate", origin: "WEB_SOURCE", locked: false, source: record.sourceUrl ?? undefined },
      );
      if (selected.value !== "candidate") { ignored.push(fact.label); continue; }
      await tx.productAttribute.upsert({
        where: { productId_definitionId: { productId, definitionId: definition.id } },
        update: { ...parsed, origin: "WEB_SOURCE", locked: false, confidence: record.confidence },
        create: { productId, definitionId: definition.id, ...parsed, origin: "WEB_SOURCE", locked: false, confidence: record.confidence },
      });
      handledDefinitions.add(definition.id);
      applied.push(definition.key);
    }

    await tx.product.update({ where: { id: productId }, data: { status: "NEEDS_REVIEW", contentUpdatedAt: new Date() } });
    const gateErrors = await validateProductForPublication(productId, tx);
    const globalAutomation = automation?.value as { autoPublish?: boolean } | null;
    const shouldPublish = globalAutomation?.autoPublish === true && record.crawlJob?.source?.autoPublish === true && gateErrors.length === 0;
    let purgeUrls: string[] = [];
    if (shouldPublish) {
      const published = await tx.product.update({ where: { id: productId }, data: { status: "PUBLISHED", publishedAt: new Date(), translations: { updateMany: { where: {}, data: { published: true } } } }, include: { translations: true } });
      purgeUrls = published.translations.map((translation) => `${env.SITE_URL}/${translation.locale}/products/${translation.slug}`);
    }
    await tx.importedRecord.update({ where: { id: recordId }, data: { normalizedKey: product.normalizedId, status: shouldPublish ? "PUBLISHED" : applied.length ? "READY" : "NEEDS_REVIEW" } });
    await tx.auditLog.create({ data: { actorId, actorType: "USER", action: shouldPublish ? "IMPORT_APPLY_AND_PUBLISH" : "IMPORT_APPLY", entityType: "ImportedRecord", entityId: recordId, details: { productId, applied, ignored, gateErrors } } });
    return { applied, ignored, gateErrors, published: shouldPublish, purgeUrls };
  }, { timeout: 15_000 });

  await purgeEdgeOne(result.purgeUrls);
  return { applied: result.applied, ignored: result.ignored, gateErrors: result.gateErrors, published: result.published };
}
