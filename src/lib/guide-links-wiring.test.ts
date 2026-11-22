// Source integration guard; rendered component/query behavior is tested separately.
import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
it("keeps relation-driven product guides but omits guides from every localized homepage", () => {
 const product = readFileSync("src/app/[locale]/products/[slug]/page.tsx", "utf8");
 expect(product).toContain("getProductGuides(locale, product.id)");
 expect(product).toContain("<GuideLinks locale={locale} items={guides}");
 const home = readFileSync("src/app/[locale]/page.tsx", "utf8");
 expect(home).not.toContain("getFeaturedGuides");
 expect(home).not.toContain("GuideLinks");
 expect(home).toContain("home-solutions-section");
});
