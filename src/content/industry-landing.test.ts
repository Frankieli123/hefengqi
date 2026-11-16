import { describe, expect, it } from "vitest";
import { getBrandSolutions, getIndustryVisual, industryLandingCopy } from "@/content/industry-landing";
import { locales } from "@/types/domain";

describe("industry landing content", () => {
  it.each(locales)("provides five complete brand solutions for %s", (locale) => {
    const solutions = getBrandSolutions(locale);

    expect(solutions).toHaveLength(5);
    expect(new Set(solutions.map((solution) => solution.brand)).size).toBe(5);
    expect(solutions.every((solution) => solution.title && solution.summary && solution.capabilities.length === 3)).toBe(true);
    expect(solutions.every((solution) => solution.productHref.startsWith("/") && solution.sourceUrl.startsWith("https://"))).toBe(true);
    expect(industryLandingCopy[locale].solutionsTitle).toBeTruthy();
  });

  it("provides a visual for every managed industry", () => {
    for (const key of ["data-centers", "telecom-5g", "healthcare", "industrial-manufacturing"]) {
      const visual = getIndustryVisual(key, key);
      expect(visual.src).toMatch(/^\/(images|media)\//);
      expect(visual.width).toBeGreaterThan(0);
      expect(visual.height).toBeGreaterThan(0);
      expect(visual.alt).toBe(key);
    }
  });
});
