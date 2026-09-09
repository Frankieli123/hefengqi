import "server-only";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { categoryPath, CategoryValidationError, planCategoryMove, type CategoryInput } from "@/lib/category-tree";
import { locales } from "@/types/domain";

export function categoryErrorMessage(error: unknown): string {
  if (error instanceof CategoryValidationError) return error.message;
  if (error instanceof z.ZodError) return `请检查三语名称、网址和说明，以及排序数字。${error.issues[0]?.message ?? ""}`;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "分类标识或同一语言的网址名称已存在，请换一个再保存。";
    if (error.code === "P2034") return "分类正在被其他管理员修改，请刷新后重试。";
  }
  console.error("Category operation failed", error instanceof Error ? error.name : "Unknown error");
  return "暂时无法保存分类，请稍后重试。";
}

export async function saveManagedCategory(input: CategoryInput, actorId: string) {
  return db.$transaction(async (tx) => {
    const nodes = await tx.category.findMany({ include: { translations: true } });
    const existing = input.id ? nodes.find((node) => node.id === input.id) : undefined;
    if (input.id && !existing) throw new CategoryValidationError("分类不存在，请返回列表刷新。");
    if (existing && existing.key !== input.key) throw new CategoryValidationError("内部标识创建后不可修改；显示名称可在下方修改。");
    const levels = planCategoryMove(nodes, input.id ?? "new-category", input.parentId);
    const parent = nodes.find((node) => node.id === input.parentId);
    if (existing?.status === "PUBLISHED" && parent && parent.status !== "PUBLISHED") {
      throw new CategoryValidationError("请先发布上级分类，再将已发布的分类移入。");
    }
    const fields = { key: input.key, parentId: input.parentId, sortOrder: input.sortOrder, level: levels.get(input.id ?? "new-category")! };
    const saved = existing
      ? await tx.category.update({ where: { id: existing.id }, data: fields })
      : await tx.category.create({ data: { ...fields, status: "DRAFT" } });
    for (const translation of input.translations) {
      await tx.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: saved.id, locale: translation.locale } },
        create: { categoryId: saved.id, ...translation }, update: translation,
      });
    }
    if (existing) {
      for (const [id, level] of levels) {
        if (id !== existing.id) await tx.category.update({ where: { id }, data: { level } });
      }
      const updated = nodes.map((node) => node.id === existing.id ? { ...node, ...fields, translations: input.translations } : node);
      for (const node of nodes) {
        for (const locale of locales) {
          const oldPath = categoryPath(nodes, node.id, locale);
          const newPath = categoryPath(updated, node.id, locale);
          if (!oldPath || !newPath || oldPath === newPath) continue;
          const fromPath = `/products/category/${oldPath}`;
          const toPath = `/products/category/${newPath}`;
          // Reusing an old URL must not leave a redirect loop behind.
          await tx.slugRedirect.deleteMany({ where: { locale, fromPath: toPath } });
          await tx.slugRedirect.updateMany({ where: { locale, toPath: fromPath }, data: { toPath } });
          await tx.slugRedirect.upsert({ where: { locale_fromPath: { locale, fromPath } }, create: { locale, fromPath, toPath }, update: { toPath } });
        }
      }
    }
    await tx.auditLog.create({ data: { actorId, actorType: "USER", action: existing ? "CATEGORY_UPDATE" : "CATEGORY_CREATE", entityType: "Category", entityId: saved.id } });
    return saved.id;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
}

export async function setManagedCategoryStatus(categoryId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED", actorId: string) {
  await db.$transaction(async (tx) => {
    const category = await tx.category.findUnique({
      where: { id: categoryId },
      include: { parent: true, translations: true, _count: { select: { products: { where: { status: "PUBLISHED" } }, children: { where: { status: "PUBLISHED" } } } } },
    });
    if (!category) throw new CategoryValidationError("分类不存在，请刷新后重试。");
    if (status === "PUBLISHED") {
      if (category.parent && category.parent.status !== "PUBLISHED") throw new CategoryValidationError("请先发布上级分类。");
      if (!locales.every((locale) => {
        const item = category.translations.find((translation) => translation.locale === locale);
        return item?.name.trim() && item.slug.trim() && item.description.trim() && item.seoTitle?.trim() && item.seoDescription?.trim();
      })) throw new CategoryValidationError("请先补齐中文、英文、俄文的分类资料。");
    } else if (category._count.products || category._count.children) {
      throw new CategoryValidationError("请先下架该分类中的已发布产品和子分类，再停用或归档此分类。");
    }
    await tx.category.update({ where: { id: categoryId }, data: { status } });
    await tx.auditLog.create({ data: { actorId, actorType: "USER", action: `CATEGORY_${status}`, entityType: "Category", entityId: categoryId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
