import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { attributionDbCli, attributionColumns, attributionMigration, fixtureDatabase, inquirySql, legacyInquirySql, loadFixtureMigrations, outboxSql, runAttributionDbFixture, validateFixtureEnvironment } from "./fixtures/wp02-attribution-db";

const driver = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("postgres", () => ({ default: driver.create }));
const validUrl = "postgresql://wp02_fixture:synthetic@127.0.0.1:55432/ricewind_wp02_attribution";
const validEnvironment = { WP02_DISPOSABLE_DB: "1", DATABASE_URL: validUrl };

describe("WP02 disposable PostgreSQL gate (offline)", () => {
  it("accepts explicit loopback ports and absolute Unix socket directories", () => {
    expect(validateFixtureEnvironment(validEnvironment)).toMatchObject({ database: fixtureDatabase, user: "wp02_fixture", host: "127.0.0.1", port: 55432 });
    expect(validateFixtureEnvironment({ ...validEnvironment, DATABASE_URL: validUrl.replace("127.0.0.1", "localhost") })).toMatchObject({ host: "localhost" });
    expect(validateFixtureEnvironment({ ...validEnvironment, DATABASE_URL: validUrl.replace("127.0.0.1", "localhost") + "?host=%2Ftmp%2Fwp02-postgres" })).toMatchObject({ host: "/tmp/wp02-postgres" });
  });

  it.each([
    validUrl.replace(fixtureDatabase, "postgres"),
    validUrl.replace(fixtureDatabase, `${fixtureDatabase}/other`),
    validUrl.replace("wp02_fixture", "postgres"),
    validUrl.replace("127.0.0.1", "db.internal"),
    validUrl.replace("127.0.0.1", "[::1]"),
    validUrl.replace(":55432", ""),
    validUrl.replace("postgresql:", "https:"),
    validUrl + "?host=production.internal",
    validUrl + "?database=postgres",
    validUrl + "?sslmode=require",
    validUrl + "?options=-csearch_path=other",
    validUrl + "?host=/tmp/socket&host=/other/socket",
    validUrl + "#fragment",
    validUrl.replace("127.0.0.1", "localhost") + "?host=relative/socket",
    validUrl.replace("127.0.0.1", "localhost") + "?host=/tmp/../socket",
    " " + validUrl,
  ])("rejects non-fixture URL case %# before constructing a driver", async (url) => {
    driver.create.mockClear();
    await expect(runAttributionDbFixture({ ...validEnvironment, DATABASE_URL: url })).rejects.toThrow();
    expect(driver.create).not.toHaveBeenCalled();
  });

  it.each([{}, { WP02_DISPOSABLE_DB: "0" }, { PGHOST: "production.internal" }, { PGPASSWORD: "do-not-use" }, { PGDATABASE: fixtureDatabase }])("rejects missing opt-in or ambient PG overrides %#", async (override) => {
    const environment = Object.keys(override).length ? { ...validEnvironment, ...override } : { DATABASE_URL: validUrl };
    driver.create.mockClear();
    await expect(runAttributionDbFixture(environment)).rejects.toThrow();
    expect(driver.create).not.toHaveBeenCalled();
  });

  it("help and argument failures do not read migrations or invoke the runner", async () => {
    const run = vi.fn();
    expect((await attributionDbCli(["--help"], {}, run)).text).toContain("--run");
    for (const args of [[], ["--dry-run"], ["--run", "--help"], ["--run", "--url", validUrl]]) {
      expect(await attributionDbCli(args, validEnvironment, run)).toEqual({ code: 1, text: '{"status":"failed"}\n' });
    }
    expect(await attributionDbCli(["--run"], {}, run)).toEqual({ code: 1, text: '{"status":"failed"}\n' });
    expect(run).not.toHaveBeenCalled();
  });

  it("redacts exception details and only serializes the runner status counts", async () => {
    expect(await attributionDbCli(["--run"], validEnvironment, async () => { throw new Error(validUrl); })).toEqual({ code: 1, text: '{"status":"failed"}\n' });
    const result = { status: "passed", committedInquiries: 1, committedOutboxes: 2 };
    const run = vi.fn(async () => result as Awaited<ReturnType<typeof runAttributionDbFixture>>);
    expect(await attributionDbCli(["--run"], validEnvironment, run)).toEqual({ code: 0, text: `${JSON.stringify(result)}\n` });
  });

  it("closes the driver on identity and migration errors without dropping objects", async () => {
    for (const failure of ["identity", "migration"]) {
      const sql = Object.assign(vi.fn(async (strings: TemplateStringsArray) => {
        if (strings[0].includes("current_database")) return [{ database: failure === "identity" ? "postgres" : fixtureDatabase, username: "wp02_fixture" }];
        return [];
      }), { unsafe: vi.fn(async () => { throw new Error("synthetic migration error"); }), end: vi.fn(async () => {}) });
      driver.create.mockReturnValue(sql);
      await expect(runAttributionDbFixture(validEnvironment)).rejects.toThrow();
      expect(sql.end).toHaveBeenCalledWith({ timeout: 5 });
      expect(sql.unsafe).toHaveBeenCalledTimes(failure === "identity" ? 0 : 1);
      if (failure === "migration") expect(sql.unsafe).toHaveBeenCalledWith(loadFixtureMigrations()[0].sql);
    }
  });

  it("loads every complete historical migration in lexical order and isolates the additive target", () => {
    const migrations = loadFixtureMigrations();
    const directoryPath = resolve(dirname(fileURLToPath(import.meta.url)), "../prisma/migrations");
    const expected = readdirSync(directoryPath, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    expect(migrations.map((migration) => migration.name)).toEqual(expected);
    expect(migrations.at(-1)?.name).toBe(attributionMigration);
    for (const migration of migrations) expect(migration.sql).toBe(readFileSync(resolve(directoryPath, migration.name, "migration.sql"), "utf8"));
    for (const column of attributionColumns) expect(migrations.at(-1)?.sql).toContain(`ADD COLUMN "${column}" TEXT`);
    expect(migrations.at(-1)?.sql).not.toMatch(/\b(?:UPDATE|DELETE|DROP|DEFAULT|NOT\s+NULL|CREATE\s+INDEX)\b/i);
    expect(migrations.slice(0, -1).some((migration) => migration.sql.includes('CREATE UNIQUE INDEX "Inquiry_idempotencyKey_key"'))).toBe(true);
    expect(migrations.slice(0, -1).some((migration) => migration.sql.includes('CONSTRAINT "EmailOutbox_inquiryId_fkey"'))).toBe(true);
  });

  it("supplies schema-required synthetic Inquiry/outbox fields and omits old attribution", () => {
    for (const column of ["id", "referenceId", "idempotencyKey", "locale", "name", "email", "country", "requirements", "privacyConsentAt", "ipHash", "updatedAt"]) {
      expect(legacyInquirySql).toContain(`"${column}"`);
      expect(inquirySql).toContain(`"${column}"`);
    }
    for (const column of attributionColumns) {
      expect(legacyInquirySql).not.toContain(column);
      expect(inquirySql).toContain(column);
    }
    for (const column of ["id", "inquiryId", "toAddress", "templateKey", "locale", "payload"]) expect(outboxSql).toContain(`"${column}"`);
    expect(outboxSql).toContain("example.invalid");
  });
});
