import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  env: { AI_API_KEY: "test-ai-key-12345" as string | undefined, NODE_ENV: "test" },
  findUnique: vi.fn().mockResolvedValue(null),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: mocks.env,
  isDemoMode: false,
}));
vi.mock("@/lib/db", () => ({
  db: {
    siteSetting: {
      findUnique: mocks.findUnique,
    },
  },
}));
vi.mock("@/lib/admin-session", () => ({
  checkSecureAdmin: vi.fn().mockResolvedValue({ ok: false, code: "UNAUTHORIZED", status: 401 }),
}));

import {
  authenticateApi,
  createStoredAiApiKey,
  getAiApiKeyStatus,
  verifyAiApiKey,
} from "@/lib/api-auth";
import { checkSecureAdmin } from "@/lib/admin-session";

describe("API Authentication", () => {
  beforeEach(() => {
    mocks.env.AI_API_KEY = "test-ai-key-12345";
    mocks.findUnique.mockReset();
    mocks.findUnique.mockResolvedValue(null);
  });

  it("reports an environment-managed key without exposing it", async () => {
    const status = await getAiApiKeyStatus();
    expect(status).toEqual({ configured: true, source: "environment" });
  });

  it("stores database keys as a non-reversible digest", async () => {
    const stored = createStoredAiApiKey("database-ai-key-with-at-least-32-characters");
    expect(stored.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(stored)).not.toContain("database-ai-key");

    mocks.env.AI_API_KEY = undefined;
    mocks.findUnique.mockResolvedValueOnce({ value: stored });
    await expect(verifyAiApiKey("database-ai-key-with-at-least-32-characters")).resolves.toBe(true);
  });

  it("authenticates valid Authorization Bearer header", async () => {
    const req = new Request("http://localhost/api/admin/products", {
      headers: { authorization: "Bearer test-ai-key-12345" },
    });
    const result = await authenticateApi(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.actorType).toBe("AI");
      expect(result.actorId).toBe("ai-agent");
    }
  });

  it("authenticates valid x-api-key header", async () => {
    const req = new Request("http://localhost/api/admin/products", {
      headers: { "x-api-key": "test-ai-key-12345" },
    });
    const result = await authenticateApi(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.actorType).toBe("AI");
    }
  });

  it("rejects invalid API key", async () => {
    const req = new Request("http://localhost/api/admin/products", {
      headers: { authorization: "Bearer wrong-key" },
    });
    const result = await authenticateApi(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_API_KEY");
      expect(result.status).toBe(401);
    }
  });

  it("falls back to secure admin session if no API key header is provided", async () => {
    vi.mocked(checkSecureAdmin).mockResolvedValueOnce({
      ok: true,
      session: {
        session: { id: "sess_1", expiresAt: new Date(), token: "tok", createdAt: new Date(), updatedAt: new Date(), ipAddress: null, userAgent: null, userId: "user_1" },
        user: { id: "user_1", name: "Admin", email: "admin@example.com", role: "ADMIN", twoFactorEnabled: true },
      },
    });

    const req = new Request("http://localhost/api/admin/products");
    const result = await authenticateApi(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.actorType).toBe("USER");
      expect(result.actorId).toBe("user_1");
    }
  });

  it("rejects request when neither API key nor session is present", async () => {
    const req = new Request("http://localhost/api/admin/products");
    const result = await authenticateApi(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UNAUTHORIZED");
      expect(result.status).toBe(401);
    }
  });
});
