import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), count: vi.fn(), category: vi.fn(), create: vi.fn(), outbox: vi.fn(), transaction: vi.fn(), settings: vi.fn(), webhook: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { IP_HASH_SECRET: "synthetic-wp02-secret-only", SALES_EMAIL: "sales@fixture.example" }, isDemoMode: false }));
vi.mock("@/lib/db", () => ({ db: { inquiry: { findUnique: mocks.findUnique, count: mocks.count }, category: { findFirst: mocks.category }, $transaction: mocks.transaction } }));
vi.mock("@/lib/customer-service", () => ({ getCustomerServiceSettings: mocks.settings, notifyInquiryWebhook: mocks.webhook }));
import { createInquiry, hashIp } from "../src/lib/inquiries";
import { createInquirySchema } from "../src/lib/inquiry-schema";
import { POST } from "../src/app/api/inquiries/route";

const payload = { locale: "en", interestedCategoryId: "category-1", name: "Fixture Buyer", email: "private@fixture.example", country: "DE", requirements: "Synthetic private requirement text", privacyConsent: true, turnstileToken: "fixture-token", idempotencyKey: "d0f7d253-176f-4bed-88bd-72fc5347c928" };
const persisted = { referenceId: "HFQ-FIXTURE", createdAt: new Date("2026-11-08T12:00:00Z") };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.findUnique.mockResolvedValue(null);
  mocks.count.mockResolvedValue(0);
  mocks.category.mockResolvedValue({ key: "fixture-category", translations: [{ name: "Fixture" }] });
  mocks.settings.mockResolvedValue({ email: "sales@fixture.example" });
  mocks.webhook.mockResolvedValue(undefined);
  mocks.create.mockImplementation(async ({ data }) => ({ ...data, id: "fixture-row", ...persisted }));
  mocks.outbox.mockResolvedValue({ count: 2 });
  mocks.transaction.mockImplementation(async (callback) => callback({ inquiry: { create: mocks.create }, emailOutbox: { createMany: mocks.outbox } }));
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("NETWORK_FORBIDDEN")));
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("WP02 inquiry persistence boundary (mock, not live DB)", () => {
  it("stores server cookie candidate on first create in the same outbox transaction, not client authority", async () => {
    const now = Date.now(); const sessionId = "fixture-anonymous-session";
    const response = await POST(new NextRequest("https://ricewind.com/api/inquiries", { method: "POST", headers: { "content-type": "application/json", cookie: `_hfq_sid=${sessionId}.${now.toString(36)}` }, body: JSON.stringify({ ...payload, submissionPath: "/en/contact?secret=private", referrer: "https://search.example/path?query=private", sessionKey: "forged", qualified: true, attributionSessionKey: "forged" }) }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ referenceId: persisted.referenceId, submittedAt: persisted.createdAt.toISOString() });
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ attributionSessionKey: hashIp(`analytics-session:${sessionId}`), attributionPath: "/en/contact", attributionReferrerDomain: "search.example" }) });
    expect(mocks.outbox).toHaveBeenCalledTimes(1);
    expect(mocks.webhook).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
    const sideChannels = JSON.stringify([vi.mocked(console.info).mock.calls, vi.mocked(console.error).mock.calls, mocks.outbox.mock.calls.map(([input]) => input.data.map((email: { payload: object }) => Object.keys(email.payload))), Object.keys(mocks.webhook.mock.calls[0][0])]);
    for (const secret of [sessionId, "forged", "private@fixture.example", "attributionSessionKey", "search.example"]) expect(sideChannels).not.toContain(secret);
  });
  it("ignores malformed optional attribution and keeps old clients nullable", async () => {
    const input = createInquirySchema.parse({ ...payload, submissionPath: { private: true }, referrer: "a".repeat(2049), sessionKey: "forged", qualified: true });
    expect(input).not.toHaveProperty("sessionKey");
    expect(input).not.toHaveProperty("qualified");
    await createInquiry(input, { ip: "unknown" });
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ attributionSessionKey: null, attributionPath: null, attributionReferrerDomain: null }) });
  });
  it("uses no body-supplied session/cookie authority and tolerates invalid optional source", async () => {
    const response = await POST(new NextRequest("https://ricewind.com/api/inquiries", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, _hfq_sid: `body-only-session-id.${Date.now().toString(36)}`, attribution: { attributionSessionKey: "forged" }, qualified: true, referrer: "http://127.0.0.1/private", submissionPath: "/en/%61dmin" }) }));
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ attributionSessionKey: null, attributionPath: null, attributionReferrerDomain: null }) });
  });
  it("does not overwrite or requeue on an idempotent retry", async () => {
    mocks.findUnique.mockResolvedValue(persisted);
    expect(await createInquiry(createInquirySchema.parse(payload), { ip: "unknown", attribution: { attributionSessionKey: "replacement", attributionPath: "/en", attributionReferrerDomain: "other.example" } })).toEqual({ referenceId: persisted.referenceId, submittedAt: persisted.createdAt.toISOString() });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.category).not.toHaveBeenCalled();
    expect(mocks.webhook).not.toHaveBeenCalled();
  });
  it("resolves concurrent unique-key retry without another outbox/webhook or attribution overwrite", async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(persisted);
    mocks.transaction.mockRejectedValue({ code: "P2002" });
    expect(await createInquiry(createInquirySchema.parse(payload), { ip: "unknown" })).toEqual({ referenceId: persisted.referenceId, submittedAt: persisted.createdAt.toISOString() });
    expect(mocks.findUnique).toHaveBeenCalledTimes(2);
    expect(mocks.webhook).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("preserves spam limiting and category validation", async () => {
    mocks.count.mockResolvedValue(5);
    await expect(createInquiry(createInquirySchema.parse(payload), { ip: "unknown" })).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(mocks.transaction).not.toHaveBeenCalled();
    mocks.category.mockResolvedValue(null);
    await expect(createInquiry(createInquirySchema.parse(payload), { ip: "unknown" })).rejects.toMatchObject({ code: "INVALID_CATEGORY" });
  });
  it("propagates transaction failure without webhook and never logs exception PII", async () => {
    mocks.outbox.mockRejectedValue(new Error("private@fixture.example transaction body"));
    const response = await POST(new NextRequest("https://ricewind.com/api/inquiries", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }));
    expect(response.status).toBe(500);
    expect(mocks.webhook).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("private@fixture.example");
  });
});
