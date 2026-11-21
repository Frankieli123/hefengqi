import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const localeLayout = readFileSync("src/app/[locale]/layout.tsx", "utf8");
const adminLayout = readFileSync("src/app/admin/layout.tsx", "utf8");

const fontPattern = /\/fonts\/noto-sans-sc-v1-5\.3\.0\/\$\{weight\}\.css/;

describe("scoped Noto Sans SC loading", () => {
  it("keeps the shared fallback weight and limits additional weights to Chinese and admin", () => {
    expect(rootLayout).toContain("<NotoSansScStyles weights={[400]} />");
    expect(localeLayout).toContain('locale === "zh" ? <NotoSansScStyles weights={[500, 600]} /> : null');
    expect(adminLayout).toContain("<NotoSansScStyles weights={[500, 600]} />");
    expect(rootLayout).not.toContain('import "@fontsource/noto-sans-sc/');
  });

  it("uses versioned static assets for repeatable font caching", () => {
    expect(readFileSync("src/components/noto-sans-sc-styles.tsx", "utf8")).toMatch(fontPattern);
    for (const weight of [400, 500, 600]) {
      const css = readFileSync(`public/fonts/noto-sans-sc-v1-5.3.0/${weight}.css`, "utf8");
      expect(css.match(/@font-face/g)).toHaveLength(101);
    }
  });
});
