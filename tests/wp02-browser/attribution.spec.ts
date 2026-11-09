import { createHmac, randomUUID } from "node:crypto";
import { expect, test as base, type Page } from "@playwright/test";
import type { Sql } from "postgres";
import { browserOrigin, browserSecret, connectBrowserDatabase } from "../fixtures/wp02-browser-environment";

type Owned = { sql: Sql; email: string; userAgent: string };
const test = base.extend<{ owned: Owned }>({
  owned: async ({ context }, provide) => {
    const sql = await connectBrowserDatabase(process.env);
    const owner = randomUUID();
    const email = `wp02-${owner}@example.invalid`;
    const userAgent = `WP02-synthetic-browser/${owner}`;
    try {
      await context.setExtraHTTPHeaders({ "user-agent": userAgent, "x-real-ip": `wp02-synthetic-${owner}` });
      await context.route((url) => url.origin !== browserOrigin, (route) => route.abort("blockedbyclient"));
      await provide({ sql, email, userAgent });
    } finally {
      try {
        await sql.begin(async (transaction) => {
          await transaction`DELETE FROM "EmailOutbox" WHERE "inquiryId" IN (SELECT "id" FROM "Inquiry" WHERE "email" = ${email})`;
          await transaction`DELETE FROM "Inquiry" WHERE "email" = ${email}`;
          await transaction`DELETE FROM "AnalyticsPageView" WHERE "userAgent" = ${userAgent}`;
        });
      } finally {
        await sql.end({ timeout: 5 });
      }
    }
  },
});

const sessionKey = (id: string) => createHmac("sha256", browserSecret).update(`analytics-session:${id}`).digest("hex");
const cookieValue = (id: string, age = 0) => `${id}.${(Date.now() - age).toString(36)}`;

async function submitForm(page: Page, email: string) {
  await page.locator("#name").fill("Synthetic WP02 visitor");
  await page.locator("#email").fill(email);
  await page.locator("#country").fill("Synthetic region ZZ");
  await page.locator("#interestedCategoryId").click();
  await page.getByRole("option").first().click();
  await page.locator("#requirements").fill("Synthetic E2E requirements only; do not contact any person.");
  const privacyConsent = page.getByRole("checkbox", { name: "I agree to the processing of information needed for this inquiry under the privacy policy.", exact: true });
  await expect(privacyConsent).toBeVisible();
  await privacyConsent.check();
  await expect(privacyConsent).toBeChecked();
  const [response] = await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).pathname === "/api/inquiries" && response.request().method() === "POST"),
    page.getByRole("button", { name: "Send inquiry", exact: true }).click(),
  ]);
  expect(response.status()).toBe(201);
  const result = await response.json() as { referenceId: string; submittedAt: string };
  expect(Object.keys(result).sort()).toEqual(["referenceId", "submittedAt"]);
  expect(result.referenceId).toMatch(/^HFQ-/);
  const successAlert = page.getByRole("alert").filter({ hasText: result.referenceId });
  await expect(successAlert).toHaveCount(1);
  await expect(successAlert).toBeVisible();
  await expect(successAlert).toContainText(result.referenceId);
  return { result, payload: response.request().postDataJSON() as Record<string, unknown> };
}

async function persisted(owned: Owned, attribution: { attributionSessionKey: string | null; attributionPath: string | null; attributionReferrerDomain: string | null }) {
  const rows = await owned.sql`SELECT * FROM "Inquiry" WHERE "email" = ${owned.email}`;
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject(attribution);
  const outboxes = await owned.sql`SELECT * FROM "EmailOutbox" WHERE "inquiryId" = ${rows[0].id}`;
  expect(outboxes).toHaveLength(2);
  expect(outboxes.map((row) => row.templateKey).sort()).toEqual(["customer-receipt", "sales-inquiry"]);
  for (const outbox of outboxes) {
    expect(outbox).toMatchObject({ status: "PENDING", attempts: 0, sentAt: null, lockedBy: null });
    expect(outbox.toAddress).toMatch(/@example\.invalid$/);
    for (const field of ["attributionSessionKey", "attributionPath", "attributionReferrerDomain", "qualified"]) {
      expect(outbox.payload).not.toHaveProperty(field);
    }
  }
  return rows[0];
}

async function mutateClientPayload(page: Page, overrides: Record<string, unknown>, remove: string[] = []) {
  await page.evaluate(({ overrides, remove }) => {
    const realFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (input === "/api/inquiries" && typeof init?.body === "string") {
        const body = { ...JSON.parse(init.body), ...overrides };
        for (const field of remove) delete body[field];
        return realFetch(input, { ...init, body: JSON.stringify(body) });
      }
      return realFetch(input, init);
    };
  }, { overrides, remove });
}

