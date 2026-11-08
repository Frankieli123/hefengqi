import { strict as assert } from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import type { Sql, TransactionSql } from "postgres";

export const fixtureDatabase = "ricewind_wp02_attribution";
export const attributionMigration = "202611080001_inquiry_attribution";
export const attributionColumns = ["attributionSessionKey", "attributionPath", "attributionReferrerDomain"];

export function validateFixtureEnvironment(environment: Readonly<Record<string, string | undefined>>) {
  assert.equal(environment.WP02_DISPOSABLE_DB, "1");
  assert.ok(!Object.keys(environment).some((key) => key.startsWith("PG")));
  const source = environment.DATABASE_URL;
  assert.ok(source && source.trim() === source && !/[\s\\\u0000-\u001f]/.test(source));
  const url = new URL(source);
  assert.ok(url.protocol === "postgresql:" || url.protocol === "postgres:");
  assert.equal(url.username, "wp02_fixture");
  assert.equal(url.pathname, `/${fixtureDatabase}`);
  assert.equal(url.hash, "");
  const parameters = [...url.searchParams];
  assert.ok(parameters.length === 0 || (parameters.length === 1 && parameters[0][0] === "host"));
  const socket = url.searchParams.get("host");
  if (socket !== null) {
    assert.equal(url.hostname, "localhost");
    assert.ok(/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/.test(socket));
  } else {
    assert.ok(url.hostname === "127.0.0.1" || url.hostname === "localhost");
  }
  assert.ok(url.port && Number(url.port) >= 1 && Number(url.port) <= 65535);
  return {
    host: socket ?? url.hostname,
    port: Number(url.port),
    database: fixtureDatabase,
    user: "wp02_fixture",
    password: decodeURIComponent(url.password),
  };
}

export function loadFixtureMigrations() {
  const rootPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../prisma/migrations");
  const names = readdirSync(rootPath, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert.equal(names.at(-1), attributionMigration);
  assert.equal(names[0], "202609070001_initial");
  return names.map((name) => ({ name, sql: readFileSync(resolve(rootPath, name, "migration.sql"), "utf8") }));
}

export const legacyInquirySql = `INSERT INTO "Inquiry"
  ("id", "referenceId", "idempotencyKey", "locale", "name", "email", "country", "requirements", "privacyConsentAt", "ipHash", "updatedAt")
  VALUES ('wp02-legacy', 'wp02-legacy-ref', 'wp02-legacy-key', 'en', 'Synthetic fixture', 'fixture@example.invalid', 'ZZ', 'Synthetic fixture only', CURRENT_TIMESTAMP, 'synthetic', CURRENT_TIMESTAMP)`;

export const inquirySql = `INSERT INTO "Inquiry"
  ("id", "referenceId", "idempotencyKey", "locale", "name", "email", "country", "requirements", "privacyConsentAt", "ipHash", "updatedAt",
   "attributionSessionKey", "attributionPath", "attributionReferrerDomain")
  VALUES ($1, $2, $3, 'en', 'Synthetic fixture', 'fixture@example.invalid', 'ZZ', 'Synthetic fixture only', CURRENT_TIMESTAMP, 'synthetic', CURRENT_TIMESTAMP, $4, $5, $6)`;

export const outboxSql = `INSERT INTO "EmailOutbox" ("id", "inquiryId", "toAddress", "templateKey", "locale", "payload")
  VALUES ($1, $2, 'fixture@example.invalid', $3, 'en', '{}'::jsonb)`;

const originalAttribution = ["a".repeat(64), "/en/contact", "search.example"];
const competingAttribution = ["b".repeat(64), "/en/products", "other.example"];

function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error ? error.code : undefined;
}

async function insertInquiry(transaction: TransactionSql, id: string, key: string, attribution: string[]) {
  await transaction.unsafe(inquirySql, [id, `${id}-ref`, key, ...attribution]);
}

