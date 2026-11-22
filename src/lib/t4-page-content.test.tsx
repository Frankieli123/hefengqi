import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fixture from "./t4-mca0300.fixture.json";
import { optimizeMca0300, aboutPageCopy } from "./t4-page-content";
import { faqSchema, productSchema, localizedMetadata } from "./seo";
import { ProductDetail } from "@/components/products/product-detail";
import type { ProductView } from "@/types/domain";
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/products/product-gallery", () => ({ ProductGallery: () => null }));
vi.mock("@/components/products/product-contact-links", () => ({ ProductContactLinks: () => null }));
const original = fixture as ProductView;
describe("T4 English MCA0300 and About presentation", () => {
 it("uses concise title and the exact published definition for metadata", () => {
  const p = optimizeMca0300("en", original);
  expect(p.seoTitle).toBe("MCA0300 300W Cabinet Air Conditioner, 220VAC | RICEWIND");
  expect(p.seoDescription).toBe(original.directDefinition);
  expect(p.slug).toBe(original.slug); expect(p.attributes).toBe(original.attributes);
 });
 it("does not affect other products/locales or mutate the CMS view", () => {
  expect(optimizeMca0300("zh", original)).toBe(original);
  const other = {...original, model:"OTHER"}; expect(optimizeMca0300("en", other)).toBe(other);
  optimizeMca0300("en",original); expect(original.faqs).toEqual([]);
 });
 it("keeps FAQ answers identical to existing CMS fields and structured data", () => {
  const p = optimizeMca0300("en",original);
  expect(p.faqs.map(f => f.answer)).toEqual([original.directDefinition,original.whatItIs,original.suitableFor]);
  expect(faqSchema(p.faqs).mainEntity.map(q=>q.acceptedAnswer.text)).toEqual(p.faqs.map(f=>f.answer));
  expect(productSchema("en",p).mpn).toBe("MCA0300");
 });
 it("renders one descriptive H1, crawlable FAQ answers and real related/category links", () => {
  const p=optimizeMca0300("en",original);
  const labels = new Proxy({} as Record<string,string>, { get: (_target,key) => String(key) });
  const html=renderToStaticMarkup(<ProductDetail product={p} locale="en" labels={labels as never} recommendations={[{...original,id:"related",slug:"existing-related-product"}]} />);
  const doc=new DOMParser().parseFromString(html,"text/html");
  expect(doc.querySelectorAll("h1")).toHaveLength(1);expect(doc.querySelector("h1")?.textContent).toBe(p.name);
  expect(doc.querySelectorAll("details")).toHaveLength(3);
  for(const f of p.faqs)expect(doc.body.textContent).toContain(f.answer);
  expect(doc.querySelector('a[href="#specifications"]')).not.toBeNull();
  expect(doc.querySelector('a[href="/products/category/thermal-management/cabinet-air-conditioning"]')).not.toBeNull();
  expect(html).toContain("existing-related-product");
 });
 it("shortens About metadata and makes identity explicit without new qualification claims", () => {
  const c=aboutPageCopy("en");expect(c.metaDescription.length).toBeLessThanOrEqual(160);
  expect(c.lead).toContain("supplier and solution integrator");expect(c.lead).toContain("Hangzhou, China");
  expect(c.metaDescription).not.toMatch(/authorized|manufacturer|certified/i);
  expect(localizedMetadata("en","/about",c.metaTitle,c.metaDescription).alternates?.canonical).toContain("/en/about");
  expect(aboutPageCopy("zh").title).toBe("关于禾风起 (RICEWIND)");
 });
});
