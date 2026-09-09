import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("three localized home pages have one h1 and the complete homepage structure", async ({ page }) => {
  for (const locale of ["zh", "en", "ru"]) {
    await page.goto(`/${locale}`);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(".home-hero")).toBeVisible();
    await expect(page.locator("main [data-reveal]")).toHaveCount(5);
    await expect(page.locator(".home-product-series-card")).toHaveCount(6);
    await expect(page.locator(".home-product-series-card img")).toHaveCount(6);
  }
});

test("homepage remains usable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await expect(page.locator(".home-hero")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator("main [data-reveal]").last().scrollIntoViewIfNeeded();
  await expect(page.locator("main [data-reveal]").last()).toBeVisible();
});

test("home navigation and editorial links work without client errors in all languages", async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  for (const locale of ["zh", "en", "ru"]) {
    await page.goto(`/${locale}/products`, { waitUntil: "networkidle" });
    async function navigation() {
      if (isMobile) await page.getByRole("button", { name: "Menu", exact: true }).click();
      return page.getByRole("navigation", { name: isMobile ? "Mobile navigation" : "Main navigation", exact: true });
    }
    const nav = await navigation();
    await expect(nav.locator("a").first()).toHaveAttribute("href", `/${locale}`);
    await expect(nav.locator("a").nth(1)).toHaveAttribute("href", `/${locale}/products`);
    await nav.locator("a").first().click();
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
    if (isMobile) await page.keyboard.press("Escape");

    for (const section of ["solutions", "industries", "cases", "news"]) {
      const menu = await navigation();
      await menu.locator(`a[href="/${locale}/${section}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/${section}$`));
      if (isMobile) await page.keyboard.press("Escape");
      await expect(page.locator("h1")).toHaveCount(1);
      await page.locator("main article a").first().click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/${section}/[^/]+$`));
      await expect(page.locator("h1")).toHaveCount(1);
    }
  }
  expect(errors).toEqual([]);
});

test("product catalog, detail, compare and inquiry are reachable", async ({ page }) => {
  await page.goto("/en/products");
  await expect(page.locator("h1")).toHaveText("Product center");
  await expect(page.getByRole("searchbox", { name: "Search name or model" })).toBeVisible();
  await expect(page.getByLabel("Brand")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText("Home");
  await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText("Products");
  await expect(page.locator("aside .product-category-link")).toHaveCount(20);
  await expect(page.locator("aside")).toContainText("DC power systems");
  await expect(page.locator("aside")).toContainText("Monitoring and management");
  await page.getByRole("searchbox", { name: "Search name or model" }).fill("HFQ-POWER-01");
  await page.locator(".product-filter-bar").getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=HFQ-POWER-01/);
  await expect(page.locator(".product-catalog-card")).toHaveCount(1);
  await page.getByRole("link", { name: /Telecom rectifier system HFQ-POWER-01/ }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("HFQ-POWER-01");
  await page.goto("/en/products/compare?ids=demo-1,demo-2");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Product comparison");
  await page.goto("/en/contact");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Request a quote");
});

test("site header retracts on downward scroll and returns on upward scroll", async ({ page }) => {
  await page.goto("/en/products");
  const header = page.locator(".site-header");
  await expect(header.getByRole("link", { name: "3180623@gmail.com" })).toHaveAttribute("href", "mailto:3180623@gmail.com");
  await expect(header.getByRole("link", { name: /Tel.*17621197907/ })).toHaveAttribute("href", "tel:+8617621197907");
  await expect(header).toContainText("Serving 50+ countries");
  await expect(page.locator("html")).toHaveAttribute("data-site-header", "visible");
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, 500); });
  await expect(header).toHaveAttribute("data-scroll-state", "hidden");
  await expect.poll(async () => (await header.boundingBox())?.y ?? 0).toBeLessThan(0);
  await page.evaluate(() => window.scrollTo(0, 420));
  await expect(header).toHaveAttribute("data-scroll-state", "scrolled");
  await expect.poll(async () => (await header.boundingBox())?.y ?? -1).toBe(0);
});

test("header search uses the desktop anchor and a mobile slide-in panel", async ({ page, isMobile }) => {
  await page.goto("/zh");
  const header = page.locator(".site-header");
  const brand = header.locator(".site-header-brand-slot");
  const navigation = header.locator(".site-header-navigation-slot");
  const trigger = header.locator(".site-header-search-trigger");
  const triggerBox = await trigger.boundingBox();

  if (!isMobile) {
    const navigationBox = await navigation.boundingBox();
    expect(navigationBox).not.toBeNull();
    expect(Math.abs((navigationBox?.x ?? 0) + (navigationBox?.width ?? 0) / 2 - 640)).toBeLessThan(2);
  }

  await trigger.click();
  const search = header.getByRole("search");
  const searchbox = search.getByRole("searchbox");
  await expect(searchbox).toBeVisible();
  await expect(searchbox).toBeFocused();
  await expect(brand).toBeVisible();

  if (isMobile) {
    await expect.poll(async () => (await search.boundingBox())?.x ?? 390).toBeLessThan(1);
    await expect(search.getByRole("navigation", { name: "热门链接" })).toBeVisible();
  } else {
    await expect.poll(async () => (await search.locator(".site-header-search-field").boundingBox())?.width ?? 0).toBeGreaterThan(490);
    const fieldBox = await search.locator(".site-header-search-field").boundingBox();
    expect(fieldBox?.width).toBeLessThanOrEqual(504);
    expect(Math.abs((fieldBox?.x ?? 0) + (fieldBox?.width ?? 0) - 24 - ((triggerBox?.x ?? 0) + (triggerBox?.width ?? 0) / 2))).toBeLessThan(6);
  }

  await page.keyboard.press("Escape");
  await expect(searchbox).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("key public pages have no serious accessibility violations", async ({ page }) => {
  for (const path of ["/en", "/en/products"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).exclude(".cf-turnstile").analyze();
    expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  }
});
