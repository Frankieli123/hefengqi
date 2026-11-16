import { describe, expect, it } from "vitest";
import { resolveLocale } from "./language-detection";
import { routing } from "@/i18n/routing";
describe("first visit language negotiation", () => {
 it("defaults routing to English", () => expect(routing.defaultLocale).toBe("en"));
 it.each([["ru-RU","ru"],["ar-SA","ar"],["zh-CN","zh"],["zh-TW","zh"],["fr-FR","fr"],["de-DE","de"],["es-MX","es"],["en-US","en"],["ZH-hant-TW","zh"]])("recognizes supported language %s", (header,locale) => expect(resolveLocale(undefined,header,null)).toBe(locale));
 it.each(["zh","en","ru","fr","de","es","ar"])("preserves saved %s ahead of headers", locale => expect(resolveLocale(locale,"ar-SA,ru;q=0.8","CN")).toBe(locale));
 it.each(["ja-JP","ko-KR", "*", "", null])("falls back to English for %s without IP guessing", header => expect(resolveLocale(undefined,header,"CN")).toBe("en"));
 it("ignores invalid saved preferences", () => expect(resolveLocale("invalid","ar-SA",null)).toBe("ar"));
 it("selects highest supported quality", () => expect(resolveLocale(undefined,"zh-CN;q=0.2,ru-RU;q=0.9,ar;q=0.7",null)).toBe("ru"));
 it("excludes q=0 preferences", () => expect(resolveLocale(undefined,"ru-RU;q=0,ar-SA;q=0.8",null)).toBe("ar"));
 it("falls back when all preferences excluded", () => expect(resolveLocale(undefined,"ru;q=0,zh;q=0",null)).toBe("en"));
 it("retains header order on tied weights", () => expect(resolveLocale(undefined,"ar;q=0.8,ru;q=0.8",null)).toBe("ar"));
 it("skips unsupported higher weighted languages", () => expect(resolveLocale(undefined,"ja;q=1,fr-FR;q=0.5",null)).toBe("fr"));
 it("rejects malformed and out-of-range quality", () => expect(resolveLocale(undefined,"ru;q=bogus,zh;q=2,ar;q=-1,de;q=0.5",null)).toBe("de"));
});
