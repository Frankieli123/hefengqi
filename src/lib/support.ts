import type { CategoryView, EditorialItem, ProductView } from "@/types/domain";

export const SUPPORT_PATH = "/support/troubleshooting";
export type SupportQuery = { q: string; brand: string; type: string; page: number };

export function readSupportQuery(params: Record<string, string | string[] | undefined>): SupportQuery {
  const value = (key: string) => typeof params[key] === "string" ? params[key].trim().slice(0, 160) : "";
  const page = Number(value("page"));
  return { q: value("q"), brand: value("brand"), type: value("type"), page: Number.isSafeInteger(page) && page > 0 ? page : 1 };
}

export function supportHref(query: Partial<SupportQuery>) {
  const params = new URLSearchParams();
  for (const key of ["q", "brand", "type"] as const) if (query[key]) params.set(key, query[key]!);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  return params.size ? `${SUPPORT_PATH}?${params}` : SUPPORT_PATH;
}

// Brand and model are language-independent; translated product slugs are not.
export function supportDevicePath(product: Pick<ProductView, "brand" | "model">) {
  return `${SUPPORT_PATH}/${encodeURIComponent(product.brand.toLowerCase())}/${encodeURIComponent(product.model.toLowerCase())}`;
}

export function findSupportDevice(products: ProductView[], brand: string, model: string) {
  // Next 16 can expose encoded page params but decoded metadata params.
  // Match an exact value first, then accept a single URL-decoding pass.
  const candidates = (segment: string) => {
    const values = new Set([segment.toLowerCase()]);
    try { values.add(decodeURIComponent(segment).toLowerCase()); } catch { /* A literal percent sign may be part of a model. */ }
    return values;
  };
  const brands = candidates(brand);
  const models = candidates(model);
  return products.find((product) => product.brand.toLowerCase() === brand.toLowerCase() && product.model.toLowerCase() === model.toLowerCase())
    ?? products.find((product) => brands.has(product.brand.toLowerCase()) && models.has(product.model.toLowerCase()));
}

export function equipmentCategory(product: ProductView, categories: CategoryView[]) {
  const byKey = new Map(categories.map((category) => [category.key, category]));
  let category = byKey.get(product.categoryKey);
  const visited = new Set<string>();
  while (category && category.level > 2 && category.parentKey && !visited.has(category.key)) {
    visited.add(category.key);
    category = byKey.get(category.parentKey) ?? category;
  }
  return { key: category?.key ?? product.categoryKey, name: category?.name ?? product.categoryName };
}

export function matchesSupportQuery(text: string, query: string) {
  const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
  const haystack = normalize(text);
  const terms = query.trim().split(/\s+/).map(normalize).filter(Boolean);
  return terms.every((term) => haystack.includes(term));
}

export function relatedSupportArticles(product: ProductView, articles: EditorialItem[]) {
  // Explicit CMS links only; a shared brand does not establish applicability.
  return articles.filter((article) => article.relatedProductSlots?.some((slot) => slot.productId === product.id));
}
