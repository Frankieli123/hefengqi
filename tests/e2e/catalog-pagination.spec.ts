import { expect, test } from "@playwright/test";

for (const width of [375, 768, 1440]) {
  test(`catalogue pagination keeps the document and loads static media at ${width}px`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/products?page=2", { waitUntil: "networkidle" });
    test.skip(await page.locator('.product-pagination-desktop a[href$="page=5"]').count() === 0, "Requires at least five pages of published products");

    const header = await page.locator(".site-header").elementHandle();
    const firstProduct = await page.locator(".product-card-title").first().innerText();
    const title = await page.title();
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    const requests: string[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (request.isNavigationRequest() || (url.pathname === "/_next/image" && url.searchParams.get("url")?.startsWith("/media/"))) requests.push(request.url());
    });

    // Delay RSC responses to verify that the old grid stays visible while waiting.
    await page.route(/\/en\/products\?.*_rsc=/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.continue();
    });

    for (const number of [3, 4, 5]) {
      const next = page.locator('.product-pagination a[aria-label="Go to next page"]:visible');
      await next.scrollIntoViewIfNeeded();
      const scrollY = await page.evaluate(() => window.scrollY);
      const previousProduct = await page.locator(".product-card-title").first().innerText();
      await next.click();
      await expect(page.locator(".product-catalog-grid")).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/en/products\\?page=${number}$`));
      await expect(page.locator(".product-card-title").first()).not.toHaveText(previousProduct);
      expect(await header!.evaluate((element) => element === document.querySelector(".site-header"))).toBe(true);
      expect(Math.abs(await page.evaluate(() => window.scrollY) - scrollY)).toBeLessThan(3);
      expect(await page.title()).toBe(title);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical!);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", description!);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      const images = page.locator(".product-card-image img");
      expect(await images.count()).toBeGreaterThan(0);
      for (const image of await images.all()) {
        await expect(image).toHaveAttribute("src", /^\/media\/.*\.webp$/);
        await expect(image).not.toHaveAttribute("srcset");
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
      }
    }

    await page.goBack();
    await expect(page).toHaveURL(/\/en\/products\?page=4$/);
    await expect(page.locator(".product-card-title").first()).not.toHaveText(firstProduct);
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("localized pagination retains category and search scope", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const locale of ["zh", "en", "ru", "fr", "de", "es", "ar"]) {
    await page.goto(`/${locale}/products`, { waitUntil: "networkidle" });
    const category = await page.locator('a.product-category-link[href*="/products/category/"]').first().getAttribute("href");
    expect(category).toBeTruthy();
    for (const path of [category!, `/${locale}/products?q=Huawei`]) {
      await page.goto(path, { waitUntil: "networkidle" });
      const next = page.locator('.product-pagination-desktop a[aria-label="Go to next page"]');
      await expect(next).toBeVisible();
      const expected = new URL(path, "http://localhost");
      expected.searchParams.set("page", "2");
      await expect(next).toHaveAttribute("href", `${expected.pathname}${expected.search}`);
      await next.click();
      await expect(page).toHaveURL((url) => url.pathname === expected.pathname && url.search === expected.search);
      await expect(page.locator(".product-card-title").first()).toBeVisible();
      await expect(page.locator("h1")).toHaveCount(1);
      if (expected.searchParams.has("q")) {
        await expect(page.locator(".product-filter-bar input")).toHaveValue("Huawei");
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      }
    }
  }
});
