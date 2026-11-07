import { expect, it } from "vitest";
import { seoDate } from "./seo-paths";
const now = () => new Date("2026-11-07T00:00:00Z");
it.each(["2026-02-30", "2025-02-29", "2026-04-31T12:00:00Z", "11/01/2026", "2026-01-01T24:00:00Z", "2099-01-01", new Date("2099-01-01")])("omits invalid or future modification date %s", (value) => {
  expect(seoDate(value, now)).toBeUndefined();
});
it("accepts leap day and timezone instants, with an injectable clock boundary", () => {
  expect(seoDate("2024-02-29", now)).toBe("2024-02-29T00:00:00.000Z");
  expect(seoDate("2026-11-07T01:00:00+01:00", now)).toBe(now().toISOString());
  expect(seoDate("2026-11-07T00:00:00.001Z", now)).toBeUndefined();
});
