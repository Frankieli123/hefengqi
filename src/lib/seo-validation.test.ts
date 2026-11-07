import { expect, it } from "vitest";
import { validateSeoHtml, validateSitemapXml } from "./seo-validation";
it("validates SSR content, canonical, hreflang, schema and links without crawling", () => {
  const html = '<html><head><title>Example</title><link rel="canonical" href="https://ricewind.com/en/products?page=2"><link rel="alternate" hreflang="en" href="https://ricewind.com/en/products?page=2"></head><body><h1>Products</h1><a href="/en/products/example">Example</a><script type="application/ld+json">{"@type":"Product","name":"Example"}</script></body></html>';
  expect(validateSeoHtml(html, "https://ricewind.com/en/products?page=2")).toEqual([]);
  expect(validateSeoHtml(html.replace('/en/products/example', '/xx/products/example'), "https://ricewind.com/en/products?page=2")).toContain("Invalid internal locale: /xx/products/example");
  expect(validateSeoHtml(html.replace('<h1>Products</h1>', ''), "https://ricewind.com/en/products?page=2")).toContain("Expected one SSR h1");
});
it("rejects duplicate, noncanonical and nonindexable sitemap entries", () => {
  expect(validateSitemapXml('<urlset><url><loc>https://ricewind.com/en/products</loc></url></urlset>', 'https://ricewind.com')).toEqual([]);
  const errors = validateSitemapXml('<urlset><url><loc>https://ricewind.com/en/search?q=x</loc><lastmod>bad</lastmod></url><url><loc>https://ricewind.com/en/search?q=x</loc></url></urlset>', 'https://ricewind.com');
  expect(errors).toEqual(expect.arrayContaining(["Duplicate sitemap URL: https://ricewind.com/en/search?q=x", "Invalid sitemap date: bad"]));
});

const canonical = "https://ricewind.com/en/products/a";
const document = (body = "", head = "") => `<title>Product</title><link rel="canonical" href="${canonical}">${head}<h1>Product</h1>${body}`;
it.each([
  [{ "@type": "Product", offers: { availability: "InStock" } }],
  { "@graph": [{ "@graph": [{ "@type": ["Thing", "Product"], offers: {} }] }] },
])("traverses JSON-LD arrays and nested graphs", (payload) => {
  expect(validateSeoHtml(document(`<script type="application/ld+json">${JSON.stringify(payload)}</script>`), canonical)).toContain("Unverified RFQ product promise");
});
it.each(["https://ricewind.com/xx/products/a", "//ricewind.com/xx/a", "../../xx/a", "/support/anything", "/images/missing.png"])("checks normalized internal destination %s", (href) => {
  expect(validateSeoHtml(document(`<a href="${href}">link</a>`), canonical)).toContain(`Invalid internal locale: ${href}`);
});
it("accepts root entry and only explicitly known asset paths", () => {
  expect(validateSeoHtml(document('<a href="/">Language</a><a href="/support/manual.pdf">Manual</a><a href="../b">Product</a>'), canonical, { staticAssetPaths: ["/support/manual.pdf"] })).toEqual([]);
});
it("requires an explicit expected hreflang map when checking completeness", () => {
  const expectedHreflang = { en: canonical, fr: "https://ricewind.com/fr/products/b" };
  expect(validateSeoHtml(document(), canonical, { expectedHreflang })).toContain("Missing hreflang: en");
  expect(validateSeoHtml(document("", `<link rel="alternate" hreflang="en" href="${canonical}"><link rel="alternate" hreflang="fr" href="https://ricewind.com/fr/products/wrong">`), canonical, { expectedHreflang })).toContain("Hreflang mismatch: fr");
});
it("rejects an empty sitemap and calendar rollover", () => {
  expect(validateSitemapXml("<urlset/>", "https://ricewind.com")).toContain("Empty sitemap");
  expect(validateSitemapXml('<urlset><url><loc>https://ricewind.com/en</loc><lastmod>2026-02-30</lastmod></url></urlset>', "https://ricewind.com")).toContain("Invalid sitemap date: 2026-02-30");
});
