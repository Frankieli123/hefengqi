import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const localeLayout = readFileSync("src/app/[locale]/layout.tsx", "utf8");
const page = readFileSync("src/app/[locale]/page.tsx", "utf8");

describe("LCP resource budgets", () => {
  it("keeps the Chinese font stylesheet off non-Chinese pages", () => {
    expect(rootLayout).not.toContain("<NotoSansScStyles weights={[400]}");
    expect(localeLayout).toContain('locale === "zh" ? <NotoSansScStyles weights={[400, 500, 600]} /> : null');
  });

  it("uses responsive WebP candidates for homepage series cards", () => {
    expect(page).toContain('srcSet={item.image.cardSrcSet}');
    expect(readFileSync("src/lib/home-product-series.ts", "utf8")).toContain("cardImageSrcSet");
  });
});
