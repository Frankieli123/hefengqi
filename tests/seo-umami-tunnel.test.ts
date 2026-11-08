// @vitest-environment node
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cli } from "../scripts/seo-data/cli";

const now = new Date("2026-11-08T12:00:00Z");
const image = "sha256:85909afc45bdcda1917394594a087421fdbb05610fded0fa9f6fb861abb2f367";
const consent = ["--umami-tunnel-local", "--umami-tunnel-port", "13008"];
const directories: string[] = [];
async function output() {
  const directory = await mkdtemp(join(tmpdir(), "umami-tunnel-"));
  directories.push(directory);
  return directory;
}
const args = (directory: string) => ["--source", "umami", "--start", "2026-11-01", "--end", "2026-11-01", "--events", "inquiry-click", "--probe-event", "inquiry-click", "--umami-version", "3.4.0", "--umami-image", image, "--output", directory];
const environment = (origin: string) => ({ UMAMI_API_URL: origin, UMAMI_WEBSITE_ID: "fixture-site", UMAMI_ACCESS_TOKEN: "fixture-secret" });
const fixture = () => vi.fn<typeof fetch>(async (url) => {
  const event = new URL(String(url)).searchParams.get("event")?.slice(3);
  return Response.json(event === "inquiry-click" ? [{ x: event, y: 7 }] : []);
});
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe("operator-attested local Umami tunnel, offline fixtures", () => {
  it.each([1024, 3008, 13008, 65535])("accepts only the explicitly attested port %s without network on dry-run", async (port) => {
    const fetch = fixture();
    const result = await cli([...args(await output()), "--umami-tunnel-local", "--umami-tunnel-port", String(port), "--dry-run"], environment(`http://127.0.0.1:${port}`), fetch, now);
    expect(result.code).toBe(0);
    const plan = JSON.parse(result.text);
    expect(plan).toMatchObject({ network: false, writes: false });
    expect(plan.requests).toHaveLength(3);
    expect(plan.requests.every((request: { url: string }) => new URL(request.url).origin === `http://127.0.0.1:${port}`)).toBe(true);
    expect(result.text).not.toContain("fixture-secret");
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    ["http://127.0.0.1:13008", []],
    ["http://127.0.0.1:13008", ["--umami-tunnel-local"]],
    ["http://127.0.0.1:13008", ["--umami-tunnel-port", "13008"]],
    ...["http://127.0.0.1:3008", "http://localhost:13008", "http://127.1:13008", "http://2130706433:13008", "http://0x7f000001:13008", "http://127.0.0.2:13008", "http://[::1]:13008", "http://0.0.0.0:13008", "http://analytics.example.org:13008", "http://169.254.169.254:13008", "https://analytics.example.org", "http://127.0.0.1:13008/", "http://127.0.0.1:13008/api", "http://127.0.0.1:13008?", "http://127.0.0.1:13008#", "http://user@127.0.0.1:13008", " http://127.0.0.1:13008", "http://127.0.0.1:013008"].map((origin) => [origin, consent]),
    ...["1023", "65536", "0", "-1", "13008.0", "1.3008e4", "013008", " 13008", "13008junk"].map((port) => ["http://127.0.0.1:13008", ["--umami-tunnel-local", "--umami-tunnel-port", port]]),
  ] as [string, string[]][])("rejects unsafe or unmatched origin/consent %s %j before fetch", async (origin, flags) => {
    const fetch = fixture();
    const result = await cli([...args(await output()), ...flags, "--dry-run"], environment(origin), fetch, now);
    expect(result.code).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(result.text).not.toContain("fixture-secret");
  });
  it("keeps standard HTTPS working without tunnel flags and rejects bare public HTTP", async () => {
    const directory = await output();
    const fetch = fixture();
    expect((await cli([...args(directory), "--dry-run"], environment("https://analytics.example.org"), fetch, now)).code).toBe(0);
    expect((await cli([...args(directory), "--dry-run"], environment("http://analytics.example.org"), fetch, now)).code).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects tunnel flags for GSC", async () => {
    const fetch = fixture();
    expect((await cli(["--source", "gsc", "--start", "2026-11-01", "--end", "2026-11-01", "--output", await output(), ...consent, "--dry-run"], { GSC_SITE_URL: "sc-domain:fixture.example" }, fetch, now)).code).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("retains scoped complete proof, reprobes every run, and never replaces last-good on failure", async () => {
    const directory = await output();
    const command = [...args(directory), ...consent];
    const fetch = fixture();
    const env = environment("http://127.0.0.1:13008");
    expect((await cli(command, env, fetch, now)).code).toBe(0);
    expect((await cli(command, env, fetch, now)).code).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(6);
    expect(String(fetch.mock.calls[1][0])).not.toBe(String(fetch.mock.calls[4][0]));
    for (const [url, init] of fetch.mock.calls) {
      expect(new URL(String(url)).origin).toBe(env.UMAMI_API_URL);
      expect(init).toMatchObject({ redirect: "error", headers: { Authorization: "Bearer fixture-secret" } });
    }
    const before = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(before.runs[0].umamiCapability).toMatchObject({ origin: env.UMAMI_API_URL, identity: { version: "3.4.0", image }, umamiTunnel: { local: true, port: 13008 } });
    const bad = vi.fn<typeof globalThis.fetch>(async () => Response.json([]));
    expect((await cli(command, env, bad, now)).code).toBe(2);
    const after = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(after.observations).toEqual(before.observations);
    expect(after.checkpoints).toEqual(before.checkpoints);
    expect(JSON.stringify(after)).not.toContain("fixture-secret");
    expect((await cli(command, { ...env, UMAMI_ACCESS_TOKEN: undefined }, fetch, now)).code).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(6);
    const changedPort = command.map((arg) => arg === "13008" ? "13009" : arg);
    expect((await cli(changedPort, environment("http://127.0.0.1:13009"), fetch, now)).code).toBe(1);
    const final = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(final.observations).toEqual(before.observations);
    expect(final.checkpoints).toEqual(before.checkpoints);
  });
  it.each(["redirect", "redirected", "port", "negative", "unknown_identity"])("fails closed on %s", async (kind) => {
    const fetch = fixture();
    if (kind === "redirect") fetch.mockImplementation(async () => new Response(null, { status: 302, headers: { Location: "https://other.example.org" } }));
    if (kind === "redirected" || kind === "port") fetch.mockImplementation(async () => {
      const response = Response.json([{ x: "inquiry-click", y: 7 }]);
      Object.defineProperty(response, kind === "port" ? "url" : "redirected", { value: kind === "port" ? "http://127.0.0.1:3008/api" : true });
      return response;
    });
    if (kind === "negative") fetch.mockImplementation(async (url) => Response.json([{ x: new URL(String(url)).searchParams.get("event")!.slice(3), y: 7 }]));
    const command = [...args(await output()), ...consent];
    if (kind === "unknown_identity") command[command.indexOf("3.4.0")] = "unknown";
    const result = await cli(command, environment("http://127.0.0.1:13008"), fetch, now);
    expect(result.code).toBe(2);
    expect(JSON.parse(result.text).status).toBe("partial");
    expect(result.text).not.toContain("fixture-secret");
  });
  it("makes the flag's security acknowledgement explicit in help", async () => {
    const result = await cli(["--help"], {});
    expect(result.text).toContain("already-authorized SSH local tunnel on the CLI process's own host");
    expect(result.text).toContain("operator attestation, not tunnel/session verification");
    expect(result.text).toContain("--umami-tunnel-port");
  });
});