async function insertOutboxes(transaction: TransactionSql, id: string, fail: boolean) {
  await transaction.unsafe(outboxSql, [`${id}-sales`, id, "sales-inquiry"]);
  await transaction.unsafe(outboxSql, [`${id}-receipt`, fail ? "wp02-nonexistent-inquiry" : id, "customer-receipt"]);
}

async function counts(sql: Sql, key: string) {
  const [row] = await sql`SELECT
    (SELECT count(*)::int FROM "Inquiry" WHERE "idempotencyKey" = ${key}) AS inquiries,
    (SELECT count(*)::int FROM "EmailOutbox" WHERE "inquiryId" IN
      (SELECT "id" FROM "Inquiry" WHERE "idempotencyKey" = ${key})) AS outboxes`;
  return { inquiries: row.inquiries, outboxes: row.outboxes };
}

async function readAttribution(sql: Sql, key: string) {
  const [row] = await sql`SELECT "attributionSessionKey", "attributionPath", "attributionReferrerDomain"
    FROM "Inquiry" WHERE "idempotencyKey" = ${key}`;
  assert.ok(row);
  return attributionColumns.map((column) => row[column]);
}

export async function runAttributionDbFixture(environment: Readonly<Record<string, string | undefined>>) {
  const config = validateFixtureEnvironment(environment);
  const migrations = loadFixtureMigrations();
  const { default: postgres } = await import("postgres");
  const sql = postgres({
    ...config, password: () => config.password, max: 2, ssl: false, prepare: false,
    connect_timeout: 5, idle_timeout: 5, fetch_types: false, debug: false,
    connection: { application_name: "wp02-disposable-fixture", search_path: "public", statement_timeout: 15000, lock_timeout: 10000 },
    onnotice: () => {},
  });
  try {
    const [identity] = await sql`SELECT current_database() AS database, current_user AS username`;
    assert.equal(identity.database, fixtureDatabase);
    assert.equal(identity.username, "wp02_fixture");
    const objects = await sql`SELECT 1 FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname NOT IN ('public', 'information_schema')
      UNION ALL SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace
      UNION ALL SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace
      UNION ALL SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace`;
    assert.equal(objects.length, 0);
    for (const migration of migrations.slice(0, -1)) await sql.unsafe(migration.sql);
    const before = await sql`SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Inquiry' AND column_name IN ${sql(attributionColumns)}`;
    assert.equal(before.length, 0);
    await sql.unsafe(legacyInquirySql);
    await sql.unsafe(migrations.at(-1)!.sql);
    assert.deepEqual(await readAttribution(sql, "wp02-legacy-key"), [null, null, null]);
    const columns = await sql`SELECT column_name, is_nullable, column_default, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Inquiry' AND column_name IN ${sql(attributionColumns)} ORDER BY column_name`;
    assert.deepEqual(columns.map((column) => column.column_name), [...attributionColumns].sort());
    for (const column of columns) {
      assert.equal(column.is_nullable, "YES");
      assert.equal(column.column_default, null);
      assert.equal(column.data_type, "text");
    }
    await sql.begin(async (transaction) => {
      await insertInquiry(transaction, "wp02-commit", "wp02-commit-key", originalAttribution);
      await insertOutboxes(transaction, "wp02-commit", false);
    });
    assert.deepEqual(await counts(sql, "wp02-commit-key"), { inquiries: 1, outboxes: 2 });
    assert.deepEqual(await readAttribution(sql, "wp02-commit-key"), originalAttribution);
    await assert.rejects(sql.begin(async (transaction) => {
      await insertInquiry(transaction, "wp02-rollback", "wp02-rollback-key", originalAttribution);
      await insertOutboxes(transaction, "wp02-rollback", true);
    }), (error) => errorCode(error) === "23503");
    assert.deepEqual(await counts(sql, "wp02-rollback-key"), { inquiries: 0, outboxes: 0 });
    const rollbackOutboxes = await sql`SELECT 1 FROM "EmailOutbox" WHERE "id" IN ('wp02-rollback-sales', 'wp02-rollback-receipt')`;
    assert.equal(rollbackOutboxes.length, 0);
    let arrivals = 0;
    let release!: () => void;
    let barrierTimeout!: ReturnType<typeof setTimeout>;
    const barrier = new Promise<void>((resolve, reject) => {
      release = resolve;
      barrierTimeout = setTimeout(() => reject(new Error("fixture barrier timeout")), 10000);
    });
    void barrier.catch(() => {});
    const attempts = [originalAttribution, competingAttribution].map((attribution, index) => sql.begin(async (transaction) => {
      arrivals += 1;
      if (arrivals === 2) release();
      await barrier;
      const id = `wp02-race-${index}`;
      await insertInquiry(transaction, id, "wp02-race-key", attribution);
      await insertOutboxes(transaction, id, false);
    }));
    const results = await Promise.allSettled(attempts).finally(() => clearTimeout(barrierTimeout));
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = results.filter((result) => result.status === "rejected");
    assert.equal(rejected.length, 1);
    assert.equal(errorCode(rejected[0].reason), "23505");
    assert.equal(rejected[0].reason.constraint_name, "Inquiry_idempotencyKey_key");
    const winner = results.findIndex((result) => result.status === "fulfilled");
    const winningAttribution = [originalAttribution, competingAttribution][winner];
    const retryAttribution = [competingAttribution, originalAttribution][winner];
    assert.deepEqual(await counts(sql, "wp02-race-key"), { inquiries: 1, outboxes: 2 });
    assert.deepEqual(await readAttribution(sql, "wp02-race-key"), winningAttribution);
    await assert.rejects(sql.begin((transaction) => insertInquiry(transaction, "wp02-retry", "wp02-race-key", retryAttribution)),
      (error) => errorCode(error) === "23505");
    assert.deepEqual(await readAttribution(sql, "wp02-race-key"), winningAttribution);
    assert.deepEqual(await counts(sql, "wp02-race-key"), { inquiries: 1, outboxes: 2 });
    const [total] = await sql`SELECT (SELECT count(*)::int FROM "Inquiry") AS inquiries, (SELECT count(*)::int FROM "EmailOutbox") AS outboxes`;
    assert.equal(total.inquiries, 3);
    assert.equal(total.outboxes, 4);
    return { status: "passed", migrations: migrations.length, legacyNulls: 3, nullableColumnsWithoutDefault: 3,
      committedInquiries: 1, committedOutboxes: 2, rollbackInquiries: 0, rollbackOutboxes: 0,
      concurrentInquiries: 1, concurrentOutboxes: 2, uniqueConflicts: 1, attributionPreserved: true,
      totalInquiries: 3, totalOutboxes: 4 };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function attributionDbCli(args: string[], environment: Readonly<Record<string, string | undefined>>, run = runAttributionDbFixture) {
  if (args.length === 1 && args[0] === "--help") return { code: 0, text: "宿主专用真实 PostgreSQL SQL 事务门禁（非业务 E2E）。先 --help，再 --run。仅 WP02_DISPOSABLE_DB=1；DATABASE_URL 数据库 ricewind_wp02_attribution、用户 wp02_fixture、显式端口、host 127.0.0.1/localhost；Unix socket 用 localhost 加 ?host=/absolute/socket/directory。拒绝其他 URL 参数及 PG* 环境变量。宿主提供全新空隔离库/新容器端口或 socket；Codex 不运行 --run、不启动容器。不 dotenv、不读生产文件、不发邮件/webhook，不 drop/清理数据库；失败也保留现场，重跑需宿主提供新空库。仅输出状态计数，不输出 URL/异常/PII。未覆盖 Prisma migrate deploy 重复执行、生产迁移、浏览器或调度。\n" };
  try {
    assert.deepEqual(args, ["--run"]);
    validateFixtureEnvironment(environment);
    return { code: 0, text: `${JSON.stringify(await run(environment))}\n` };
  } catch {
    return { code: 1, text: '{"status":"failed"}\n' };
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void attributionDbCli(process.argv.slice(2), process.env).then((result) => {
    process.stdout.write(result.text);
    process.exitCode = result.code;
  });
}
