import { notFound } from "next/navigation";
import { locales, type Locale } from "@/types/domain";

export function assertLocale(value: string): asserts value is Locale {
  if (!locales.includes(value as Locale)) notFound();
}

export function localeName(locale: Locale) {
  return { zh: "中文", en: "English", ru: "Русский" }[locale];
}
