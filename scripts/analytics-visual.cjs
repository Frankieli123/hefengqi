const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { chromium, expect } = require("@playwright/test");
const { root, artifactDirectory, git, sha256, offlineEnvironment, runStep } = require("./release-common.cjs");

async function main() {
  const [artifact, phase] = process.argv.slice(2);
  assert(artifact && phase === "after", "Usage: node scripts/analytics-visual.cjs ABSOLUTE_ARTIFACT after; this runner captures current source only, never a fabricated before");
  artifactDirectory(["--artifact-dir", artifact]);
  const directory = path.join(artifact, phase);
  fs.mkdirSync(directory);
  runStep(artifact, `${phase}-fixture-render`, path.join(root, "node_modules/.bin/vitest"), ["run", "src/app/admin/(dashboard)/(secure)/analytics/analytics-fixture.test.tsx", "--maxWorkers=2"], { ...offlineEnvironment(artifact), NODE_ENV: "test", ANALYTICS_FIXTURE_ARTIFACT_DIR: directory });
  const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
  const css = await postcss([require("@tailwindcss/postcss")({ base: root })]).process(fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8"), { from: path.join(root, "src/app/globals.css") });
  fs.writeFileSync(path.join(directory, "fixture.css"), css.css);
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname === "/favicon.ico") { response.writeHead(204); response.end(); return; }
    if (!["/admin/analytics", "/fixture.css"].includes(url.pathname)) { response.writeHead(404); response.end(); return; }
    const period = ["today", "7d", "30d", "all"].includes(url.searchParams.get("period")) ? url.searchParams.get("period") : "30d";
    const page = ["1", "2", "3"].includes(url.searchParams.get("page")) ? url.searchParams.get("page") : "1";
    const range = url.searchParams.get("startDate") === "2026-11-10" ? "changed" : "default";
    const filename = url.pathname === "/fixture.css" ? "fixture.css" : `${period}-${page}-${range}.html`;
    response.setHeader("Content-Type", filename.endsWith("css") ? "text/css" : "text/html; charset=utf-8");
    response.end(fs.readFileSync(path.join(directory, filename)));
  });
  let browser;
  const errors = [];
  const checks = [];
  const interactions = [];
  let passed = false;
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${origin}/admin/analytics?period=30d&startDate=2026-11-11&endDate=2026-11-17&page=2`);
      await page.screenshot({ path: path.join(directory, `${phase}-${width}.png`), fullPage: true });
      const dimensions = await page.locator("main").last().evaluate((main) => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, mainRight: main.getBoundingClientRect().right, mainScroll: main.scrollWidth, mainClient: main.clientWidth, bodyFont: parseFloat(getComputedStyle(main).fontSize) }));
      assert(dimensions.document <= dimensions.viewport && dimensions.mainRight <= dimensions.viewport + 1 && dimensions.mainScroll <= dimensions.mainClient + 1, `Whole-page overflow or clipping at ${width}`);
      assert(dimensions.bodyFont >= 14);
      const dateHeight = await page.getByLabel("开始日期").evaluate((element) => element.getBoundingClientRect().height);
      const queryHeight = await page.getByRole("button", { name: "查询", exact: true }).evaluate((element) => element.getBoundingClientRect().height);
      assert(dateHeight >= 44 && queryHeight >= 44);
      const scrolling = [];
      for (const label of ["访客轨迹表，可横向滚动", "询价明细表，可横向滚动"]) {
        const region = page.getByRole("region", { name: label, exact: true });
        const sizes = await region.evaluate((element) => ({
          client: element.clientWidth, scroll: element.scrollWidth, tabIndex: element.tabIndex,
          overflowX: getComputedStyle(element).overflowX,
          directTable: element.querySelector(":scope > table") !== null,
          nestedScrollContainers: [...element.querySelectorAll("*")].filter((child) => ["auto", "scroll"].includes(getComputedStyle(child).overflowX)).length,
        }));
        assert.equal(sizes.tabIndex, 0, `${label} must be in the Tab sequence`);
        assert.equal(sizes.overflowX, "auto");
        assert(sizes.directTable, `${label} must directly own its table`);
        assert.equal(sizes.nestedScrollContainers, 0, `${label} must not delegate scrolling to a nested element`);
        if (width === 390) assert(sizes.scroll > sizes.client, `${label} must actually overflow on mobile`);
        let keyboardScroll = null;
        if (sizes.scroll > sizes.client) {
          await region.scrollIntoViewIfNeeded();
          await page.getByRole("button", { name: "查询", exact: true }).focus();
          let tabReached = false;
          for (let step = 0; step < 100; step++) {
            await page.keyboard.press("Tab");
            tabReached = await region.evaluate((element) => document.activeElement === element);
            if (tabReached) break;
          }
          assert(tabReached, `${label} must receive focus through Tab, not programmatic focus`);
          await expect(region).toBeFocused();
          await region.evaluate((element) => { element.scrollLeft = 0; });
          await page.keyboard.press("ArrowRight");
          await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
          await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThanOrEqual(30);
          await page.keyboard.press("ArrowLeft");
          await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBe(0);
          await region.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
          const maximumScrollLeft = await region.evaluate((element) => element.scrollLeft);
          assert(maximumScrollLeft > 0, `${label} scrollLeft must act on the focused region`);
          await expect(region).toBeFocused();
          const finalCell = await region.locator("tbody tr").first().locator("td").last().boundingBox();
          const bounds = await region.boundingBox();
          assert(finalCell.x + finalCell.width <= bounds.x + bounds.width + 1, `${label} final field is clipped`);
          if (width === 390) await region.screenshot({ path: path.join(directory, `${phase}-390-${label.startsWith("访客") ? "visitors" : "inquiries"}-scrolled.png`) });
          await region.evaluate((element) => { element.scrollLeft = 0; });
          keyboardScroll = { tabReached, right: true, left: true, maximumScrollLeft, sameFocusedElement: true };
        }
        scrolling.push({ label, ...sizes, keyboardScroll });
      }
      checks.push({ width, ...dimensions, dateHeight, queryHeight, scrolling });
    }
    for (const [period, label] of [["today", "今日"], ["7d", "近 7 天"], ["30d", "近 30 天"], ["all", "保留记录（最多 90 天）"]]) {
      await page.getByRole("link", { name: label, exact: true }).click();
      const params = new URL(page.url()).searchParams;
      assert.equal(params.get("period"), period);
      assert.equal(params.get("startDate"), "2026-11-11");
      assert.equal(params.get("endDate"), "2026-11-17");
      assert.equal(params.get("page"), "1");
      assert.equal(await page.locator('nav[aria-label="访问周期"] [aria-current="page"]').innerText(), label);
      assert.equal(await page.getByText("上一页", { exact: true }).count(), 0);
      interactions.push({ action: "period", period, datesPreserved: true, pageReset: 1 });
    }
    await page.getByText("下一页", { exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("page"), "2");
    await page.getByText("下一页", { exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("page"), "3");
    assert.equal(await page.getByText("下一页", { exact: true }).count(), 0);
    await page.getByText("上一页", { exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("page"), "2");
    assert.equal(new URL(page.url()).searchParams.get("period"), "all");
    assert.equal(new URL(page.url()).searchParams.get("startDate"), "2026-11-11");
    assert.equal(new URL(page.url()).searchParams.get("endDate"), "2026-11-17");
    interactions.push({ action: "pagination", pages: [1, 2, 3, 2], periodAndDatesPreserved: true, boundaryLinksHidden: true });
    await page.getByLabel("开始日期").fill("2026-11-10");
    await page.getByLabel("结束日期").fill("2026-11-16");
    await page.getByRole("button", { name: "查询", exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("period"), "all");
    assert.equal(new URL(page.url()).searchParams.get("startDate"), "2026-11-10");
    assert.equal(new URL(page.url()).searchParams.get("endDate"), "2026-11-16");
    assert.equal(new URL(page.url()).searchParams.get("page"), null);
    await expect(page.getByText("第 1 / 3 页，每页 50 个 IP", { exact: true })).toBeVisible();
    interactions.push({ action: "date-submit", startDate: "2026-11-10", endDate: "2026-11-16", period: "all", pageReset: 1 });
    for (const label of ["趋势数据表", "已保存流量分层与爬虫历史快照", "数据来源与统计口径", "终端环境与品牌产品储备", "10 个页面 · 展开轨迹"]) {
      const summary = page.locator("summary").filter({ hasText: label });
      assert.equal(await summary.evaluate((element) => element.parentElement.open), false);
      await summary.click();
      assert.equal(await summary.evaluate((element) => element.parentElement.open), true);
      interactions.push({ action: "disclosure", label, initiallyClosed: true, opens: true });
    }
    assert.equal(await page.getByRole("img", { name: /每日候选访问趋势/ }).count(), 1);
    assert.equal(await page.getByRole("link", { name: /synthetic-only-demo-/ }).count(), 10);
    assert.equal(await page.getByText("广东 · 深圳", { exact: true }).count(), 1);
    assert.equal(await page.getByText("未知地区", { exact: true }).count(), 1);
    interactions.push({ action: "geography-and-paths", countryProvinceCityPreserved: true, unknownCountryPreserved: true, allTenPathsAccessible: true });
    assert.deepEqual(errors, []);
    passed = true;
  } finally {
    const sourceFiles = ["page.tsx", "analytics-sections.tsx", "analytics-trend.tsx", "analytics-fixture.test.tsx"].map((name) => `src/app/admin/(dashboard)/(secure)/analytics/${name}`);
    fs.writeFileSync(path.join(directory, "checks.json"), JSON.stringify({ phase, passed, synthetic: true, staticSSR: true, hydrationAcceptance: false, authenticationAcceptance: false, commit: git(root, "rev-parse", "HEAD"), sourceHashes: Object.fromEntries(sourceFiles.map((name) => [name, sha256(fs.readFileSync(path.join(root, name)))])), checks, interactions, errors }, null, 2));
    if (browser) await browser.close();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
