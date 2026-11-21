import { describe, expect, it } from "vitest";
import { languageLabel } from "./language-label";
import type { Locale } from "@/types/domain";
describe("language navigation labels", () => {
  it("preserves the native Chinese label on Chinese pages", () => {
    expect(languageLabel("zh", "zh", "中文")).toBe("中文");
  });
  it.each(["en", "ru", "fr", "de", "es", "ar"] as Locale[])("localizes the Chinese destination in %s", locale => {
    const label = languageLabel("zh", locale, "中文");
    expect(label).not.toMatch(/[()（）]/u);
    expect(label.length).toBeGreaterThan(0);
    expect(label).not.toMatch(/[\u3400-\u9fff]/u);
    expect(languageLabel("fr", locale, "Français")).toBe("Français");
  });
});
