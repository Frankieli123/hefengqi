import { afterEach, describe, expect, it, vi } from "vitest";
import { warmProductionRoutes } from "./startup-warmup";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("production route warmup", () => {
  it("retries until the local listener is bound, then initializes core routes", async () => {
    vi.useFakeTimers();
    vi.stubEnv("PORT", "43123");
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("connection refused"))
      .mockRejectedValueOnce(new Error("connection refused"))
      .mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const task = warmProductionRoutes();
    await vi.advanceTimersByTimeAsync(600);
    await task;
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      "http://127.0.0.1:43123/api/health/live",
      "http://127.0.0.1:43123/api/health/live",
      "http://127.0.0.1:43123/api/health/live",
      "http://127.0.0.1:43123/en",
      "http://127.0.0.1:43123/zh",
      "http://127.0.0.1:43123/en/products",
    ]);
    expect(fetchMock.mock.calls.filter(call => !String(call[0]).endsWith("/api/health/live")).every(call => call[1]?.method === "GET")).toBe(true);
  });
});
