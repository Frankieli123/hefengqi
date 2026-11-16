import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const categoryKeys = ["power", "thermal-management", "optical-communications", "integrated-solutions", "wireless-base-stations", "monitoring-management"];

async function expectCenteredShelf(shelf: Locator) {
  await expect(shelf.locator("h2 svg")).toHaveCount(0);
  const layout = await shelf.evaluate((section) => {
    const heading = section.querySelector("h2")!;
    const underline = getComputedStyle(heading, "::after");
    const headingRect = heading.getBoundingClientRect();
    const trackRect = section.querySelector("ul")!.getBoundingClientRect();
    const linkRect = section.querySelector('a[href*="/products/category/"]')!.getBoundingClientRect();
    return {
      headingCenter: headingRect.x + headingRect.width / 2,
      productsCenter: trackRect.x + trackRect.width / 2,
      linkCenter: linkRect.x + linkRect.width / 2,
      productBottom: trackRect.bottom,
      linkTop: linkRect.top,
      underlineWidth: parseFloat(underline.width),
      underlineHeight: underline.height,
      underlineColor: underline.backgroundColor,
    };
  });
  expect(Math.abs(layout.headingCenter - layout.productsCenter)).toBeLessThan(1);
  expect(Math.abs(layout.linkCenter - layout.productsCenter)).toBeLessThan(1);
  expect(layout.underlineWidth).toBeGreaterThan(0);
  expect(layout.underlineWidth).toBeLessThanOrEqual(40);
  expect(layout.underlineHeight).toBe("2px");
  expect(layout.underlineColor).toBe("rgb(199, 0, 11)");
  expect(layout.linkTop).toBeGreaterThan(layout.productBottom);
}

test("homepage has six independent shelves with six desktop cards and keyboard controls", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/zh");
  const shelves = page.locator("section[data-home-product-category]");
  await expect(shelves).toHaveCount(6);
  await expect(shelves.locator("h2")).toHaveText(["电源管理", "热管理", "光通信与光网络", "数据中心基础设施", "无线基站与射频设备", "监控和管理"]);
  await expect(shelves.getByRole("tab")).toHaveCount(0);
  const shelf = page.getByRole("region", { name: "电源管理", exact: true });
  await shelf.scrollIntoViewIfNeeded();
  await expectCenteredShelf(shelf);
  const dimensions = await shelf.locator("ul").evaluate((element) => ({ width: element.clientWidth, card: element.children[0].getBoundingClientRect().width, gap: parseFloat(getComputedStyle(element).columnGap) }));
  expect(Math.round((dimensions.width + dimensions.gap) / (dimensions.card + dimensions.gap))).toBe(6);
  expect(await shelf.locator("li").count()).toBeLessThanOrEqual(12);
  const previous = shelf.getByRole("button", { name: "上一组产品" });
  const next = shelf.getByRole("button", { name: "下一组产品" });
  await expect(next).toHaveCSS("opacity", "0");
  await shelf.locator("ul").hover();
  await expect(next).toHaveCSS("opacity", "1");
  await expect(next).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(next).toHaveCSS("box-shadow", "none");
  const edgeLayout = await shelf.evaluate((section) => {
    const track = section.querySelector("ul")!.getBoundingClientRect();
    const [start, end] = [...section.querySelectorAll("button")].map((button) => button.getBoundingClientRect());
    return { track, start, end };
  });
  expect(edgeLayout.start.left).toBeGreaterThanOrEqual(edgeLayout.track.left);
  expect(edgeLayout.start.right).toBeLessThanOrEqual(edgeLayout.track.left + 60);
  expect(edgeLayout.end.left).toBeGreaterThanOrEqual(edgeLayout.track.right - 60);
  expect(edgeLayout.end.right).toBeLessThanOrEqual(edgeLayout.track.right);
  expect(edgeLayout.start.bottom).toBeLessThan(edgeLayout.track.bottom);
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(shelf.locator('[aria-live="polite"]')).toHaveText(/^2 \/ [2-9]\d*$/);
  await expect(shelf.locator("li")).toHaveCount(18);
  await previous.click();
  await expect(shelf.locator('[aria-live="polite"]')).toHaveText(/^1 \/ [2-9]\d*$/);
  const thermal = page.getByRole("region", { name: "热管理", exact: true });
  await expect(thermal.getByRole("link", { name: "浏览全部 · 热管理" })).toHaveAttribute("href", "/zh/products/category/thermal-management");
  await expect(thermal.locator('[aria-live="polite"]')).toHaveText("1 / 2");
  const typography = await shelf.locator("li").first().evaluate((element) => ({ model: element.querySelector("h3")?.textContent, title: element.querySelector("h3")?.getAttribute("title"), modelSize: getComputedStyle(element.querySelector("h3")!).fontSize, brandSize: getComputedStyle(element.querySelector(".product-card-meta")!).fontSize }));
  expect(typography.model).toBe(typography.title);
  expect(typography.modelSize).toBe("14px");
  expect(typography.brandSize).toBe("12px");
  const boundary = await page.locator(".home-solutions-section").evaluate((section) => ({
    background: getComputedStyle(section).backgroundColor,
    previousBackground: getComputedStyle(section.previousElementSibling!).backgroundColor,
    border: getComputedStyle(section).borderTopWidth,
  }));
  expect(boundary.background).toBe("rgb(255, 255, 255)");
  expect(boundary.previousBackground).toBe("rgb(247, 247, 247)");
  expect(boundary.border).toBe("0px");
  const violations = await new AxeBuilder({ page }).include("section[data-home-product-category]").analyze();
  expect(violations.violations).toEqual([]);
});

for (const [width, columns] of [[375, 2], [768, 3]] as const) {
  test(`responsive shelf at ${width}px has ${columns} cards with no page overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/zh");
    const shelf = page.getByRole("region", { name: "电源管理", exact: true });
    await shelf.scrollIntoViewIfNeeded();
    await expectCenteredShelf(shelf);
    const dimensions = await shelf.locator("ul").evaluate((element) => ({ width: element.clientWidth, card: element.children[0].getBoundingClientRect().width, gap: parseFloat(getComputedStyle(element).columnGap), overflow: document.documentElement.scrollWidth > window.innerWidth }));
    expect(Math.round((dimensions.width + dimensions.gap) / (dimensions.card + dimensions.gap))).toBe(columns);
    expect(dimensions.overflow).toBe(false);
    if (width === 375) await expect(shelf.getByRole("button", { name: "下一组产品" })).toBeHidden();
    await shelf.locator("ul").evaluate((element) => element.scrollTo({ left: element.clientWidth, behavior: "instant" }));
    await expect.poll(() => shelf.locator("ul").evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  });
}

for (const locale of ["zh", "en", "ru", "fr", "de", "es", "ar"]) {
  test(`localized category shelves in ${locale} work without hydration errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    for (const key of categoryKeys) {
      const shelf = page.locator(`section[data-home-product-category="${key}"]`);
      await expect(shelf).toBeVisible();
      await expectCenteredShelf(shelf);
      expect(await shelf.locator("li").count()).toBeLessThanOrEqual(12);
      await expect(shelf.locator('a[href*="/products/category/"]')).toHaveAttribute("href", new RegExp(`^/${locale}/products/category/`));
    }
    if (locale === "ar") {
      const shelf = page.locator('section[data-home-product-category="power"]');
      await shelf.locator("ul").hover();
      await shelf.getByRole("button").last().click();
      await expect.poll(() => shelf.locator("ul").evaluate((element) => element.scrollLeft)).toBeLessThan(0);
    }
    expect(await page.locator("h1").count()).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
  });
}
