import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { settingsQuery, fetchMock } = vi.hoisted(() => ({ settingsQuery: vi.fn(), fetchMock: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { siteSetting: { findUnique: settingsQuery } } }));
vi.mock("@/lib/env", () => ({ env: { DATABASE_URL: "postgresql://configured-cms", NODE_ENV: "production", IP_HASH_SECRET: "test-only-secret" } }));
import { notifyInquiryWebhook } from "@/lib/customer-service";

const input = { referenceId: "TEST-001", name: "Test buyer", email: "buyer@example.com", country: "CN", interestedCategory: "Power", requirements: "Test requirement", locale: "en" as const, createdAt: new Date("2026-10-17T12:00:00Z") };
const secret = "test-webhook-secret-123";

describe("inquiry webhook compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
  });
  afterEach(() => vi.unstubAllGlobals());

  function settings(url: string, enabled = true) {
    settingsQuery.mockResolvedValue({ value: { webhookUrl: url, webhookEnabled: enabled, webhookSecret: secret } });
  }

  it("keeps the signed generic webhook contract", async () => {
    settings("https://hooks.example.com/inquiry");
    await notifyInquiryWebhook(input);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.example.com/inquiry");
    expect(JSON.parse(request.body)).toMatchObject({ event: "inquiry.created", inquiry: { referenceId: input.referenceId, createdAt: input.createdAt.toISOString() } });
    expect(request.headers["X-RICEWIND-Signature"]).toBe(`sha256=${createHmac("sha256", secret).update(request.body).digest("hex")}`);
  });

  it("preserves the Feishu inquiry card without sending real notifications", async () => {
    settings("https://open.feishu.cn/open-apis/bot/v2/hook/test-only");
    await notifyInquiryWebhook({ ...input, phoneOrWhatsapp: "123456", productId: "product-test" });
    const request = fetchMock.mock.calls[0][1];
    const body = JSON.parse(request.body);
    expect(body.msg_type).toBe("interactive");
    expect(body.card.elements[0].text.content).toContain("buyer@example.com / 123456");
    expect(body.card.elements[0].text.content).toContain("product-test");
    expect(request.headers).not.toHaveProperty("X-RICEWIND-Signature");
  });

  it("does not mistake a URL containing the Feishu name for Feishu", async () => {
    settings("https://hooks.example.com/open.feishu.cn");
    await notifyInquiryWebhook(input);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).event).toBe("inquiry.created");
  });

  it("does not send when notifications are disabled", async () => {
    settings("https://hooks.example.com/inquiry", false);
    await notifyInquiryWebhook(input);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
