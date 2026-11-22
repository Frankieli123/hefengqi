// @vitest-environment node
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { store } = vi.hoisted(() => ({ store: { user: [], session: [], account: [], verification: [], twoFactor: [] } as Record<string, Record<string, unknown>[]> }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/env", () => ({ env: {
  NODE_ENV: "production", SITE_URL: "https://admin-session.example.test",
  BETTER_AUTH_SECRET: "synthetic-test-only-session-secret-at-least-32-characters",
} }));
vi.mock("@better-auth/prisma-adapter", async () => {
  const { memoryAdapter } = await import("better-auth/adapters/memory");
  return { prismaAdapter: () => memoryAdapter(store) };
});
import { auth } from "@/lib/auth";

const origin = "https://admin-session.example.test";
const password = "Synthetic-Password-For-Tests-Only!";
const ttl = 30 * 24 * 60 * 60;
function cookieHeader(response: Response) {
  return response.headers.getSetCookie().filter((s) => !/max-age=0(?:;|$)/i.test(s)).map((s) => s.split(";")[0]).join("; ");
}
async function request(path: string, body?: Record<string, unknown>, cookie = "") {
  return auth.handler(new Request(`${origin}/api/auth${path}`, {
    method: body ? "POST" : "GET",
    headers: { origin, "content-type": "application/json", cookie },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
}
function totp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.toUpperCase().replace(/=+$/, "")].map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const hash = createHmac("sha1", key).update(counter).digest();
  return ((hash.readUInt32BE(hash[hash.length - 1] & 15) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}
async function signIn() { return request("/sign-in/email", { email: "admin@example.test", password, rememberMe: true }); }
async function enroll() {
  const ctx = await auth.$context;
  await ctx.internalAdapter.createUser({ id: "synthetic-admin", name: "Synthetic admin", email: "admin@example.test", emailVerified: true, role: "ADMIN", twoFactorEnabled: false }, { method: "email" });
  await ctx.internalAdapter.createAccount({ id: "synthetic-account", userId: "synthetic-admin", accountId: "synthetic-admin", providerId: "credential", password: await ctx.password.hash(password) });
  const login = await signIn(); expect(login.status).toBe(200);
  const initialCookie = cookieHeader(login);
  const enabled = await request("/two-factor/enable", { password }, initialCookie);
  expect(enabled.status).toBe(200);
  const { totpURI } = await enabled.json();
  const secret = new URL(totpURI).searchParams.get("secret")!;
  const verified = await request("/two-factor/verify-totp", { code: totp(secret), trustDevice: false }, initialCookie);
  expect(verified.status).toBe(200);
  await request("/sign-out", {}, cookieHeader(verified) || initialCookie);
  return secret;
}
async function loginTwoFactor() {
  const secret = await enroll();
  const challenge = await signIn();
  expect(await challenge.clone().json()).toMatchObject({ twoFactorRedirect: true });
  const completed = await request("/two-factor/verify-totp", { code: totp(secret), trustDevice: false }, cookieHeader(challenge));
  expect(completed.status).toBe(200);
  return { completed, cookie: cookieHeader(completed) };
}
beforeEach(() => { for (const key of Object.keys(store)) store[key].splice(0); });

describe("remembered admin browser sessions", () => {
  it("issues a secure persistent cookie and server session with the same fixed 30-day lifetime after password and TOTP", async () => {
    const { completed, cookie } = await loginTwoFactor();
    const header = completed.headers.getSetCookie().find((s) => s.startsWith("__Secure-better-auth.session_token="))!;
    expect(header).toContain(`Max-Age=${ttl}`);
    expect(header).toMatch(/HttpOnly/i); expect(header).toMatch(/SameSite=Lax/i); expect(header).toMatch(/; Secure/i);
    expect(header).not.toMatch(/; Domain=/i);
    expect(completed.headers.getSetCookie().join(";")).not.toContain("trust_device=");
    const current = await (await request("/get-session", undefined, cookie)).json();
    expect(new Date(current.session.expiresAt).getTime() - new Date(current.session.createdAt).getTime()).toBe(ttl * 1000);
  });
  it("does not slide the deadline forward when this browser returns on day 20", async () => {
    const { cookie } = await loginTwoFactor();
    const start = Date.now();
    const original = await (await request("/get-session", undefined, cookie)).json();
    const clock = vi.spyOn(Date, "now").mockReturnValue(start + 20 * 86_400_000);
    try {
      const response = await request("/get-session", undefined, cookie);
      const current = await response.json();
      expect(current.session.expiresAt).toBe(original.session.expiresAt);
      expect(response.headers.getSetCookie().some((s) => s.includes("session_token=") && !s.includes("Max-Age=0"))).toBe(false);
    } finally { clock.mockRestore(); }
  });

  it("rejects pre-2FA, wrong-code and fresh-browser requests without a durable authenticated session", async () => {
    await enroll();
    const challenge = await signIn();
    expect(await challenge.clone().json()).toMatchObject({ twoFactorRedirect: true });
    expect(store.session).toHaveLength(0);
    const cookie = cookieHeader(challenge);
    expect(await (await request("/get-session", undefined, cookie)).json()).toBeNull();
    const bad = await request("/two-factor/verify-totp", { code: "invalid", trustDevice: false }, cookie);
    expect(bad.status).toBeGreaterThanOrEqual(400);
    expect(store.session).toHaveLength(0);
    expect(await (await request("/get-session")).json()).toBeNull();
    const newBrowser = await signIn();
    expect(await newBrowser.json()).toMatchObject({ twoFactorRedirect: true });
    expect(store.session).toHaveLength(0);
  });

  it("rejects missing, malformed and tampered signed cookies", async () => {
    const { cookie } = await loginTwoFactor();
    const separator = cookie.indexOf("=");
    const tampered = cookie.slice(0, separator + 1) + "x" + cookie.slice(separator + 2);
    for (const value of ["", "__Secure-better-auth.session_token=invalid", tampered]) {
      expect(await (await request("/get-session", undefined, value)).json()).toBeNull();
    }
    expect((await (await request("/get-session", undefined, cookie)).json()).user.id).toBe("synthetic-admin");
  });

  it("checks server expiry even if the client replays an intact expired cookie", async () => {
    const { cookie } = await loginTwoFactor();
    store.session[0].expiresAt = new Date(Date.now() - 1);
    expect(await (await request("/get-session", undefined, cookie)).json()).toBeNull();
  });

  it("rejects the cookie at the 30-day deadline after allowing day 29", async () => {
    const { cookie } = await loginTwoFactor();
    const expiresAt = new Date(store.session[0].expiresAt as Date).getTime();
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(expiresAt - 86_400_000);
      expect((await (await request("/get-session", undefined, cookie)).json()).user.id).toBe("synthetic-admin");
      vi.setSystemTime(expiresAt + 1);
      expect(await (await request("/get-session", undefined, cookie)).json()).toBeNull();
    } finally { vi.useRealTimers(); }
  });

  it("sign-out deletes the database session and expires the cookie; replay fails", async () => {
    const { cookie } = await loginTwoFactor();
    const logout = await request("/sign-out", {}, cookie);
    expect(logout.status).toBe(200);
    expect(logout.headers.getSetCookie().some((s) => s.startsWith("__Secure-better-auth.session_token=") && s.includes("Max-Age=0"))).toBe(true);
    expect(store.session).toHaveLength(0);
    expect(await (await request("/get-session", undefined, cookie)).json()).toBeNull();
    expect(await (await signIn()).json()).toMatchObject({ twoFactorRedirect: true });
  });

  it("session revocation invalidates a previously legitimate cookie immediately", async () => {
    const { cookie } = await loginTwoFactor();
    const revoked = await request("/revoke-sessions", {}, cookie);
    expect(revoked.status).toBe(200);
    expect(store.session).toHaveLength(0);
    expect(await (await request("/get-session", undefined, cookie)).json()).toBeNull();
  });

  it("does not authorize a deleted account from a cached cookie", async () => {
    const { cookie } = await loginTwoFactor();
    store.user.splice(0);
    expect(await (await request("/get-session", undefined, cookie)).json()).toBeNull();
  });

});
