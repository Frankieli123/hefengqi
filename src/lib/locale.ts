import { notFound } from "next/navigation";
import { locales, type CoreLocale, type Locale } from "@/types/domain";

export function assertLocale(value: string): asserts value is Locale {
  if (!locales.includes(value as Locale)) notFound();
}

export function localeName(locale: Locale) {
  return ({ zh: "中文", en: "English", ru: "Русский", fr: "Français", de: "Deutsch", es: "Español", ar: "العربية" } as Record<Locale, string>)[locale] || "English";
}

export function coreContentLocale(locale: Locale): CoreLocale {
  return locale === "zh" || locale === "ru" ? locale : "en";
}
