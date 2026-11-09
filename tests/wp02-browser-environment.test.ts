import { describe, expect, it, vi } from "vitest";

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { browserOrigin, browserSecret, connectBrowserDatabase, validateBrowserEnvironment } from "./fixtures/wp02-browser-environment";

const environment = {
  WP02_BROWSER_E2E: "1",
  E2E_DISPOSABLE_DATABASE: "ricewind_e2e",
  DATABASE_URL: "postgresql://ricewind_e2e:synthetic-only@127.0.0.1:15432/ricewind_e2e?schema=public",
  MEDIA_ROOT: "/tmp/ricewind-e2e-media",
};

describe("WP02 browser disposable boundary", () => {
  it("pins a separate origin and the same synthetic HMAC for app and assertions", () => {
    const config = validateBrowserEnvironment(environment);
    expect(config.SITE_URL).toBe(browserOrigin);
    expect(config.IP_HASH_SECRET).toBe(browserSecret);
    expect(config.DEMO_MODE).toBe("false");
    expect(config.RESEND_API_KEY).toBeUndefined();
    expect(config.TURNSTILE_SECRET_KEY).toBeUndefined();
  });

  it.each([
    { WP02_BROWSER_E2E: undefined }, { E2E_DISPOSABLE_DATABASE: "other" },
    { PGHOST: "production.internal" }, { PGPASSWORD: "secret" },
    { E2E_BASE_URL: "http://127.0.0.1:3000" }, { NODE_OPTIONS: "--import=other" },
    { MEDIA_ROOT: "/data/media" }, { MEDIA_ROOT: "/tmp/../data" },
    ...[
      "postgresql://ricewind_e2e:synthetic@db/ricewind_e2e?schema=public",
      "postgresql://postgres:synthetic@127.0.0.1:15432/ricewind_e2e?schema=public",
      "postgresql://ricewind_e2e:synthetic@127.0.0.1:15432/production?schema=public",
      environment.DATABASE_URL + "&host=production.internal",
      environment.DATABASE_URL + "&schema=private",
      environment.DATABASE_URL + "#fragment",
      environment.DATABASE_URL.replace("15432", "3008"),
      environment.DATABASE_URL.replace("15432", "0"),
      " " + environment.DATABASE_URL,
    ].map((DATABASE_URL) => ({ DATABASE_URL })),
  ])("rejects unsafe override %# before constructing a DB driver", async (override) => {
    const factory = vi.fn();
    await expect(connectBrowserDatabase({ ...environment, ...override }, factory as unknown as Parameters<typeof connectBrowserDatabase>[1])).rejects.toThrow();
    expect(factory).not.toHaveBeenCalled();
  });

  it("does not forward ambient secrets into the application process", () => {
    const config = validateBrowserEnvironment({ ...environment, RESEND_API_KEY: "do-not-forward", TURNSTILE_SECRET_KEY: "do-not-forward", UMAMI_API_URL: "https://do-not-contact.invalid" });
    expect(JSON.stringify(config)).not.toContain("do-not-forward");
    expect(JSON.stringify(config)).not.toContain("do-not-contact");
  });

  it.each(["ricewind_e2e", "wrong_database"])("verifies server identity and closes mismatched connections: %s", async (database) => {
    const sql = Object.assign(vi.fn(async () => [{ database, username: "wrong_user" }]), { end: vi.fn(async () => {}) });
    const factory = vi.fn(() => sql);
    await expect(connectBrowserDatabase(environment, factory as unknown as Parameters<typeof connectBrowserDatabase>[1])).rejects.toThrow();
    expect(sql.end).toHaveBeenCalledWith({ timeout: 5 });
    expect(sql).toHaveBeenCalledTimes(1);
  });

  it("isolates only the upstream dependency, never opens 3008, and rejects external fetch", async () => {
    const preload = pathToFileURL(resolve("tests/fixtures/wp02-network-isolation.mjs")).href;
    const transport = vi.fn(async () => new Response("synthetic transport unit test"));
    vi.stubGlobal("fetch", transport);
    vi.stubEnv("WP02_BROWSER_E2E", "1");
    try {
      await import(preload);
      await expect(fetch("http://127.0.0.1:3008/api/send")).rejects.toThrow("isolated upstream unavailable");
      await expect(fetch("https://analytics.example.invalid/api/send")).rejects.toThrow("blocked external fetch");
      await expect(fetch("http://127.0.0.1:3000/api/inquiries")).rejects.toThrow("blocked external fetch");
      expect(transport).not.toHaveBeenCalled();
      await fetch("http://127.0.0.1:3108/api/inquiries");
      await fetch("http://127.0.0.1:3108/u/api/send");
      expect(transport).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
});
