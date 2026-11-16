import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveTitle } from "next/dist/lib/metadata/resolvers/resolve-title";
import { locales, type Locale } from "@/types/domain";

const { getProductBySlug, getProductAlternatePaths } = vi.hoisted(() => ({
  getProductBySlug: vi.fn(),
  getProductAlternatePaths: vi.fn(),
}));

vi.mock("@/lib/env", () => ({ env: { SITE_URL: "https://ricewind.com" } }));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn(), setRequestLocale: vi.fn() }));
vi.mock("@/components/guide-links", () => ({ GuideLinks: () => null }));
vi.mock("@/lib/guide-links", () => ({ getProductGuides: vi.fn() }));
vi.mock("@/components/json-ld", () => ({ JsonLd: () => null }));
vi.mock("@/components/products/product-detail", () => ({ ProductDetail: () => null }));
vi.mock("@/components/products/product-view-tracker", () => ({ ProductViewTracker: () => null }));
vi.mock("@/lib/content-repository", () => ({
  getProductBySlug,
  getProductAlternatePaths,
  getProductRecommendations: vi.fn(),
  getSlugRedirect: vi.fn(),
}));

import { generateMetadata } from "./page";
import { localizedMetadata } from "@/lib/seo";

const titles: Record<Locale, string> = {
  zh: "华为 R4850G2 | 48V 电源模块",
  en: "Huawei R4850G2 | 48V Rectifier",
  ru: "Huawei R4850G2 | Выпрямитель 48 В",
  fr: "Huawei R4850G2 | Redresseur 48 V",
  de: "Huawei R4850G2 | 48-V-Gleichrichter",
  es: "Huawei R4850G2 | Rectificador de 48 V",
  ar: "Huawei R4850G2 | مقوم 48 فولت",
};
const alternates = Object.fromEntries(locales.map((locale) => [locale, `/products/model-${locale}`]));

beforeEach(() => {
  getProductAlternatePaths.mockResolvedValue(alternates);
});

describe.each(locales)("actual product generateMetadata in %s", (locale) => {
  async function metadata(seoTitle: string | null | undefined) {
    getProductBySlug.mockResolvedValue({ id: "model", name: "Fallback RICEWIND | RX-48 Stock", seoTitle, seoDescription: "CMS description" });
    return generateMetadata({ params: Promise.resolve({ locale, slug: `model-${locale}` }) });
  }

  it("uses the seven-language CMS title verbatim and bypasses the real Next parent template", async () => {
    const result = await metadata(titles[locale]);
    expect(result.title).toEqual({ absolute: titles[locale] });
    expect(resolveTitle(result.title, "%s | RICEWIND").absolute).toBe(titles[locale]);
    expect(resolveTitle(result.title, "%s | 禾风起").absolute).toBe(titles[locale]);
    expect(result.openGraph?.title).toBe(titles[locale]);
    expect(result.twitter?.title).toBe(titles[locale]);
    expect(result.description).toBe("CMS description");
  });

  it.each([undefined, null, "", " \t\r\n "])("falls back to name only for absent/blank seoTitle (%j)", async (seoTitle) => {
    const result = await metadata(seoTitle);
    expect(result.title).toEqual({ absolute: "Fallback RICEWIND | RX-48 Stock" });
    expect(result.openGraph?.title).toBe("Fallback RICEWIND | RX-48 Stock");
    expect(result.twitter?.title).toBe("Fallback RICEWIND | RX-48 Stock");
  });

  it("does not regex-strip legitimate model text, branding or surrounding CMS whitespace", async () => {
    const title = "  RX-48 | RICEWIND edition | 禾风起 型号 | Stock & Wholesale Price sensor  ";
    const result = await metadata(title);
    expect(result.title).toEqual({ absolute: title });
    expect(result.openGraph?.title).toBe(title);
    expect(result.twitter?.title).toBe(title);
  });

  it("preserves canonical and all real translated alternates", async () => {
    const result = await metadata(titles[locale]);
    expect(result.alternates?.canonical).toBe(`https://ricewind.com/${locale}/products/model-${locale}`);
    expect(result.alternates?.languages).toEqual({
      ...Object.fromEntries(locales.map((language) => [language, `https://ricewind.com/${language}/products/model-${language}`])),
      "x-default": "https://ricewind.com/en/products/model-en",
    });
  });
});

it("keeps missing products empty and never queries guessed alternate URLs", async () => {
  getProductAlternatePaths.mockClear();
  getProductBySlug.mockResolvedValue(null);
  expect(await generateMetadata({ params: Promise.resolve({ locale: "en", slug: "missing" }) })).toEqual({});
  expect(getProductAlternatePaths).not.toHaveBeenCalled();
});

it("retains the existing non-product site-name policy", () => {
  const result = localizedMetadata("en", "/solutions", "Solutions", "Description");
  expect(result.title).toBe("Solutions");
  expect(result.openGraph?.title).toBe("Solutions | RICEWIND");
  expect(result.twitter?.title).toBe("Solutions | RICEWIND");
});
