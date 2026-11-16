import { expect, test } from "@playwright/test";

test("media library and API reject anonymous access", async ({ page, request }) => {
  await page.goto("/admin/media");
  await expect(page).toHaveURL(/\/admin\/login/);

  const listResponse = await request.get("/api/admin/media");
  expect([401, 403]).toContain(listResponse.status());

  const uploadResponse = await request.post("/api/admin/media", { multipart: {} });
  expect([401, 403]).toContain(uploadResponse.status());
});
