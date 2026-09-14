import { locales, type Locale } from "@/types/domain";

export function resolveLocale(cookieLocale: string | undefined, acceptLanguage: string | null, country: string | null): Locale {
  if (locales.includes(cookieLocale as Locale)) return cookieLocale as Locale;
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
  if (code === "FR") return "fr";
  if (code === "DE" || code === "AT") return "de";
  if (code === "ES") return "es";
  if (["SA", "AE", "EG", "QA", "KW", "BH", "OM", "JO"].includes(code ?? "")) return "ar";
  return "en";
}
