import { describe, expect, it } from "vitest";
import { formatCity, formatCountry, formatDevice, formatEventName, formatRegion, formatSource } from "./ga4-display";

describe("GA4 Chinese presentation",()=>{
 it("uses concise source, device, event and empty labels",()=>{
  expect(formatSource("(direct) / (none)")).toBe("直接访问");
  expect(formatSource("vn.search.yahoo.com / referral")).toBe("vn.search.yahoo.com / 引荐");
  expect(formatSource("google / organic")).toBe("google / 自然搜索");
  expect(formatDevice("desktop")).toBe("桌面电脑");expect(formatDevice("mobile")).toBe("手机");expect(formatDevice("tablet")).toBe("平板");
  expect(formatEventName("page_view")).toBe("页面浏览");expect(formatCity("(not set)")).toBe("未设置");
 });
 it("uses country IDs and the free offline subdivision translations",()=>{
  expect(formatCountry("China","CN")).toBe("中国");expect(formatCountry("United States","US")).toBe("美国");
  expect(formatRegion("Guangdong Province","CN")).toBe("广东省");expect(formatRegion("Zhejiang Province","CN")).toBe("浙江省");
  expect(formatRegion("California","US")).toBe("加利福尼亚州");expect(formatRegion("Texas","US")).toBe("得克萨斯州");
  expect(formatRegion("Unverified Place","US")).toBe("Unverified Place");
 });
});
