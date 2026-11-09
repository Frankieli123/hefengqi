import { strict as assert } from "node:assert";
import { resolve } from "node:path";
import type postgres from "postgres";

export const browserOrigin = "http://127.0.0.1:3108";
export const browserSecret = "wp02-browser-synthetic-hmac-not-a-real-secret";
export const browserDistDir = "next-wp02-attribution-e2e";
type Environment = Readonly<Record<string, string | undefined>>;

export function validateBrowserEnvironment(environment: Environment): Record<string, string> {
  assert.equal(environment.WP02_BROWSER_E2E, "1", "Explicit browser E2E opt-in required");
  assert.equal(environment.E2E_DISPOSABLE_DATABASE, "ricewind_e2e");
  assert.ok(!Object.keys(environment).some((key) => key.startsWith("PG")), "Ambient PG overrides forbidden");
  assert.ok(!environment.E2E_BASE_URL && !environment.NODE_OPTIONS, "External server/Node overrides forbidden");
  const source = environment.DATABASE_URL;
  assert.ok(source && source.trim() === source && !/[\s\\\u0000-\u001f]/.test(source));
  const url = new URL(source);
  assert.ok(url.protocol === "postgresql:" || url.protocol === "postgres:");
  assert.ok(url.hostname === "127.0.0.1" || url.hostname === "localhost");
  assert.equal(url.username, "ricewind_e2e");
  assert.equal(url.pathname, "/ricewind_e2e");
  assert.ok(url.password && url.port && Number(url.port) >= 1 && Number(url.port) <= 65535);
  assert.ok(![3000, 3008, 3108].includes(Number(url.port)));
  assert.equal(url.hash, "");
  assert.deepEqual([...url.searchParams], [["schema", "public"]]);
  const media = environment.MEDIA_ROOT;
  assert.ok(media && media.startsWith("/tmp/") && resolve(media) === media);
  return {
    WP02_BROWSER_E2E: "1", E2E_DISPOSABLE_DATABASE: "ricewind_e2e",
    DATABASE_URL: source, MEDIA_ROOT: media, DEMO_MODE: "false",
    SITE_URL: browserOrigin, BETTER_AUTH_URL: browserOrigin,
    IP_HASH_SECRET: browserSecret, SALES_EMAIL: "sales@example.invalid",
    NEXT_DIST_DIR: browserDistDir, NEXT_TELEMETRY_DISABLED: "1",
  };
}

export async function connectBrowserDatabase(environment: Environment, factory?: typeof postgres) {
  const config = validateBrowserEnvironment(environment);
  const create = factory ?? (await import("postgres")).default;
  const url = new URL(config.DATABASE_URL);
  const sql = create({
    host: url.hostname, port: Number(url.port), database: "ricewind_e2e", username: "ricewind_e2e",
    password: decodeURIComponent(url.password), max: 1, connect_timeout: 5,
    connection: { search_path: "public" },
  });
  try {
    const [identity] = await sql`SELECT current_database() AS database, current_user AS username`;
    assert.equal(identity.database, "ricewind_e2e");
    assert.equal(identity.username, "ricewind_e2e");
    return sql;
  } catch (error) {
    await sql.end({ timeout: 5 });
    throw error;
  }
}
