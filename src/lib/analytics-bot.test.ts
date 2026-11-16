import { describe, expect, it } from "vitest";
import { isExplicitAnalyticsBot } from "./analytics-bot";
describe("explicit analytics automation", () => {
  it.each(["Baiduspider-render/2.0", "Sogou web spider/4.0", "YisouSpider", "OAI-SearchBot/1.4", "bingbot/2.0", "HubSpot Crawler", "AhrefsBot/7.0", "HeadlessChrome/131.0", "ShapBot/0.1"])("excludes %s", (ua) => expect(isExplicitAnalyticsBot(ua)).toBe(true));
  it.each([null, undefined, "", "Mozilla/5.0 Chrome/103.0 Safari/537.36", "Mozilla/5.0 Chrome/151.0 Safari/537.36"])("does not exclude unknown/browser UA %s", (ua) => expect(isExplicitAnalyticsBot(ua)).toBe(false));
});
