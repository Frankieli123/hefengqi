import { locales, type Locale } from "@/types/domain";

export function resolveLocale(cookieLocale: string | undefined, acceptLanguage: string | null, _country: string | null): Locale {
  if (locales.includes(cookieLocale as Locale)) return cookieLocale as Locale;
  // Browser preferences, not location, determine first-visit language.
  const preferences = (acceptLanguage ?? "").split(",").map((entry, index) => {
    const [tag, ...parameters] = entry.trim().toLowerCase().split(";");
    const quality = parameters.find(parameter => parameter.trim().startsWith("q="));
    const q = quality === undefined ? 1 : Number(quality.trim().slice(2));
    return { locale: tag.split("-")[0] as Locale, q, index };
  }).filter(({ locale, q }) => locales.includes(locale) && Number.isFinite(q) && q > 0 && q <= 1)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return preferences[0]?.locale ?? "en";
}
