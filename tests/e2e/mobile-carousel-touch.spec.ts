import { expect, test, type Locator, type Page } from "@playwright/test";

async function swipe(page: Page, surface: Locator, direction: "left" | "right") {
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();

  const session = await page.context().newCDPSession(page);
  const y = box!.y + box!.height / 2;
  const startX = box!.x + box!.width * (direction === "left" ? 0.78 : 0.22);
  const endX = box!.x + box!.width * (direction === "left" ? 0.22 : 0.78);

  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: startX, y }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: (startX + endX) / 2, y: y + 3 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: endX, y: y + 5 }],
  });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
}

test.describe("mobile carousel touch gestures", () => {
  test.skip(({ isMobile, browserName }) => !(isMobile && browserName === "chromium"), "Requires a mobile Chromium touch project");

  test("home Hero responds to native Chromium left and right swipes", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/zh");

    const hero = page.locator(".home-hero-slides");
    const activeSlide = page.locator('.home-hero-slide[data-active="true"]');
    await expect(hero).toBeVisible();
    await expect(activeSlide).toHaveAttribute("aria-label", /^1 \/ [2-9]\d*$/);

    await swipe(page, hero, "left");
    await expect(activeSlide).toHaveAttribute("aria-label", /^2 \/ [2-9]\d*$/);

    await swipe(page, hero, "right");
    await expect(activeSlide).toHaveAttribute("aria-label", /^1 \/ [2-9]\d*$/);
  });

  test("product main image responds to native Chromium left and right swipes", async ({ page }) => {
    await page.goto("/zh/products");
    await expect.poll(() => page.locator(".product-catalog-card .product-card-media").count()).toBeGreaterThan(0);
    const productUrls = await page.locator(".product-catalog-card .product-card-media").evaluateAll((links) =>
      Array.from(new Set(links.map((link) => (link as HTMLAnchorElement).href)))
    );

    let foundGallery = false;
    for (const productUrl of productUrls.slice(0, 12)) {
      await page.goto(productUrl);
      if (await page.getByLabel("Product images").getByRole("button").count() > 1) {
        foundGallery = true;
        break;
      }
    }
    expect(foundGallery, "Expected at least one published product with multiple images").toBe(true);

    const surface = page.getByTestId("product-gallery-main");
    const currentThumbnail = page.getByLabel("Product images").locator('button[aria-current="true"]');
    await expect(surface).toBeVisible();
    await expect(currentThumbnail).toHaveAttribute("aria-label", /^1 \/ \d+:/);

    await swipe(page, surface, "left");
    await expect(currentThumbnail).toHaveAttribute("aria-label", /^2 \/ \d+:/);
    await expect(page.getByTestId("magnifier-flyout")).toHaveCount(0);

    await swipe(page, surface, "right");
    await expect(currentThumbnail).toHaveAttribute("aria-label", /^1 \/ \d+:/);
    await expect(page.getByTestId("magnifier-flyout")).toHaveCount(0);
  });
});
