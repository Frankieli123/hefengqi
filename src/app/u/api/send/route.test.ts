import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ create: vi.fn(), deleteMany: vi.fn(), after: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { analyticsPageView: { create: mocks.create, deleteMany: mocks.deleteMany } } }));
vi.mock("@/lib/inquiries", () => ({ hashIp: (value: string) => "fixture:" + value }));
vi.mock("next/server", async importOriginal => ({ ...await importOriginal<typeof import("next/server")>(), after: mocks.after }));
import { POST } from "./route";

const browser = "Mozilla/5.0 Chrome/103.0 Safari/537.36";
let scheduled: Array<() => Promise<unknown>>;

function request(userAgent: string | null, path = "/en", cookie?: string) {
  const headers = new Headers({ "content-type": "application/json", "eo-connecting-ip": "198.51.100.24", "eo-ipcountry": "CN" });
  if (userAgent !== null) headers.set("user-agent", userAgent);
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest("https://candidate.invalid/u/api/send", {
    method: "POST", headers, body: JSON.stringify({ type: "pageview", payload: { url: path } }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  scheduled = [];
  mocks.after.mockImplementation(callback => { scheduled.push(callback); });
  mocks.create.mockResolvedValue({});
  mocks.deleteMany.mockResolvedValue({ count: 0 });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ sessionId: "00000000-0000-4000-8000-000000000001" }), { status: 200 })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("analytics ingestion UA policy", () => {
  it.each(["Baiduspider-render/2.0", "ChatGPT-User/1.0", "anthropic-ai", "LinkPreview/2.0", "HeadlessChrome/131.0"])("never forwards, stores or sets cookies for %s", async userAgent => {
    const response = await POST(request(userAgent));
    expect(await response.json()).toEqual({ ok: true, excluded: "automation" });
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it.each(["zh", "en", "ru", "fr", "de", "es", "ar"])("still forwards and persists a candidate %s visit without country or browser-version exclusion", async locale => {
    const response = await POST(request(browser, "/" + locale));
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:3008/api/send", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "User-Agent": browser }) }));
    expect(response.cookies.get("_hfq_vid")?.value).toBeTruthy();
    expect(response.cookies.get("_hfq_sid")?.value).toBeTruthy();
    expect(scheduled).toHaveLength(1);
    await scheduled[0]();
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ path: "/" + locale, locale, userAgent: browser, country: "CN" }) });
  });

  it("keeps local persistence when legacy forwarding is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("legacy offline"); }));
    const response = await POST(request(browser));
    expect(response.status).toBe(502);
    expect(response.cookies.get("_hfq_vid")?.value).toBeTruthy();
    expect(scheduled).toHaveLength(1);
    await scheduled[0]();
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("retains missing UA as unknown and preserves stable visitor/session cookies across IP changes", async () => {
    const first = await POST(request(null));
    await scheduled[0]();
    expect(mocks.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ userAgent: null }) });
    const cookie = first.cookies.getAll().map(({ name, value }) => name + "=" + value).join("; ");
    const next = request(browser, "/fr", cookie);
    next.headers.set("eo-connecting-ip", "203.0.113.8");
    const second = await POST(next);
    await scheduled[1]();
    expect(second.cookies.get("_hfq_vid")?.value).toBe(first.cookies.get("_hfq_vid")?.value);
    const stored = mocks.create.mock.calls.map(([argument]) => argument.data);
    expect(stored[1].visitorHash).toBe(stored[0].visitorHash);
    expect(stored[1].sessionKey).toBe(stored[0].sessionKey);
    expect(stored[1].ipHash).not.toBe(stored[0].ipHash);
  });
});
