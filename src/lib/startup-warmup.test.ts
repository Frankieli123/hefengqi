import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hook = readFileSync("src/instrumentation.ts", "utf8");

describe("production cold-start warmup", () => {
  it("registers only a bounded, local Node-runtime warmup", () => {
    expect(hook).toContain('process.env.NEXT_RUNTIME === "nodejs"');
    expect(hook).toContain('process.env.NODE_ENV === "production"');
    expect(hook).toContain('import("@/lib/startup-warmup")');
    expect(hook).toContain("void warmProductionRoutes(");
  });

  it("warms public route initialization without submitting forms or exposing the listener", () => {
    const warmup = readFileSync("src/lib/startup-warmup.ts", "utf8");
    expect(warmup).toContain('const startupWarmupPaths = ["/en", "/zh", "/en/products"]');
    expect(warmup).toContain('const startupWarmupHost = "127.0.0.1"');
    expect(warmup).toContain('method: "GET"');
    expect(warmup).toContain("AbortSignal.timeout(30_000)");
    expect(warmup).toContain("for (const path of startupWarmupPaths)");
    expect(warmup).not.toContain("/admin");
    expect(warmup).not.toContain('method: "POST"');
  });
});