test("real /u 502 establishes HttpOnly cookies, SQL pageview joins the real UI inquiry", async ({ page, context, owned }) => {
  await page.goto("/en/contact?private=synthetic", { referer: "https://Search.Example/private?synthetic=only" });
  expect((await context.cookies()).find((cookie) => cookie.name === "_hfq_sid")).toBeUndefined();
  const status = await page.evaluate(async () => {
    const response = await fetch("/u/api/send", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "pageview", payload: { url: "/en/contact?private=synthetic#fragment", referrer: "https://Search.Example/private?synthetic=only" } }),
    });
    return { status: response.status, body: await response.json() };
  });
  expect(status).toEqual({ status: 502, body: { ok: false } });
  const cookies = await context.cookies();
  const session = cookies.find((cookie) => cookie.name === "_hfq_sid");
  expect(session).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
  expect(cookies.find((cookie) => cookie.name === "_hfq_vid")).toMatchObject({ httpOnly: true });
  expect(await page.evaluate(() => document.cookie)).not.toContain("_hfq_sid");
  const key = sessionKey(session!.value.split(".")[0]);
  await expect.poll(async () => {
    const rows = await owned.sql`SELECT "sessionKey", "path", "locale", "referrer", "umamiSessionId" FROM "AnalyticsPageView"
      WHERE "sessionKey" = ${key} AND "userAgent" = ${owned.userAgent}`;
    return [...rows];
  }).toEqual([{ sessionKey: key, path: "/en/contact", locale: "en", referrer: "search.example", umamiSessionId: null }]);
  const { payload } = await submitForm(page, owned.email);
  expect(payload.submissionPath).toBe("/en/contact");
  expect(payload.referrer).toBe("https://search.example");
  expect(payload).not.toHaveProperty("sessionKey");
  await persisted(owned, { attributionSessionKey: key, attributionPath: "/en/contact", attributionReferrerDomain: "search.example" });
});

test("directly injected cookie wins over forged client keys; retry cannot overwrite attribution", async ({ page, context, owned }) => {
  const id = randomUUID();
  await context.addCookies([{ name: "_hfq_sid", value: cookieValue(id), url: browserOrigin }]);
  await page.goto("/en/contact");
  await mutateClientPayload(page, {
    sessionKey: "forged", attributionSessionKey: "forged", _hfq_sid: cookieValue(randomUUID()), qualified: true,
    submissionPath: "/en/contact?private=synthetic#fragment", referrer: "https://Search.Example/private?synthetic=only#fragment",
  });
  const { result, payload } = await submitForm(page, owned.email);
  expect(payload.sessionKey).toBe("forged");
  const attribution = { attributionSessionKey: sessionKey(id), attributionPath: "/en/contact", attributionReferrerDomain: "search.example" };
  const original = await persisted(owned, attribution);
  await context.addCookies([{ name: "_hfq_sid", value: cookieValue(randomUUID()), url: browserOrigin }]);
  const retries = await page.evaluate(async (payload) => Promise.all([1, 2].map(async () => {
    const response = await fetch(new URL("/api/inquiries", location.origin), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, submissionPath: "/en/products?changed=synthetic", referrer: "https://other.example/changed" }),
    });
    return { status: response.status, body: await response.json() };
  })), payload);
  expect(retries).toEqual([{ status: 201, body: result }, { status: 201, body: result }]);
  expect(await persisted(owned, attribution)).toEqual(original);
  const views = await owned.sql`SELECT "id" FROM "AnalyticsPageView" WHERE "sessionKey" = ${sessionKey(id)}`;
  expect(views).toHaveLength(0);
});

for (const kind of ["absent", "expired", "malformed", "legacy"] as const) {
  test(`${kind} client: session is null and private/old optional attribution is null`, async ({ page, context, owned }) => {
    if (kind === "expired" || kind === "malformed") {
      await context.addCookies([{ name: "_hfq_sid", value: kind === "expired" ? cookieValue(randomUUID(), 31 * 60_000) : "malformed", url: browserOrigin }]);
    }
    await page.goto("/en/contact");
    await mutateClientPayload(page, kind === "legacy" ? {} : {
      sessionKey: "forged", attributionSessionKey: "forged", _hfq_sid: cookieValue(randomUUID()), qualified: true,
      submissionPath: "/en/%61dmin?private=synthetic", referrer: "https://synthetic@example.com/private",
    }, kind === "legacy" ? ["submissionPath", "referrer"] : []);
    const { payload } = await submitForm(page, owned.email);
    if (kind === "legacy") {
      expect(payload).not.toHaveProperty("submissionPath");
      expect(payload).not.toHaveProperty("referrer");
      expect(payload).not.toHaveProperty("sessionKey");
    }
    await persisted(owned, { attributionSessionKey: null, attributionPath: null, attributionReferrerDomain: null });
  });
}
