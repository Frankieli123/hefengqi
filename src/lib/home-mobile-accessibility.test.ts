import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const home = () => readFileSync("src/app/[locale]/page.tsx", "utf8");
function luminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)!.map((part) => parseInt(part, 16) / 255).map((c) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
describe("homepage dark statistic suffix", () => {
  it("has at least 4.5:1 contrast even for the 20px mobile suffix", () => {
    const color = home().match(/text-xl sm:text-2xl lg:text-3xl font-semibold text-\[(#[a-f\d]{6})\]/i)![1];
    expect((luminance(color) + .05) / (luminance("#1a1a1a") + .05)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("homepage solution card accessible name", () => {
  it("does not override the title, summary and action with a shorter aria-label", () => {
    const link = home().match(/<Link[^>]*className="home-solution-tile-link"[^>]*>/)![0];
    expect(link).not.toContain("aria-label=");
  });
});

describe("mobile hero critical copy", () => {
  it("does not hide the mobile LCP copy behind an entrance animation", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/@media \(max-width: 767px\)\s*\{\s*\/\* Mobile LCP copy[\s\S]*?\.home-hero-slide\[data-active="true"\] \.home-hero-animate\s*\{\s*animation: none;\s*will-change: auto;/);
  });
});
