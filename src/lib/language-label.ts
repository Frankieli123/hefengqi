import type { Locale } from "@/types/domain";

const chineseLabel: Record<Locale, string> = {
  zh: "中文", en: "Chinese", ru: "Китайский",
  fr: "Chinois", de: "Chinesisch",
  es: "Chino", ar: "الصينية",
};

export function languageLabel(target: Locale, current: Locale, nativeLabel: string): string {
  return target === "zh" ? chineseLabel[current] : nativeLabel;
}
