export const ANALYTICS_BOT_RULE_VERSION = "shared-ua-v2";
export const CRAWLER_PATTERN = "bot|crawler|spider|slurp|headless|preview|facebookexternalhit|semrush|ahrefs|bytespider|petalbot|gptbot|chatgpt-user|claudebot|anthropic-ai|applebot|perplexity|yandex|baiduspider|google-inspectiontool|amazonbot|amzn-search|censysinspect";
export const UNKNOWN_UA_PATTERN = "^[ \t\n\r\f\v]*$";
const automationUserAgent = new RegExp(CRAWLER_PATTERN, "i");
const unknownUserAgent = new RegExp(UNKNOWN_UA_PATTERN);

export function classifyAnalyticsUserAgent(userAgent: string | null | undefined): "automation" | "unknown" | "candidate" {
  if (automationUserAgent.test(userAgent ?? "")) return "automation";
  return unknownUserAgent.test(userAgent ?? "") ? "unknown" : "candidate";
}

export function isExplicitAnalyticsBot(userAgent: string | null | undefined): boolean {
  return classifyAnalyticsUserAgent(userAgent) === "automation";
}

export const isCrawlerUserAgent = isExplicitAnalyticsBot;

/** Ordered UA identity hints, not DNS-validated identities. First match wins. */
export const CRAWLER_BRAND_DEFINITIONS = [
  { brand: "Baidu", pattern: "baiduspider" },
  { brand: "Google", pattern: "googlebot|google-inspectiontool" },
  { brand: "Bing", pattern: "bingbot" },
  { brand: "Yandex", pattern: "yandex" },
  { brand: "AI tools", pattern: "gptbot|chatgpt-user|oai-searchbot|anthropic-ai|claudebot|perplexity|bytespider" },
  { brand: "SEO tools", pattern: "ahrefs|semrush|mj12bot|dotbot" },
  { brand: "Other", pattern: CRAWLER_PATTERN },
] as const;
export type CrawlerBrand = (typeof CRAWLER_BRAND_DEFINITIONS)[number]["brand"];

export function classifyAnalyticsCrawlerBrand(userAgent: string | null | undefined): CrawlerBrand | null {
  if (!isExplicitAnalyticsBot(userAgent)) return null;
  return CRAWLER_BRAND_DEFINITIONS.find(({ pattern }) => new RegExp(pattern, "i").test(userAgent ?? ""))?.brand ?? "Other";
}
