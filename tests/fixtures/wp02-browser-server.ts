import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { connectBrowserDatabase, validateBrowserEnvironment } from "./wp02-browser-environment";

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Usage: node --import tsx tests/fixtures/wp02-browser-server.ts\nTest-only guarded server on 127.0.0.1:3108; requires WP02_BROWSER_E2E=1, E2E_DISPOSABLE_DATABASE=ricewind_e2e, DATABASE_URL and /tmp MEDIA_ROOT. No worker, migrations or seed.");
    return;
  }
  assert.equal(process.argv.length, 2);
  const config = validateBrowserEnvironment(process.env);
  assert.ok(!readdirSync(process.cwd()).some((name) => name === ".env" || (name.startsWith(".env.") && name !== ".env.example")), "Use a credential-free isolated checkout; dotenv files forbidden");
  const sql = await connectBrowserDatabase(process.env);
  const owner = randomUUID();
  try {
    const oldViews = await sql`SELECT "id" FROM "AnalyticsPageView" WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '90 days' LIMIT 1`;
    assert.equal(oldViews.length, 0, "Refusing to trigger application retention pruning on existing historical rows");
    await sql`INSERT INTO "SiteSetting" ("key", "value", "updatedAt")
      VALUES ('customerService', ${sql.json({ email: "sales@example.invalid", webhookEnabled: false, wp02Owner: owner })}, CURRENT_TIMESTAMP)
      ON CONFLICT ("key") DO NOTHING`;
    const [setting] = await sql`SELECT "value" FROM "SiteSetting" WHERE "key" = 'customerService'`;
    assert.equal(setting.value.webhookEnabled, false, "Webhook must be explicitly disabled");
    assert.ok(typeof setting.value.email === "string" && setting.value.email.endsWith("@example.invalid"), "Only synthetic outbox recipients allowed");
    const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3108"], {
      stdio: "inherit",
      env: {
        PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: "/tmp", CI: process.env.CI, NODE_ENV: "development",
        ...config, NODE_OPTIONS: `--import=${resolve("tests/fixtures/wp02-network-isolation.mjs")}`,
      },
    });
    const stop = () => child.kill("SIGTERM");
    process.on("SIGTERM", stop);
    process.on("SIGINT", stop);
    try {
      await new Promise<void>((resolveExit, reject) => {
        child.once("error", reject);
        child.once("exit", (code, signal) => code === 0 || signal === "SIGTERM" ? resolveExit() : reject(new Error("Isolated Next server failed")));
      });
    } finally {
      process.off("SIGTERM", stop);
      process.off("SIGINT", stop);
    }
  } finally {
    await sql`DELETE FROM "SiteSetting" WHERE "key" = 'customerService' AND "value"->>'wp02Owner' = ${owner}`;
    await sql.end({ timeout: 5 });
  }
}

main().catch(() => { console.error("WP02 isolated server refused or failed (connection details redacted)"); process.exitCode = 1; });
