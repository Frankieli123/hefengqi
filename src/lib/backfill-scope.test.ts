import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("bounded legacy media backfill", () => {
  it("supports an explicit asset allowlist and nullable variant maps", () => {
    const script = readFileSync("scripts/backfill-card-images.ts", "utf8");
    expect(script).toContain('arg.startsWith("--id=")');
    expect(script).toContain("id: { in: assetIds }");
    expect(script).toContain("row.variants === null || typeof row.variants !== \"object\"");
    expect(script).toContain("as Record<string, Prisma.InputJsonValue>");
  });
});
