import { locales, type Locale } from "@/types/domain";

export const managedLocales = locales;
export type ManagedLocale = Locale;

export const managedLocaleMeta: Record<ManagedLocale, { name: string; nativeName: string; direction: "ltr" | "rtl" }> = {
  zh: { name: "中文", nativeName: "中文", direction: "ltr" },
  en: { name: "英文", nativeName: "English", direction: "ltr" },
  ru: { name: "俄文", nativeName: "Русский", direction: "ltr" },
  fr: { name: "法文", nativeName: "Français", direction: "ltr" },
  de: { name: "德文", nativeName: "Deutsch", direction: "ltr" },
  es: { name: "西班牙文", nativeName: "Español", direction: "ltr" },
  ar: { name: "阿拉伯文", nativeName: "العربية", direction: "rtl" },
};

export function managedLocaleLabel(locale: ManagedLocale) {
  const meta = managedLocaleMeta[locale];
  return `${meta.nativeName} · ${locale.toUpperCase()}`;
}
