import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import { link, open, unlink } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { z } from "zod";
import { canonical, countSchema, dateSchema, digest, dimensionSchema, gscEncodingSchema, nextDate, researchPrivacy, scopeKey, searchLabelSchema, validGscPage, type Observation } from "./model";
import { readPrivateLedger, validatePrivateResearchOutput } from "./store";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const researchSelectionSchema = z.object({
  scope: hash, start: dateSchema, end: dateSchema, source: z.literal("gsc"),
  encoding: gscEncodingSchema, evidenceKind: z.enum(["fixture", "live_api"]),
}).strict().refine((value) => value.start <= value.end);
const candidateSchema = z.object({
  page: searchLabelSchema, query: searchLabelSchema, clicks: countSchema, impressions: countSchema,
  ctr: z.number().finite().min(0).max(1).nullable(), position: z.number().finite().nonnegative().nullable(),
}).strict();
export const researchSummarySchema = z.object({
  version: z.literal(1), scope: hash, start: dateSchema, end: dateSchema, source: z.literal("gsc"),
  encoding: gscEncodingSchema, evidenceKind: z.enum(["fixture", "live_api"]),
  dimensions: z.array(dimensionSchema), propertyHash: hash, ledgerDigest: hash,
  coverage: z.literal("api_visible_subset_not_property_totals"),
  labels: z.enum(["hash_only", "private_readable_untrusted"]), warning: z.literal(researchPrivacy),
  candidates: z.array(candidateSchema).max(100000),
}).strict().refine((summary) => {
  if (summary.start > summary.end || new Set(summary.dimensions).size !== summary.dimensions.length || !summary.dimensions.includes("page") || !summary.dimensions.includes("query")) return false;
  if (summary.labels === "private_readable_untrusted" && summary.encoding !== "raw_page_query_private") return false;
  return summary.candidates.every((candidate) => {
    if (candidate.clicks > candidate.impressions || candidate.ctr !== (candidate.impressions ? candidate.clicks / candidate.impressions : null) || !candidate.impressions && candidate.position !== null) return false;
    if (summary.labels === "hash_only") return [candidate.page, candidate.query].every((value) => /^sha256:[a-f0-9]{64}$/.test(value));
    try { return validGscPage(candidate.page, `${new URL(candidate.page).origin}/`); } catch { return false; }
  });
});
export type ResearchSummary = z.infer<typeof researchSummarySchema>;

async function buildSummary(output: string, input: unknown, readable: boolean): Promise<ResearchSummary> {
  try {
    const selection = researchSelectionSchema.parse(input);
    const ledger = await readPrivateLedger(output);
    const manifests = ledger.runs.filter((run) => run.status === "complete" && run.source === selection.source && run.dimensionEncoding === selection.encoding && run.evidenceKind === selection.evidenceKind && scopeKey(run) === selection.scope);
    const manifest = manifests[0];
    if (!manifest || !manifest.dimensions.includes("page") || !manifest.dimensions.includes("query")) throw new Error("PAGE_QUERY_SCOPE_REQUIRED");
    if (readable && selection.encoding !== "raw_page_query_private") throw new Error("READABLE_REQUIRES_PRIVATE_RAW");
    const ids = new Set(manifests.map((run) => run.id));
    const rows = ledger.observations.filter((row) => ids.has(row.runId) && row.date >= selection.start && row.date <= selection.end);
    for (let date = selection.start, days = 0; date <= selection.end; date = nextDate(date), days++) {
      if (days >= 366 || !ledger.checkpoints.some((checkpoint) => checkpoint.scope === selection.scope && checkpoint.from <= date && checkpoint.through >= date) || !rows.some((row) => row.date === date)) throw new Error("INCOMPLETE_SELECTED_COVERAGE");
    }
    const grouped = new Map<string, { page: string; query: string; clicks: number; impressions: number; weightedPosition: number }>();
    const label = (row: Observation, name: "page" | "query") => readable || row.dimensionEncoding === "sha256_page_query" ? row.dimensions[name]! : `sha256:${digest(row.dimensions[name]!)}`;
    for (const row of rows) {
      const page = label(row, "page"); const query = label(row, "query");
      const key = canonical([page, query]);
      const aggregate = grouped.get(key) ?? { page, query, clicks: 0, impressions: 0, weightedPosition: 0 };
      aggregate.clicks += row.metrics.clicks!; aggregate.impressions += row.metrics.impressions!;
      aggregate.weightedPosition += row.metrics.position! * row.metrics.impressions!;
      grouped.set(key, aggregate);
    }
    const candidates = [...grouped.values()].map(({ weightedPosition, ...aggregate }) => ({ ...aggregate, ctr: aggregate.impressions ? aggregate.clicks / aggregate.impressions : null, position: aggregate.impressions ? weightedPosition / aggregate.impressions : null })).sort((left, right) => canonical([left.page, left.query]).localeCompare(canonical([right.page, right.query])));
    return researchSummarySchema.parse({
      version: 1, ...selection, dimensions: manifest.dimensions, propertyHash: digest(manifest.property), ledgerDigest: ledger.digest,
      coverage: "api_visible_subset_not_property_totals", labels: readable ? "private_readable_untrusted" : "hash_only", warning: researchPrivacy,
      candidates,
    });
  } catch { throw new Error("RESEARCH_SUMMARY_REJECTED"); }
}

export async function summarizeResearch(output: string, selection: unknown): Promise<ResearchSummary> {
  return buildSummary(output, selection, false);
}

export async function exportResearch(output: string, selection: unknown, destination: string): Promise<{ status: "private_report_created" | "private_report_created_cleanup_pending" }> {
  try {
    const directory = await validatePrivateResearchOutput(output);
    const path = resolve(destination);
    if (dirname(path) !== directory || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}\.json$/.test(basename(path)) || basename(path) === "ledger.json") throw new Error("UNSAFE_REPORT_PATH");
    const summary = await buildSummary(output, selection, true);
    const temporary = `${path}.tmp-${randomUUID()}`;
    const file = await open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    try {
      try {
        await file.writeFile(`${canonical(summary)}\n`);
        await file.sync();
        await file.close();
      } catch (error) {
        await file.close().catch(() => {});
        throw error;
      }
      await link(temporary, path);
    } catch (error) {
      await unlink(temporary).catch(() => {});
      throw error;
    }
    try { await unlink(temporary); }
    catch { return { status: "private_report_created_cleanup_pending" }; }
    return { status: "private_report_created" };
  } catch { throw new Error("PRIVATE_RESEARCH_EXPORT_REJECTED"); }
}
