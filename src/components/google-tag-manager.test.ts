import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/google-tag-manager.tsx", "utf8");
const layout = readFileSync("src/app/[locale]/layout.tsx", "utf8");

describe("Google Tag Manager integration", () => {
  it("loads the approved public container with the standard bootstrap", () => {
    expect(source).toContain('const containerId = "GTM-MSTDF86G"');
    expect(source).toContain("https://www.googletagmanager.com/gtm.js?id=");
    expect(source).toContain('strategy="afterInteractive"');
    expect(source).toContain("window.dataLayer");
  });

  it("provides the noscript fallback and is scoped to the public locale layout", () => {
    expect(source).toContain("https://www.googletagmanager.com/ns.html?id=");
    expect(source).toContain("<noscript>");
    expect(layout).toContain("<GoogleTagManager />");
  });
});
