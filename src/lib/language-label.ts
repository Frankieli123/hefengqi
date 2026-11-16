import type { Locale } from "@/types/domain";

const chineseLabel: Record<Locale, string> = {
  zh: "中文（简体）", en: "Chinese (Simplified)", ru: "Китайский (упрощённый)",
  fr: "Chinois (simplifié)", de: "Chinesisch (vereinfacht)",
  es: "Chino (simplificado)", ar: "الصينية (المبسطة)",
};

export function languageLabel(target: Locale, current: Locale, nativeLabel: string): string {
  return target === "zh" ? chineseLabel[current] : nativeLabel;
}
