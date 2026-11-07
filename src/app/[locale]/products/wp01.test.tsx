import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import Page, { generateMetadata } from "./page";
import CategoryPage, { generateMetadata as categoryMetadata } from "./category/[...slug]/page";
const { catalog } = vi.hoisted(() => ({ catalog: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { SITE_URL: "https://ricewind.com" } }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (key: string) => key }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children }: React.ComponentProps<"a">) => <a href={href}>{children}</a> }));
vi.mock("@/lib/content-repository", () => ({
  getProductCatalogPage: catalog,
  getCategories: async () => [{ id: "p", key: "parent", slug: "parent", path: "parent", name: "Parent category", description: "Parent", level: 1 }, { parentKey: "parent", level: 2, id: "c", key: "c", slug: "child", path: "parent/child", name: "Category", description: "Description" }],
  getCategoryAlternatePaths: async () => ({ en: "/products/category/parent/child", fr: "/products/category/parent/enfant" }),
  getSlugRedirect: async () => undefined,
}));
const props = (page?: string | string[], extra = {}) => ({ params: Promise.resolve({ locale: "en", slug: ["parent", "child"] }), searchParams: Promise.resolve({ page, ...extra }) });
beforeEach(() => catalog.mockResolvedValue({ products: [], currentPage: 2, pageCount: 2, totalCount: 13 }));
it("self canonicalizes valid list and category page two without assuming translated page counts", async () => {
  for (const [metadata, path] of [[generateMetadata, "/products"], [categoryMetadata, "/products/category/parent/child"]] as const) {
    const result = await metadata(props("2"));
    expect(result.alternates?.canonical).toBe(`https://ricewind.com/en${path}?page=2`);
    expect(result.alternates?.languages).not.toHaveProperty("fr");
  }
});
it.each(["0", "-1", "2x", "1.5", "", "999999999999999999", ["1", "2"]])("rejects invalid page %j", async (page) => {
  await expect(Page(props(page))).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
});
it("rejects out of range pages instead of serving the last page under another URL", async () => {
  await expect(Page(props("3"))).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  await expect(CategoryPage(props("3"))).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
});
it("keeps query and comparison variants noindex, including empty parameters", async () => {
  for (const extra of [{ q: "" }, { compare: "x" }]) expect((await generateMetadata(props("1", extra))).robots).toMatchObject({ index: false });
});
it("uses the complete category path for metadata lookup", async () => {
  const result = await categoryMetadata({ ...props(), params: Promise.resolve({ locale: "en", slug: ["wrong", "child"] }) });
  expect(result.alternates).toBeUndefined();
});
it("rejects missing category paths without loading a product table", async () => {
  catalog.mockClear();
  await expect(CategoryPage({ ...props(), params: Promise.resolve({ locale: "en", slug: ["missing"] }) })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  expect(catalog).not.toHaveBeenCalled();
});

it("preserves empty search page one and rejects page two", async () => {
  catalog.mockResolvedValue({ products: [], currentPage: 1, pageCount: 1, totalCount: 0 });
  for (const component of [Page, CategoryPage]) {
    const html = renderToStaticMarkup(await component(props("1", { q: "no-match" })));
    expect(load(html)("h1")).toHaveLength(1);
    expect(load(html).text()).toContain("emptyHelp");
    await expect(component(props("2", { q: "no-match" }))).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  }
});
it("canonicalizes explicit page one without a query", async () => {
  for (const [metadata, path] of [[generateMetadata, "/products"], [categoryMetadata, "/products/category/parent/child"]] as const) {
    expect((await metadata(props("1"))).alternates?.canonical).toBe(`https://ricewind.com/en${path}`);
  }
});
it("renders valid page two and ancestor breadcrumbs in HTML and JSON-LD", async () => {
  const $ = load(renderToStaticMarkup(await CategoryPage(props("2"))));
  expect($('a[href="/products/category/parent"]').text()).toContain("Parent category");
  const graph = JSON.parse($('script[type="application/ld+json"]').text())["@graph"];
  expect(graph.find((item: { "@type": string }) => item["@type"] === "BreadcrumbList").itemListElement.map((item: { item: string }) => item.item)).toEqual(["https://ricewind.com/en", "https://ricewind.com/en/products", "https://ricewind.com/en/products/category/parent", "https://ricewind.com/en/products/category/parent/child"]);
  expect(graph.find((item: { "@type": string }) => item["@type"] === "CollectionPage").url).toBe("https://ricewind.com/en/products/category/parent/child?page=2");
  expect($('a[aria-current="page"]').text()).toContain("2");
});
