import { describe, expect, it } from "vitest";
import { formatBrandName, localizedBrandName } from "@/lib/brand";

describe("formatBrandName", () => {
  it("formats canonical brands with proper casing", () => {
    expect(formatBrandName("vertiv")).toBe("Vertiv");
    expect(formatBrandName("huawei")).toBe("Huawei");
    expect(formatBrandName("HUAWEI")).toBe("Huawei");
    expect(formatBrandName("delta")).toBe("Delta");
    expect(formatBrandName("eltek")).toBe("Eltek");
    expect(formatBrandName("zte")).toBe("ZTE");
    expect(formatBrandName("santak")).toBe("Santak");
    expect(formatBrandName("kstar")).toBe("Kstar");
  });

  it("capitalizes custom brand names using title case", () => {
    expect(formatBrandName("solar edge")).toBe("Solar Edge");
    expect(formatBrandName("schneider electric")).toBe("Schneider Electric");
  });

  it("handles empty and whitespace values gracefully", () => {
    expect(formatBrandName("")).toBe("");
    expect(formatBrandName("   ")).toBe("");
    expect(formatBrandName(null)).toBe("");
    expect(formatBrandName(undefined)).toBe("");
  });
});

describe("localizedBrandName", () => {
  it("uses the requested display name without changing the canonical name", () => {
    expect(localizedBrandName({ name: "Huawei", localizedNames: { zh: "华为", en: "Huawei" } }, "zh")).toBe("华为");
    expect(localizedBrandName({ name: "Huawei", localizedNames: { zh: "华为", en: "Huawei" } }, "en")).toBe("Huawei");
  });

  it("falls back to the canonical name for missing or invalid localized data", () => {
    expect(localizedBrandName({ name: "Vertiv", localizedNames: {} }, "fr")).toBe("Vertiv");
    expect(localizedBrandName({ name: "Vertiv", localizedNames: null }, "ar")).toBe("Vertiv");
  });
});
