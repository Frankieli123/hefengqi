import { expect, it, vi } from "vitest";
import sitemap from "./sitemap";
import { GET } from "./image-sitemap.xml/route";

vi.mock("@/lib/env", () => ({ env: { SITE_URL: "https://ricewind.com/" } }));
vi.mock("@/lib/content-repository", () => ({
  getCategories: vi.fn(async () => []),
  getEditorialSummaries: vi.fn(async () => []),
  getProductSitemapEntries: vi.fn(async (locale: string) => locale === "fr" ? [
    { slug: "modele-reel", updatedAt: "", image: { src: "/media/a&b.webp" } },
    { slug: "modele-reel", updatedAt: "", image: { src: "/media/a&b.webp" } },
    { slug: "compare", updatedAt: "bad", image: { src: "/media/compare.webp" } },
  ] : []),
}));
it("deduplicates canonical published locale URLs and omits unavailable dates", async () => {
  const entries = await sitemap();
  expect(new Set(entries.map(({ url }) => url)).size).toBe(entries.length);
  const products = entries.filter(({ url }) => url.includes("modele-reel"));
  expect(products).toHaveLength(1);
  expect(products[0].url).toBe("https://ricewind.com/fr/products/modele-reel");
  expect(products[0].lastModified).toBeUndefined();
  expect(entries.some(({ url }) => /search|compare|\?|\/industries/.test(url))).toBe(false);
});
it("image sitemap neither invents dates nor duplicates URLs and escapes XML", async () => {
  const xml = await (await GET()).text();
  expect(xml.match(/<url>/g)).toHaveLength(1);
  expect(xml).not.toContain("<lastmod>");
  expect(xml).toContain("/media/a&amp;b.webp");
});

it("normalizes the same origin for metadata, schema and both sitemaps", async () => {
  const { localizedMetadata, organizationSchema } = await import("@/lib/seo");
  expect(localizedMetadata("en", "/products", "Products", "").alternates?.canonical).toBe("https://ricewind.com/en/products");
  expect(organizationSchema("en")["@id"]).toBe("https://ricewind.com/#organization");
  expect((await sitemap()).every(({ url }) => !url.includes(".com//"))).toBe(true);
  expect(await (await GET()).text()).toContain("<loc>https://ricewind.com/fr/products/modele-reel</loc>");
});
