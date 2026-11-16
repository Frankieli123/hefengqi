import { describe, expect, it } from "vitest";
import { formatEditorialAuthor } from "./editorial-author";
import type { Locale } from "@/types/domain";

describe("editorial author localization", () => {
  const foreign: Locale[] = ["en", "ru", "fr", "de", "es", "ar"];
  for (const locale of foreign) {
    it(`localizes legacy and current research-team aliases in ${locale}`, () => {
      for (const raw of ["禾风起 (HEFENGQI) 基础设施研究院", "禾风起 (RICEWIND) 基础设施研究院", "HEFENGQI Infrastructure Research Institute"]) {
        const result = formatEditorialAuthor(raw, locale);
        expect(result).toContain("RICEWIND");
        expect(result).not.toMatch(/[\u3400-\u9fff]|HEFENGQI/u);
      }
    });
  }
  it("preserves Chinese attribution and independent named authors", () => {
    expect(formatEditorialAuthor("禾风起 (RICEWIND) 基础设施研究院", "zh")).toContain("禾风起");
    expect(formatEditorialAuthor("Jane Smith", "de")).toBe("Jane Smith");
  });
  it("does not invent attribution for unknown Chinese names", () => {
    expect(formatEditorialAuthor("独立作者", "en")).toBe("");
    expect(formatEditorialAuthor(undefined, "en")).toBe("");
  });
});
