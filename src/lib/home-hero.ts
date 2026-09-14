import "server-only";

import { cache } from "react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { mediaAssetToHeroImage } from "@/lib/home-hero-media";
import type { Locale } from "@/types/domain";
import type { HomeHeroSlideView } from "@/types/home-hero";

export const getHomeHeroSlides = cache(async (locale: Locale): Promise<HomeHeroSlideView[]> => {
  if (!env.DATABASE_URL) return [];
  const translationLocales: Locale[] = locale === "en" ? ["en"] : [locale, "en"];
  const records = await db.homeHeroSlide.findMany({
    where: {
      enabled: true,
      desktopAsset: { kind: "IMAGE", scanStatus: "CLEAN", rightsApproved: true },
      translations: { some: { locale: { in: translationLocales } } },
    },
    include: {
      desktopAsset: true,
      mobileAsset: true,
      translations: { where: { locale: { in: translationLocales } } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 4,
  });

  return records.flatMap((record) => {
    const translation = record.translations.find((item) => item.locale === locale)
      ?? record.translations.find((item) => item.locale === "en");
    const desktop = record.desktopAsset ? mediaAssetToHeroImage(record.desktopAsset, record.desktopFocusX, record.desktopFocusY) : undefined;
    if (!translation || !desktop || !translation.title || !translation.summary || !translation.primaryLabel || !translation.primaryHref || !translation.imageAlt) return [];
    const mobile = record.mobileAsset ? mediaAssetToHeroImage(record.mobileAsset, record.mobileFocusX, record.mobileFocusY) : undefined;
    return [{
      id: record.id,
      key: record.key,
      contentDirection: translation.locale === "ar" ? "rtl" : "ltr",
      eyebrow: translation.eyebrow,
      title: translation.title,
      summary: translation.summary,
      primary: { label: translation.primaryLabel, href: translation.primaryHref },
      secondary: translation.secondaryLabel && translation.secondaryHref ? { label: translation.secondaryLabel, href: translation.secondaryHref } : undefined,
      imageAlt: translation.imageAlt,
      desktop,
      mobile,
    } satisfies HomeHeroSlideView];
  });
});
