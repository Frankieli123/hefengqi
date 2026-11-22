import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { env } from "@/lib/env";

export const GA4_PREVIEW_COOKIE = "__Host-ga4_preview";
export const GA4_PREVIEW_BASE = "/admin/analytics/ga4-preview";
const maxAge = 60 * 60 * 6;

export function createPreviewSecret() { return randomBytes(32).toString("hex"); }
function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
function equal(left: string, right: string) {
 const a = Buffer.from(left); const b = Buffer.from(right);
 return a.length === b.length && timingSafeEqual(a, b);
}
export function hasValidPreviewCredential(token: string) {
 const secret = env.GA4_PREVIEW_SECRET;
 return Boolean(secret && secret.length >= 32 && equal(digest(token), digest(secret)));
}
export const isGa4Preview = cache(async () => {
 if (!env.GA4_PREVIEW_SECRET || env.GA4_PREVIEW_SECRET.length < 32) return false;
 const requestHeaders = await headers();
 const pathname=requestHeaders.get("x-ricewind-pathname")??requestHeaders.get("next-url")??"";
 if(pathname!==GA4_PREVIEW_BASE&&pathname!==`${GA4_PREVIEW_BASE}/access`)return false;
 if (requestHeaders.get("x-forwarded-proto") === "http" && process.env.NODE_ENV === "production") return false;
 const cookie = (await cookies()).get(GA4_PREVIEW_COOKIE)?.value;
 if (!cookie) return false;
 const [expiryText, signature] = cookie.split(".");
 const expiry = Number(expiryText);
 if (!expiry || expiry <= Math.floor(Date.now() / 1000) || !signature) return false;
 return equal(digest(`${expiry}.${env.GA4_PREVIEW_SECRET}`), signature);
});
export async function requireGa4Preview() { if (!(await isGa4Preview())) redirect("/admin/login"); }
export function createPreviewSession() {
 if (!env.GA4_PREVIEW_SECRET || env.GA4_PREVIEW_SECRET.length < 32) throw new Error("GA4 preview is not configured");
 const expiry = Math.floor(Date.now() / 1000) + maxAge;
 return { value: `${expiry}.${digest(`${expiry}.${env.GA4_PREVIEW_SECRET}`)}`, expires: new Date(expiry * 1000) };
}
export const previewCookieOptions = { httpOnly: true, secure: true, sameSite: "strict", path: "/admin/analytics/ga4" } as const;
