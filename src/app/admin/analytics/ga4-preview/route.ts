import { NextResponse } from "next/server";
import { createPreviewSession, hasValidPreviewCredential, previewCookieOptions, GA4_PREVIEW_BASE, GA4_PREVIEW_COOKIE } from "@/lib/ga4-preview-auth";

export const runtime = "nodejs";
export async function GET(request: Request) {
 const url = new URL(request.url);
 if (url.protocol !== "https:" || !hasValidPreviewCredential(url.searchParams.get("token") ?? "")) {
  return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
 }
 const session = createPreviewSession();
 const target = new URL(GA4_PREVIEW_BASE, url.origin);
 for (const key of ["start", "end", "view"]) {
  const value = url.searchParams.get(key);
  if (value) target.searchParams.set(key, value);
 }
 const response = NextResponse.redirect(target, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
 response.cookies.set(GA4_PREVIEW_COOKIE, session.value, { ...previewCookieOptions, expires: session.expires, maxAge: 60 * 60 * 6 });
 return response;
}
export async function POST() { return new NextResponse(null, { status: 405 }); }
