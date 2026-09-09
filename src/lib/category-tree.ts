import { z } from "zod";
import { locales, type Locale } from "@/types/domain";

const slug = z.string().trim().min(1).max(100).regex(/^[a-z0-9][a-z0-9-]*$/, "请使用小写字母、数字或连字符");
const translationSchema = z.object({
  locale: z.enum(locales),
  name: z.string().trim().min(1, "请填写分类名称").max(120),
  slug,
  description: z.string().trim().min(10, "分类说明至少需要 10 个字符").max(2000),
  seoTitle: z.string().trim().min(1).max(120),
  seoDescription: z.string().trim().min(10).max(180),
});

export const categoryInputSchema = z.object({
  id: z.string().max(100).optional(),
  key: slug,
  parentId: z.string().max(100).nullable(),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  translations: z.array(translationSchema).length(3).refine(
    (items) => locales.every((locale) => items.some((item) => item.locale === locale)),
    "请填写完整的中文、英文和俄文内容",
  ),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type CategoryFormState = { error?: string };
export class CategoryValidationError extends Error {}

export function parseCategoryForm(form: FormData): CategoryInput {
  const value = (key: string) => String(form.get(key) ?? "").trim();
  return categoryInputSchema.parse({
    id: value("categoryId") || undefined,
    key: value("key"),
    parentId: !value("parentId") || value("parentId") === "none" ? null : value("parentId"),
    sortOrder: value("sortOrder") || 0,
    translations: locales.map((locale) => ({
      locale,
      name: value(`${locale}Name`),
      slug: value(`${locale}Slug`),
      description: value(`${locale}Description`),
      seoTitle: value(`${locale}SeoTitle`) || value(`${locale}Name`),
      seoDescription: value(`${locale}SeoDescription`) || value(`${locale}Description`).slice(0, 180),
    })),
  });
}

export interface CategoryNode {
  id: string;
  parentId: string | null;
  level: number;
  sortOrder: number;
  status: string;
}

export function categoryDescendantIds(nodes: CategoryNode[], id: string): Set<string> {
  const result = new Set([id]);
  const queue = [id];
  for (let i = 0; i < queue.length; i++) {
    for (const node of nodes) {
      if (node.parentId === queue[i] && !result.has(node.id)) {
        result.add(node.id);
        queue.push(node.id);
      }
    }
  }
  return result;
}

export function planCategoryMove(nodes: CategoryNode[], id: string, parentId: string | null) {
  const parent = nodes.find((node) => node.id === parentId);
  if (parentId && !parent) throw new CategoryValidationError("上级分类不存在，请刷新后重新选择。");
  if (parent?.status === "ARCHIVED") throw new CategoryValidationError("不能选择已归档的上级分类。");
  const descendants = categoryDescendantIds(nodes, id);
  if (parentId && descendants.has(parentId)) throw new CategoryValidationError("不能将分类移到自身或自己的子分类下。");
  const levels = new Map<string, number>([[id, (parent?.level ?? 0) + 1]]);
  const queue = [id];
  for (let i = 0; i < queue.length; i++) {
    for (const child of nodes.filter((node) => node.parentId === queue[i])) {
      if (levels.has(child.id)) throw new CategoryValidationError("分类层级存在循环，请检查上级分类。");
      levels.set(child.id, levels.get(queue[i])! + 1);
      queue.push(child.id);
    }
  }
  if ([...levels.values()].some((level) => level > 3)) throw new CategoryValidationError("分类最多三级，移动后子分类也不能超过三级。");
  return levels;
}

export function sortCategoryTree<T extends CategoryNode>(nodes: T[]): T[] {
  const ordered = [...nodes].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  const result: T[] = [];
  const visited = new Set<string>();
  function visit(node: T) {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    result.push(node);
    ordered.filter((child) => child.parentId === node.id).forEach(visit);
  }
  ordered.filter((node) => !node.parentId).forEach(visit);
  ordered.forEach(visit);
  return result;
}

export function categoryPath(nodes: Array<CategoryNode & { translations: Array<{ locale: Locale; slug: string }> }>, id: string, locale: Locale): string | null {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const parts: string[] = [];
  const visited = new Set<string>();
  let currentId: string | null = id;
  while (currentId) {
    if (visited.has(currentId)) return null;
    visited.add(currentId);
    const current = byId.get(currentId);
    const translation = current?.translations.find((item) => item.locale === locale);
    if (!current || !translation) return null;
    parts.unshift(translation.slug);
    currentId = current.parentId;
  }
  return parts.join("/");
}
