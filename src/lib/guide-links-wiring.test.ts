// Source integration guard; rendered component/query behavior is tested separately.
import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
it("wires relation-driven guides into product pages and curated guides below home solutions", () => {
 const product = readFileSync("src/app/[locale]/products/[slug]/page.tsx", "utf8");
 expect(product).toContain("getProductGuides(locale, product.id)");
 expect(product).toContain("<GuideLinks locale={locale} items={guides}");
 const home = readFileSync("src/app/[locale]/page.tsx", "utf8");
 expect(home).toContain("getFeaturedGuides(locale)");
 expect(home.indexOf("<GuideLinks")).toBeGreaterThan(home.indexOf("home-solutions-section"));
});
