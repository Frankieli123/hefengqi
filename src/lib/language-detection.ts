import type { Locale } from "@/types/domain";

export function resolveLocale(cookieLocale: string | undefined, acceptLanguage: string | null, country: string | null): Locale {
  if (["zh", "en", "ru", "fr", "de", "es", "ar"].includes(cookieLocale ?? "")) return cookieLocale as Locale;
  const tags = acceptLanguage?.toLowerCase().split(",").map((part) => part.trim().split(";")[0]) ?? [];
  if (tags.some((tag) => tag.startsWith("zh"))) return "zh";
  if (tags.some((tag) => tag.startsWith("ru") || tag.startsWith("be"))) return "ru";
  if (tags.some((tag) => tag.startsWith("fr"))) return "fr";
  if (tags.some((tag) => tag.startsWith("de"))) return "de";
  if (tags.some((tag) => tag.startsWith("es"))) return "es";
  if (tags.some((tag) => tag.startsWith("ar"))) return "ar";
  if (tags.some((tag) => tag.startsWith("en"))) return "en";
  const code = country?.toUpperCase();
  if (code === "CN") return "zh";
  if (code === "RU" || code === "BY") return "ru";
  return "en";
}
