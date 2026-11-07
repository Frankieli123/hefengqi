import { describe, expect, it } from "vitest";
import { shouldRecordPublicSiteError } from "./public-site-errors";

const viewportDiagnostic = 'Viewport argument key "interactive-widget" not recognized and ignored.';

describe("public-site browser error classification", () => {
  it("ignores only the exact WebKit console diagnostic, including repeated emissions", () => {
    const diagnostics = Array.from({ length: 35 }, () => viewportDiagnostic);
    expect(diagnostics.filter((text) => shouldRecordPublicSiteError("webkit", "console", text))).toEqual([]);
  });

  it.each(["chromium", "firefox"])("retains the same diagnostic in %s", (browserName) => {
    expect(shouldRecordPublicSiteError(browserName, "console", viewportDiagnostic)).toBe(true);
  });

  it.each([
    viewportDiagnostic.slice(0, -1),
    viewportDiagnostic.replace("interactive-widget", "other-widget"),
    `${viewportDiagnostic} `,
    `Error: ${viewportDiagnostic}`,
    `${viewportDiagnostic}\nUncaught TypeError: navigation failed`,
    "Uncaught TypeError: navigation failed",
    "Failed to load resource: the server responded with a status of 500",
  ])("retains other WebKit console errors: %s", (text) => {
    expect(shouldRecordPublicSiteError("webkit", "console", text)).toBe(true);
  });

  it.each(["webkit", "chromium", "firefox"])("retains all pageerrors in %s, even diagnostic-shaped ones", (browserName) => {
    for (const text of [viewportDiagnostic, "Uncaught TypeError: navigation failed", ""]) {
      expect(shouldRecordPublicSiteError(browserName, "pageerror", text)).toBe(true);
    }
  });
});
