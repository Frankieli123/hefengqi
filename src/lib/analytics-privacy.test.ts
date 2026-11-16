import { describe, expect, it } from "vitest";
import {
  isAnalyticsPageViewEvent,
  maskClientIp,
  normalizeClientIp,
  sanitizeAnalyticsPath,
  sanitizeCountry,
  sanitizeGeoName,
  sanitizeUmamiSessionId,
} from "@/lib/analytics-privacy";

const hosts = new Set(["ricewind.com", "www.ricewind.com"]);

describe("analytics collection helpers", () => {
  it("preserves a valid full address and generates a separate masked fallback", () => {
    expect(normalizeClientIp("198.51.100.24:443")).toBe("198.51.100.24");
    expect(normalizeClientIp("[2001:db8::1]:443")).toBe("2001:db8::1");
    expect(maskClientIp("198.51.100.24")).toBe("198.51.100.xxx");
  });

  it("keeps public paths while removing queries and rejecting private paths", () => {
    expect(sanitizeAnalyticsPath("/zh/products/example?token=secret", hosts)).toBe("/zh/products/example");
    expect(sanitizeAnalyticsPath("https://ricewind.com/en/news#details", hosts)).toBe("/en/news");
    expect(sanitizeAnalyticsPath("/admin/products", hosts)).toBeNull();
    expect(sanitizeAnalyticsPath("https://example.com/zh", hosts)).toBeNull();
  });

  it("sanitizes CDN geography and ignores named interaction events", () => {
    expect(sanitizeCountry("cn")).toBe("CN");
    expect(sanitizeGeoName("Zhejiang%20Province")).toBe("Zhejiang Province");
    expect(sanitizeUmamiSessionId("40B3DA99-BFB0-5465-9957-60E9D1212277")).toBe("40b3da99-bfb0-5465-9957-60e9d1212277");
    expect(sanitizeUmamiSessionId("not-a-session")).toBeNull();
    expect(isAnalyticsPageViewEvent("event", { url: "/zh" })).toBe(true);
    expect(isAnalyticsPageViewEvent("event", { url: "/zh", name: "contact-click" })).toBe(false);
  });
});
