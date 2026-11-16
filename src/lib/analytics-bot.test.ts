import { describe, expect, it } from "vitest";
import { classifyAnalyticsCrawlerBrand, CRAWLER_BRAND_DEFINITIONS, classifyAnalyticsUserAgent, CRAWLER_PATTERN, UNKNOWN_UA_PATTERN, isCrawlerUserAgent, isExplicitAnalyticsBot } from "./analytics-bot";

const automation = [
  "Baiduspider-render/2.0", "Sogou web spider/4.0", "YisouSpider", "OAI-SearchBot/1.4",
  "bingbot/2.0", "HubSpot Crawler", "AhrefsBot/7.0", "HeadlessChrome/131.0", "ShapBot/0.1",
  "ChatGPT-User/1.0", "anthropic-ai", "Perplexity/1.0", "Google-InspectionTool/1.0",
  "AMZN-Search/1.0", "CensysInspect/1.1", "Yahoo! Slurp", "LinkPreview/2.0", "FacebookExternalHit",
];
const candidates = [
  "Mozilla/5.0 Chrome/103.0 Safari/537.36", "Mozilla/5.0 Chrome/151.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 15) Chrome/140.0 Mobile Safari/537.36", "curl/8.0", "unidentified",
  "Google-İnspectionTool/1.0", "ſpider/1.0",
];
const missing = [null, undefined, "", " ", "\t\r\n\f\v"];

describe("shared analytics UA classification", () => {
  it.each(automation)("excludes recognized automation %s", userAgent => {
    expect(isExplicitAnalyticsBot(userAgent)).toBe(true);
    expect(isCrawlerUserAgent(userAgent)).toBe(true);
    expect(classifyAnalyticsUserAgent(userAgent)).toBe("automation");
  });
  it.each(candidates)("retains %s only as an unverified candidate", userAgent => {
    expect(isExplicitAnalyticsBot(userAgent)).toBe(false);
    expect(classifyAnalyticsUserAgent(userAgent)).toBe("candidate");
  });
  it.each(missing)("retains missing UA %s in the unknown category", userAgent => {
    expect(isExplicitAnalyticsBot(userAgent)).toBe(false);
    expect(classifyAnalyticsUserAgent(userAgent)).toBe("unknown");
  });
  it.each([...automation, ...candidates, ...missing])("uses the exact SQL-bound patterns for %s", userAgent => {
    expect(new RegExp(CRAWLER_PATTERN, "i").test(userAgent ?? "")).toBe(isExplicitAnalyticsBot(userAgent));
    expect(new RegExp(UNKNOWN_UA_PATTERN).test(userAgent ?? "")).toBe(classifyAnalyticsUserAgent(userAgent) === "unknown");
  });
});

describe("ordered crawler UA brand hints", () => {
  it.each([
    ["BAIDUSPIDER/2", "Baidu"], ["GoogleBot/2", "Google"], ["bingbot/2", "Bing"],
    ["YandexBot", "Yandex"], ["OAI-SearchBot", "AI tools"], ["AhrefsBot", "SEO tools"],
    ["Sogou spider", "Other"], ["headlesschrome", "Other"],
    ["bingbot googlebot", "Google"], ["GPTBot AhrefsBot", "AI tools"],
    ["Google-İnspectionTool", null], ["ſpider", null], ["Mozilla/5.0", null], [null, null], ["", null],
  ])("classifies %s as %s without changing automation membership", (ua, expected) => {
    expect(classifyAnalyticsCrawlerBrand(ua)).toBe(expected);
    expect(classifyAnalyticsCrawlerBrand(ua) !== null).toBe(isExplicitAnalyticsBot(ua));
  });
  it("keeps the shared order stable and the final fallback identical to the filter", () => {
    expect(CRAWLER_BRAND_DEFINITIONS.map(({ brand }) => brand)).toEqual(["Baidu", "Google", "Bing", "Yandex", "AI tools", "SEO tools", "Other"]);
    expect(CRAWLER_BRAND_DEFINITIONS.at(-1)?.pattern).toBe(CRAWLER_PATTERN);
  });
});
