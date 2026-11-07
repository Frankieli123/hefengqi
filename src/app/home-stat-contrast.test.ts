import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

function luminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)!.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

it("keeps the exact homepage statistic suffix foreground readable on its dark card", () => {
  const source = readFileSync("src/app/[locale]/page.tsx", "utf8");
  const foreground = source.match(/text-\[(#[a-f\d]{6})\][^"\n]*">\s*\{stat\.suffix\}/i)?.[1];
  expect(foreground).toBeDefined();
  const ratio = (luminance(foreground!) + 0.05) / (luminance("#1a1a1a") + 0.05);
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});
