import { z } from "zod";

export const homeHeroLocales = ["zh", "en", "ru"] as const;
export const homeHeroKeys = ["home-hero-1", "home-hero-2", "home-hero-3", "home-hero-4"] as const;

export function isSafeInternalHref(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return false;
  try {
    const parsed = new URL(value, "https://hefengqi.local");
    return parsed.origin === "https://hefengqi.local"
      && !parsed.pathname.startsWith("/admin")
      && !parsed.pathname.startsWith("/api")
      && !parsed.pathname.startsWith("/media");
  } catch {
    return false;
  }
}

const optionalText = (max: number) => z.string().trim().max(max);
const internalHref = optionalText(300).refine((value) => !value || isSafeInternalHref(value), "HERO_LINK_INVALID");

export const homeHeroTranslationSchema = z.object({
  locale: z.enum(homeHeroLocales),
  eyebrow: optionalText(80),
  title: optionalText(160),
  summary: optionalText(500),
  primaryLabel: optionalText(60),
  primaryHref: internalHref,
  secondaryLabel: optionalText(60),
  secondaryHref: internalHref,
  imageAlt: optionalText(180),
});

export const homeHeroSlideInputSchema = z.object({
  key: z.enum(homeHeroKeys),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0).max(3),
  desktopAssetId: optionalText(100),
  mobileAssetId: optionalText(100),
  desktopFocusX: z.number().int().min(0).max(100),
  desktopFocusY: z.number().int().min(0).max(100),
  mobileFocusX: z.number().int().min(0).max(100),
  mobileFocusY: z.number().int().min(0).max(100),
  translations: z.array(homeHeroTranslationSchema).length(3),
}).superRefine((slide, context) => {
  for (const translation of slide.translations) {
    const secondaryComplete = Boolean(translation.secondaryLabel) === Boolean(translation.secondaryHref);
    if (!secondaryComplete) context.addIssue({ code: "custom", path: ["translations", translation.locale, "secondaryHref"], message: "HERO_SECONDARY_LINK_INCOMPLETE" });
    if (!slide.enabled) continue;
    const required = [
      ["eyebrow", translation.eyebrow, 2],
      ["title", translation.title, 2],
      ["summary", translation.summary, 20],
      ["primaryLabel", translation.primaryLabel, 2],
      ["primaryHref", translation.primaryHref, 1],
      ["imageAlt", translation.imageAlt, 2],
    ] as const;
    for (const [field, value, minimum] of required) {
      if (value.length < minimum) context.addIssue({ code: "custom", path: ["translations", translation.locale, field], message: "HERO_TRANSLATION_INCOMPLETE" });
    }
  }
  if (slide.enabled && !slide.desktopAssetId) context.addIssue({ code: "custom", path: ["desktopAssetId"], message: "HERO_DESKTOP_IMAGE_REQUIRED" });
});

export const homeHeroSlidesInputSchema = z.array(homeHeroSlideInputSchema).length(4).superRefine((slides, context) => {
  if (slides.filter((slide) => slide.enabled).length > 4) context.addIssue({ code: "custom", message: "HERO_ENABLED_LIMIT" });
  if (new Set(slides.map((slide) => slide.sortOrder)).size !== slides.length) context.addIssue({ code: "custom", message: "HERO_SORT_ORDER_DUPLICATE" });
});

function stringValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function parseHomeHeroFormData(formData: FormData) {
  return homeHeroSlidesInputSchema.safeParse(homeHeroKeys.map((key, index) => ({
    key,
    enabled: formData.get(`slide${index}Enabled`) === "on",
    sortOrder: Number(stringValue(formData, `slide${index}SortOrder`) || index),
    desktopAssetId: stringValue(formData, `slide${index}DesktopAssetId`),
    mobileAssetId: stringValue(formData, `slide${index}MobileAssetId`),
    desktopFocusX: Number(stringValue(formData, `slide${index}DesktopFocusX`) || 72),
    desktopFocusY: Number(stringValue(formData, `slide${index}DesktopFocusY`) || 50),
    mobileFocusX: Number(stringValue(formData, `slide${index}MobileFocusX`) || 50),
    mobileFocusY: Number(stringValue(formData, `slide${index}MobileFocusY`) || 70),
    translations: homeHeroLocales.map((locale) => ({
      locale,
      eyebrow: stringValue(formData, `slide${index}${locale}Eyebrow`),
      title: stringValue(formData, `slide${index}${locale}Title`),
      summary: stringValue(formData, `slide${index}${locale}Summary`),
      primaryLabel: stringValue(formData, `slide${index}${locale}PrimaryLabel`),
      primaryHref: stringValue(formData, `slide${index}${locale}PrimaryHref`),
      secondaryLabel: stringValue(formData, `slide${index}${locale}SecondaryLabel`),
      secondaryHref: stringValue(formData, `slide${index}${locale}SecondaryHref`),
      imageAlt: stringValue(formData, `slide${index}${locale}ImageAlt`),
    })),
  })));
}
