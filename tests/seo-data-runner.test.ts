import { mkdtemp, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { runnerCli, runBounded } from "../scripts/seo-data/runner";

const now = new Date("2026-11-20T12:00:00Z");
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const row = { keys: ["2026-03-07"], clicks: 2, impressions: 10, ctr: 0.2, position: 3 };

describe("bounded manual runner", () => {
  it("help and dry-run do not inspect credentials, call network, or write", async () => {
    const root = await mkdtemp(join(tmpdir(), "wp02-runner-"));
    const result = await runnerCli(["--dry-run", "--source", "gsc", "--start", "2026-03-07", "--end", "2026-03-07", "--output", join(root, "evidence")], { GSC_ACCESS_TOKEN: "not-for-output" }, vi.fn(), now);
    expect(result.code).toBe(0);
    expect(result.text).not.toContain("not-for-output");
    await expect(stat(join(root, "evidence"))).rejects.toThrow();
  });

  it("requires execute before fetching and records fixture evidence", async () => {
    const root = await mkdtemp(join(tmpdir(), "wp02-runner-"));
    const fetcher = vi.fn(async () => response({ rows: [row] }));
    const result = await runBounded({ source: "gsc", start: "2026-03-07", end: "2026-03-07", output: join(root, "evidence"), execute: true, environment: { GSC_SITE_URL: "sc-domain:fixture.example", GSC_ACCESS_TOKEN: "secret" }, fetcher, now, sleep: async () => {} });
    expect(result.status).toBe("complete");
    expect(fetcher).toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("secret");
    const ledger = JSON.parse(await readFile(join(root, "evidence", "ledger.json"), "utf8"));
    expect(ledger.observations[0].evidenceKind).toBe("fixture");
  });

  it("keeps an existing last-good ledger when an execution is partial", async () => {
    const root = await mkdtemp(join(tmpdir(), "wp02-runner-"));
    const output = join(root, "evidence");
    const good = vi.fn(async () => response({ rows: [row] }));
    await runBounded({ source: "gsc", start: "2026-03-07", end: "2026-03-07", output, execute: true, environment: { GSC_SITE_URL: "sc-domain:fixture.example", GSC_ACCESS_TOKEN: "fixture-secret" }, fetcher: good, now, sleep: async () => {} });
    const before = JSON.parse(await readFile(join(output, "ledger.json"), "utf8"));
    const bad = vi.fn(async () => response({}, 503));
    const result = await runBounded({ source: "gsc", start: "2026-03-07", end: "2026-03-07", output, execute: true, environment: { GSC_SITE_URL: "sc-domain:fixture.example", GSC_ACCESS_TOKEN: "fixture-secret" }, fetcher: bad, now, sleep: async () => {} });
    expect(result.status).not.toBe("complete");
    const after = JSON.parse(await readFile(join(output, "ledger.json"), "utf8"));
    expect(after.observations).toEqual(before.observations);
    expect(after.checkpoints).toEqual(before.checkpoints);
    expect(bad).toHaveBeenCalledTimes(3);
  });
});
