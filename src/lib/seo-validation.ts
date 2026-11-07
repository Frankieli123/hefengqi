import { load } from "cheerio";
import { seoDate } from "./seo-paths";
import { locales } from "@/types/domain";

const publicLocale = (path: string) => locales.some((locale) => path === `/${locale}` || path.startsWith(`/${locale}/`));

export type SeoValidationOptions = {
  expectedHreflang?: Record<string, string>;
  staticAssetPaths?: readonly string[];
};

/** Syntax and explicit expectations only; no live reachability, publication or reciprocal checks. */
export function validateSeoHtml(html: string, expectedCanonical: string, options: SeoValidationOptions = {}): string[] {
  const $ = load(html);
  const errors: string[] = [];
  const canonical = $('link[rel="canonical"]');
  if (canonical.length !== 1 || canonical.attr("href") !== expectedCanonical) errors.push("Canonical mismatch");
  if ($("h1").length !== 1) errors.push("Expected one SSR h1");
  if (!$("title").text().trim()) errors.push("Missing title");
  const languages = new Set<string>();
  $('link[rel="alternate"][hreflang]').each((_, element) => {
    const lang = $(element).attr("hreflang")!;
    const href = $(element).attr("href") ?? "";
    if (languages.has(lang)) errors.push(`Duplicate hreflang: ${lang}`);
    languages.add(lang);
    if (options.expectedHreflang && options.expectedHreflang[lang] !== href) errors.push(`Hreflang mismatch: ${lang}`);
    try {
      const url = new URL(href);
      if (url.origin !== new URL(expectedCanonical).origin || (lang !== "x-default" && !url.pathname.startsWith(`/${lang}/`) && url.pathname !== `/${lang}`)) errors.push(`Invalid hreflang URL: ${href}`);
    } catch { errors.push(`Invalid hreflang URL: ${href}`); }
  });
  for (const lang of Object.keys(options.expectedHreflang ?? {})) {
    if (!languages.has(lang)) errors.push(`Missing hreflang: ${lang}`);
  }
  function inspectSchema(value: unknown) {
    if (Array.isArray(value)) { value.forEach(inspectSchema); return; }
    if (!value || typeof value !== "object") return;
    const schema = value as Record<string, unknown>;
    const types = Array.isArray(schema["@type"]) ? schema["@type"] : [schema["@type"]];
    if (types.includes("Product") && ["offers", "price", "availability", "shippingDetails", "hasMerchantReturnPolicy", "itemCondition"].some((field) => field in schema)) errors.push("Unverified RFQ product promise");
    if (types.includes("HowTo")) errors.push("Unexpected HowTo");
    Object.values(schema).forEach(inspectSchema);
  }
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const payload = JSON.parse($(element).text());
      inspectSchema(payload);
    } catch { errors.push("Invalid JSON-LD"); }
  });
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href")!;
    if (/^(javascript|data):/i.test(href.trim())) errors.push(`Unsafe link: ${href}`);
    try {
      const url = new URL(href, expectedCanonical);
      if (url.origin === new URL(expectedCanonical).origin && url.pathname !== "/" && !options.staticAssetPaths?.includes(url.pathname) && !publicLocale(url.pathname)) errors.push(`Invalid internal locale: ${href}`);
    } catch { errors.push(`Invalid link: ${href}`); }
  });
  return errors;
}

export function validateSitemapXml(xml: string, siteOrigin: string): string[] {
  const $ = load(xml, { xmlMode: true });
  const errors: string[] = [];
  const seen = new Set<string>();
  if ($("urlset").length !== 1) errors.push("Missing sitemap urlset");
  if ($("urlset > url > loc").length === 0) errors.push("Empty sitemap");
  $("url > loc").each((_, element) => {
    const value = $(element).text();
    if (seen.has(value)) errors.push(`Duplicate sitemap URL: ${value}`);
    seen.add(value);
    try {
      const url = new URL(value);
      if (url.origin !== siteOrigin || !publicLocale(url.pathname) || url.search || url.hash || /\/(search|compare|industries)(\/|$)/.test(url.pathname)) errors.push(`Noncanonical sitemap URL: ${value}`);
    } catch { errors.push(`Invalid sitemap URL: ${value}`); }
  });
  $("lastmod").each((_, element) => {
    const value = $(element).text();
    if (!seoDate(value)) errors.push(`Invalid sitemap date: ${value}`);
  });
  return errors;
}
