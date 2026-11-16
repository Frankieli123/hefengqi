import { describe, expect, it } from "vitest";
import { homeHeroLocales, homeHeroSlidesInputSchema, isSafeInternalHref } from "@/lib/home-hero-schema";
import type { Locale } from "@/types/domain";

function translation(locale: Locale) {
  return { locale, eyebrow: "Critical infrastructure", title: "Reliable energy systems", summary: "Structured equipment selection for demanding communications and energy projects.", primaryLabel: "Explore products", primaryHref: "/products", secondaryLabel: "", secondaryHref: "", imageAlt: "Abstract communications and energy infrastructure" };
}

function slide(key: "home-hero-1" | "home-hero-2" | "home-hero-3" | "home-hero-4", sortOrder: number) {
  return { key, enabled: true, sortOrder, desktopAssetId: `asset-${sortOrder}`, mobileAssetId: "", desktopFocusX: 70, desktopFocusY: 50, mobileFocusX: 50, mobileFocusY: 70, translations: homeHeroLocales.map(translation) };
}

describe("home hero validation", () => {
  const completeSlides = () => [slide("home-hero-1", 0), slide("home-hero-2", 1), slide("home-hero-3", 2), slide("home-hero-4", 3)];

  it("accepts four complete seven-language slides", () => {
    expect(homeHeroSlidesInputSchema.safeParse(completeSlides()).success).toBe(true);
  });

  it("rejects an enabled slide without a desktop image", () => {
    const input = slide("home-hero-1", 0); input.desktopAssetId = "";
    expect(homeHeroSlidesInputSchema.safeParse([input, ...completeSlides().slice(1)]).success).toBe(false);
  });

  it("rejects duplicate ordering and out-of-range focus", () => {
    const first = slide("home-hero-1", 0); first.desktopFocusX = 101;
    const rest = completeSlides().slice(1); rest[0].sortOrder = 0;
    expect(homeHeroSlidesInputSchema.safeParse([first, ...rest]).success).toBe(false);
  });

  it("only accepts safe public internal links", () => {
    expect(isSafeInternalHref("/products?category=power")).toBe(true);
    expect(isSafeInternalHref("//example.com/path")).toBe(false);
    expect(isSafeInternalHref("/admin/settings")).toBe(false);
    expect(isSafeInternalHref("javascript:alert(1)")).toBe(false);
  });
});
