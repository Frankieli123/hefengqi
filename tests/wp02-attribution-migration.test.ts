import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("keeps the unexecuted migration additive, nullable and without any historical backfill", () => {
  const sql = readFileSync("prisma/migrations/202611080001_inquiry_attribution/migration.sql", "utf8");
  for (const field of ["attributionSessionKey", "attributionPath", "attributionReferrerDomain"]) expect(sql).toContain(`ADD COLUMN "${field}" TEXT`);
  expect(sql).not.toMatch(/\b(?:UPDATE|DELETE|DROP|DEFAULT|NOT\s+NULL|CREATE\s+INDEX)\b/i);
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  expect(schema).toMatch(/attributionSessionKey\s+String\?/);
  expect(schema).toMatch(/attributionPath\s+String\?/);
  expect(schema).toMatch(/attributionReferrerDomain\s+String\?/);
});
