import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import Page, { generateMetadata } from "./page";
import { getDemoProducts } from "@/content/demo-data";
import { locales } from "@/types/domain";
const { product, moved } = vi.hoisted(() => ({ product: vi.fn(), moved: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { SITE_URL: "https://ricewind.com" } }));
vi.mock("@/lib/content-repository", () => ({ getProductBySlug: product, getProductRecommendations: async () => [], getSlugRedirect: moved, getProductAlternatePaths: async () => ({ en: "/products/real-model" }) }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ locale = "en", href, prefetch: _prefetch, ...props }: React.ComponentProps<"a"> & { locale?: string; prefetch?: boolean }) => { void _prefetch; return <a href={`/${locale}${href === "/" ? "" : href}`} {...props} />; } }));
const props = (locale = "en") => ({ params: Promise.resolve({ locale, slug: "real-model" }) });
beforeEach(() => { product.mockResolvedValue({ ...getDemoProducts("en")[0], slug: "real-model" }); moved.mockResolvedValue(undefined); });
it.each(locales)("keeps RFQ facts, links and breadcrumbs in %s server HTML", async (locale) => {
  const $ = load(renderToStaticMarkup(await Page(props(locale))));
  expect($("h1")).toHaveLength(1);
  const graph = JSON.parse($('script[type="application/ld+json"]').text())["@graph"];
  expect(graph[0].name).toBe($("h1").text());
  expect(graph[0]).not.toHaveProperty("offers");
  expect(graph[1].itemListElement.at(-1).item).toBe(`https://ricewind.com/${locale}/products/real-model`);
  expect($(`a[href="/${locale}/products"]`).length).toBeGreaterThan(0);
  expect($('a[href^="tel:"]').length).toBeGreaterThan(0);
  expect($('a[href^="https://wa.me/"]').length).toBeGreaterThan(0);
});
it("keeps real detail alternates and missing-product 404", async () => {
  expect((await generateMetadata(props())).alternates?.languages).not.toHaveProperty("fr");
  product.mockResolvedValue(undefined);
  await expect(Page(props())).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
});
it("preserves historical slug redirects and does not change their target", async () => {
  product.mockResolvedValue(undefined);
  moved.mockResolvedValue("/products/current-model");
  await expect(Page(props())).rejects.toMatchObject({ digest: "NEXT_REDIRECT;replace;/en/products/current-model;307;" });
});
