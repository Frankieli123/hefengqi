import { expect, test } from "@playwright/test";

// Mock all chat writes: this regression test must never create a live conversation.
for (const scenario of ["welcome", "long-history", "offline", "error"] as const) {
  test(`customer service keeps its frame steady during ${scenario}`, async ({ page }) => {
    let resolveRequest!: () => void;
    const responseGate = new Promise<void>((resolve) => { resolveRequest = resolve; });
    await page.route("**/u/api/send", (route) => route.fulfill({ json: { ok: true } }));
    await page.route("**/api/customer-service/conversations**", async (route) => {
      await responseGate;
      await route.fulfill({
        status: scenario === "error" ? 503 : 201,
        json: {
          id: "layout-test", visitorToken: "layout-test-token", status: "OPEN",
          enabled: true, operatorOnline: scenario !== "offline", whatsapp: "8617621197907",
          offlineMessage: "客服暂时离线，请留下消息。".repeat(5),
          messages: Array.from({ length: scenario === "long-history" ? 25 : 1 }, (_, index) => ({
            id: `message-${index}`, senderType: "ADMIN", body: "欢迎联系 RICEWIND，请问有什么可以帮您？",
            createdAt: "2026-10-06T08:00:00.000Z",
          })),
        },
      });
    });
    await page.goto("/zh", { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.removeItem("ricewind-customer-service:zh"));
    await page.locator(".customer-service-trigger").click();
    const thread = page.locator(".customer-service-thread");
    await expect(thread).toHaveAttribute("aria-busy", "true");
    const sample = () => page.evaluate(() => [".customer-service-panel", ".customer-service-form", ".customer-service-contact"].map((selector) => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return [rect.x, rect.y, rect.width, rect.height];
    }));
    const initial = await sample();
    // Observe the opening animation as well as the response-driven layout change.
    const frames = await page.evaluate(async () => {
      const values: number[][] = [];
      for (let index = 0; index < 15; index += 1) {
        await new Promise(requestAnimationFrame);
        const rect = document.querySelector(".customer-service-panel")!.getBoundingClientRect();
        values.push([rect.x, rect.y, rect.width, rect.height]);
      }
      return values;
    });
    for (const frame of frames) frame.forEach((value, index) => expect(Math.abs(value - initial[0][index])).toBeLessThan(0.5));
    resolveRequest();
    await expect(thread).toHaveAttribute("aria-busy", "false");
    if (scenario === "error") await expect(thread.getByRole("alert")).toBeVisible();
    else await expect(page.locator("#customer-service-message")).toBeEnabled();
    expect(await sample()).toEqual(initial);
    const viewport = page.viewportSize()!;
    expect(initial[0][0]).toBeGreaterThanOrEqual(0);
    expect(initial[0][1]).toBeGreaterThanOrEqual(0);
    expect(initial[0][0] + initial[0][2]).toBeLessThanOrEqual(viewport.width + 1);
    expect(initial[0][1] + initial[0][3]).toBeLessThanOrEqual(viewport.height + 1);
    await expect(page.locator(".customer-service-form")).toBeInViewport();
    await expect(page.locator(".customer-service-contact")).toBeInViewport();
    if (scenario === "long-history") {
      const scroll = await thread.evaluate((el) => ({ height: el.clientHeight, content: el.scrollHeight, top: el.scrollTop }));
      expect(scroll.content).toBeGreaterThan(scroll.height);
      expect(scroll.content - scroll.height - scroll.top).toBeLessThanOrEqual(1);
    }
    await page.locator(".customer-service-close").click();
    await expect(page.locator(".customer-service-panel")).toHaveCount(0);
    if (scenario !== "error") {
      await page.locator(".customer-service-trigger").click();
      expect(await sample()).toEqual(initial);
    }
  });
}
