// UA evidence only: never equate an unclassified request with a human.
export const ANALYTICS_BOT_RULE_VERSION = "explicit-ua-v1";
const AUTOMATION_UA = /baiduspider|bingbot|googlebot|sogou\s+web\s+spider|yisouspider|bytespider|petalbot|yandexbot|oai-searchbot|gptbot|claudebot|ahrefsbot|semrushbot|shapbot|hubspot\s+crawler|facebookexternalhit|twitterbot|linkedinbot|headlesschrome|(?:^|[\s;/()])(?:[a-z0-9_-]*(?:bot|spider|crawler))(?:[/;\s)]|$)/i;
export function isExplicitAnalyticsBot(userAgent: string | null | undefined): boolean {
  return typeof userAgent === "string" && AUTOMATION_UA.test(userAgent);
}
