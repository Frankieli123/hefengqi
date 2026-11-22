import { describe, expect, it } from "vitest";
import { auditedCategoryDescription, auditedCategoryPaths, hubTitles, emptyCasesCopy } from "@/content/t4-hubs";
import { locales } from "@/types/domain";
import { readFileSync } from "node:fs";

describe("T4 batch3 bounded hubs", () => {
  for (const locale of locales) {
    it(`${locale}: distinct category descriptions and hubs`, () => {
      const paths = ["fr", "de", "es", "ar"].includes(locale) ? [`power-${locale}/dc-power-systems-${locale}`, `power-${locale}/battery-${locale}`, `power-${locale}/indoor-power-systems-${locale}`, `optical-communications-${locale}/sfp-modules-${locale}`] : auditedCategoryPaths;
      const descriptions = paths.map(path => auditedCategoryDescription(locale, path));
      expect(new Set(descriptions).size).toBe(4);
      descriptions.forEach(description => expect(description!.length).toBeGreaterThan(35));
      expect(auditedCategoryDescription(locale, "other")).toBeUndefined();
      expect(new Set(hubTitles[locale]).size).toBe(3);
      expect(emptyCasesCopy[locale]).toBeTruthy();
    });
  }
  it("only empty case indexes are excluded and remain navigable", () => {
    const cases = readFileSync("src/app/[locale]/cases/page.tsx", "utf8");
    expect(cases).toContain("items.length === 0");
    expect(cases).toContain('href="/products"');
    expect(cases).toContain('href="/solutions"');
    expect(readFileSync("src/app/sitemap.ts", "utf8")).toContain('path !== "/cases" || cases.length > 0');
  });
  it("links all server validation errors to their controls", () => {
    const form = readFileSync("src/components/inquiry/inquiry-form.tsx", "utf8");
    for (const id of ["name", "email", "country", "interestedCategoryId", "requirements", "privacy"]) {
      expect(form).toContain(`aria-describedby="${id}-error"`);
      expect(form).toContain(`id="${id}-error"`);
    }
    expect(form).toContain('role="alert"');
    expect(readFileSync("src/components/support/support-filters.tsx", "utf8")).toContain("aria-label={field.label}");
  });
});
