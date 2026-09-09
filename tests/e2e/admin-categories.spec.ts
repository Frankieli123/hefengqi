import "dotenv/config";
import { createHmac, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.use({
  baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
  ignoreHTTPSErrors: process.env.E2E_IGNORE_HTTPS_ERRORS === "true",
});

function totp(uri: string) {
  const secret = new URL(uri).searchParams.get("secret")!;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.replace(/=+$/, "").toUpperCase()].map((char) => alphabet.indexOf(char).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  return ((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}

test("category management requires authentication", async ({ page }) => {
  await page.goto("/admin/categories");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("administrator manages categories and public pages follow the CMS", async ({ page, baseURL }, testInfo) => {
  test.skip(!process.env.DATABASE_URL, "Requires the local CMS database");
  test.setTimeout(120000);
  const db = new PrismaClient();
  const prefix = `e2e-cat-${randomUUID().slice(0, 8)}`;
  const userId = randomUUID();
  const email = `${prefix}@example.invalid`;
  const password = `Test-${randomUUID()}`;
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && /eval\(\)|hydration/i.test(message.text())) browserErrors.push(message.text()); });

  async function createCategory(key: string, parentId?: string) {
    await page.goto(`/admin/categories/new${parentId ? `?parentId=${parentId}` : ""}`);
    await expect(page.getByRole("heading", { name: "新建产品分类", exact: true })).toBeVisible();
    await page.getByLabel("内部标识", { exact: true }).fill(key);
    for (const locale of ["zh", "en", "ru"]) {
      await page.getByLabel(`分类名称（${locale}）`, { exact: true }).fill(`${key}-${locale}`);
      await page.getByLabel(`网址名称（${locale}）`, { exact: true }).fill(key);
      await page.getByLabel(`分类说明（${locale}）`, { exact: true }).fill(`Test category description ${locale}`);
    }
    await page.getByRole("button", { name: "创建分类草稿", exact: true }).click();
    await expect(page.locator("[data-slot=alert]")).toContainText("分类已保存");
    const id = new URL(page.url()).pathname.split("/").at(-1)!;
    await page.getByRole("button", { name: "发布分类", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/categories\?updated=1/);
    return id;
  }

  async function setParent(target: Page, label: string) {
    await target.getByRole("combobox", { name: "上级分类", exact: true }).click();
    await target.getByRole("option", { name: label, exact: true }).click();
  }

  try {
    await db.user.create({ data: { id: userId, email, name: "Category E2E", emailVerified: true, role: "ADMIN", accounts: { create: { id: randomUUID(), accountId: userId, providerId: "credential", password: await hashPassword(password) } } } });
    const headers = { Origin: baseURL! };
    const login = await page.request.post("/api/auth/sign-in/email", { headers, data: { email, password } });
    expect(login.ok()).toBe(true);
    await page.goto("/admin/categories");
    await expect(page).toHaveURL(/\/admin\/setup-2fa/);
    const enabled = await page.request.post("/api/auth/two-factor/enable", { headers, data: { password, method: "totp" } });
    expect(enabled.ok()).toBe(true);
    const { totpURI } = await enabled.json();
    const verified = await page.request.post("/api/auth/two-factor/verify-totp", { headers, data: { code: totp(totpURI) } });
    expect(verified.ok()).toBe(true);

    const rootA = await createCategory(`${prefix}-a`);
    const rootB = await createCategory(`${prefix}-b`);
    const child = await createCategory(`${prefix}-child`, rootA);
    const leaf = await createCategory(`${prefix}-leaf`, child);

    await page.goto(`/admin/categories/${rootA}`);
    const axe = await new AxeBuilder({ page }).include("main").analyze();
    expect(axe.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("category-editor.png"), fullPage: true });
    // Moving this three-level branch beneath another root must be rejected atomically.
    await setParent(page, `${prefix}-b-zh（1级）`);
    await page.getByRole("button", { name: "保存分类", exact: true }).click();
    await expect(page.locator("[data-slot=alert]")).toContainText("不能超过三级");
    expect((await db.category.findUniqueOrThrow({ where: { id: rootA } })).parentId).toBeNull();

    await page.goto(`/admin/categories/${child}`);
    await setParent(page, `${prefix}-b-zh（1级）`);
    await page.getByLabel("分类名称（zh）", { exact: true }).fill(`${prefix}-已修改`);
    await page.getByLabel("排序", { exact: true }).fill("7");
    await page.getByRole("button", { name: "保存分类", exact: true }).click();
    await expect(page.locator("[data-slot=alert]")).toContainText("分类已保存");
    expect(await db.category.findUnique({ where: { id: child }, select: { parentId: true, sortOrder: true, status: true } })).toEqual({ parentId: rootB, sortOrder: 7, status: "PUBLISHED" });
    for (const locale of ["zh", "en", "ru"]) {
      await page.goto(`/${locale}/products/category/${prefix}-a/${prefix}-child/${prefix}-leaf`);
      await expect(page).toHaveURL(new RegExp(`/${locale}/products/category/${prefix}-b/${prefix}-child/${prefix}-leaf$`));
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(`${prefix}-leaf-${locale}`);
    }
    await page.goto(`/zh/products/category/${prefix}-b/${prefix}-child`);
    await expect(page.locator("h1")).toHaveText(`${prefix}-已修改`);

    // Duplicate URLs report an inline error without discarding the administrator's form.
    await page.goto(`/admin/categories/${child}`);
    await page.getByLabel("网址名称（zh）", { exact: true }).fill(`${prefix}-b`);
    await page.getByRole("button", { name: "保存分类", exact: true }).click();
    await expect(page.locator("[data-slot=alert]")).toContainText("已存在");
    await expect(page.getByLabel("网址名称（zh）", { exact: true })).toHaveValue(`${prefix}-b`);

    await page.goto(`/admin/categories?q=${prefix}`);
    const childRow = page.getByRole("row").filter({ hasText: `${prefix}-已修改` });
    await childRow.getByRole("button", { name: "停用", exact: true }).click();
    await expect(page.locator("[data-slot=alert]")).toContainText("请先下架");
    await page.getByRole("row").filter({ hasText: `${prefix}-leaf-zh` }).getByRole("button", { name: "停用", exact: true }).click();
    await expect(page.locator("[data-slot=alert]")).toContainText("状态已更新");
    // Streaming Next.js responses may already have sent HTTP 200 before notFound().
    const unavailable = await page.request.get(`/zh/products/category/${prefix}-b/${prefix}-child/${prefix}-leaf`);
    expect(await unavailable.text()).toContain('name="robots" content="noindex"');
    expect((await db.category.findUniqueOrThrow({ where: { id: leaf } })).status).toBe("DRAFT");
    await page.getByRole("row").filter({ hasText: `${prefix}-leaf-zh` }).getByRole("button", { name: "归档", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: `${prefix}-leaf-zh` })).toContainText("已归档");
    expect((await db.category.findUniqueOrThrow({ where: { id: leaf } })).status).toBe("ARCHIVED");
    expect(await db.auditLog.count({ where: { actorId: userId, entityType: "Category" } })).toBeGreaterThan(5);
    expect(browserErrors).toEqual([]);
  } finally {
    // Only remove this run's isolated fixtures; never touch existing content or accounts.
    const fixtures = await db.category.findMany({ where: { key: { startsWith: prefix } }, orderBy: { level: "desc" } });
    for (const fixture of fixtures) await db.category.delete({ where: { id: fixture.id } });
    await db.slugRedirect.deleteMany({ where: { fromPath: { startsWith: `/products/category/${prefix}` } } });
    await db.auditLog.deleteMany({ where: { actorId: userId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  }
});
