import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { recordAnalyticsPageView } from "@/lib/analytics-page-view";
import {
  isAnalyticsPageViewEvent,
  localeFromPath,
  normalizeClientIp,
  sanitizeAnalyticsPath,
  sanitizeCountry,
  sanitizeGeoName,
  sanitizeReferrerDomain,
} from "@/lib/analytics-privacy";

const VISITOR_COOKIE = "_hfq_vid";
const SESSION_COOKIE = "_hfq_sid";
const SESSION_TTL_SECONDS = 30 * 60;
const ID_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;

function anonymousVisitorId(cookieValue: string | undefined): string {
  const existing = cookieValue?.split(".")[0];
  return existing && ID_PATTERN.test(existing) ? existing : crypto.randomUUID();
}

function anonymousSession(cookieValue: string | undefined, now: number) {
  const [existingId, encodedActivity] = cookieValue?.split(".") ?? [];
  const lastActivity = Number.parseInt(encodedActivity ?? "", 36);
  const isActive =
    Boolean(existingId && ID_PATTERN.test(existingId)) &&
    Number.isFinite(lastActivity) &&
    now - lastActivity >= 0 &&
    now - lastActivity < SESSION_TTL_SECONDS * 1_000;
  const id = isActive && existingId ? existingId : crypto.randomUUID();
  return { id, cookieValue: `${id}.${now.toString(36)}` };
}

function applyAnonymousCookies(response: NextResponse, request: NextRequest, visitorId: string, sessionCookieValue: string) {
  const secure = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  response.cookies.set(VISITOR_COOKIE, visitorId, { path: "/", maxAge: 365 * 24 * 60 * 60, sameSite: "lax", httpOnly: true, secure });
  response.cookies.set(SESSION_COOKIE, sessionCookieValue, { path: "/", maxAge: SESSION_TTL_SECONDS, sameSite: "lax", httpOnly: true, secure });
  return response;
}

export async function POST(req: NextRequest) {
  if (req.cookies.get("better-auth.session_token")?.value) {
    return NextResponse.json({ disabled: true, ok: true });
  }

  const firstHeader = (...names: string[]) => {
    for (const name of names) {
      const value = req.headers.get(name);
      if (value?.trim()) return value;
    }
    return null;
  };
  const incomingIp = normalizeClientIp(firstHeader(
    "eo-connecting-ip",
    "x-edgeone-client-ip",
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
  ));
  const now = Date.now();
  const visitorId = anonymousVisitorId(req.cookies.get(VISITOR_COOKIE)?.value);
  const session = anonymousSession(req.cookies.get(SESSION_COOKIE)?.value, now);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "type" in body &&
    (body.type === "pageview" || body.type === "event") &&
    "payload" in body &&
    typeof body.payload === "object" &&
    body.payload !== null
  ) {
    const payload = body.payload as Record<string, unknown>;
    const allowedHostnames = new Set([
      req.nextUrl.hostname.toLowerCase(),
      "ricewind.com",
      "www.ricewind.com",
      "hefengqi.nasl.cc",
    ]);
    const path = isAnalyticsPageViewEvent(body.type, payload)
      ? sanitizeAnalyticsPath(payload.url, allowedHostnames)
      : null;
    if (path) {
      try {
        await recordAnalyticsPageView({
          visitorId,
          sessionId: session.id,
          ip: incomingIp,
          path,
          locale: localeFromPath(path),
          referrer: sanitizeReferrerDomain(payload.referrer),
          country: sanitizeCountry(firstHeader("eo-ipcountry", "x-edgeone-country-code", "cf-ipcountry", "x-country-code")),
          region: sanitizeGeoName(firstHeader("eo-region-code", "x-edgeone-region-code", "cf-region-code", "x-region-code")),
          city: sanitizeGeoName(firstHeader("eo-ipcity", "x-edgeone-city", "cf-ipcity", "x-city")),
        });
      } catch (error) {
        console.error("Analytics page-view persistence failed:", error);
      }
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Forwarded-For": incomingIp,
    "X-Real-IP": incomingIp,
  };
  const userAgent = req.headers.get("user-agent");
  if (userAgent) headers["User-Agent"] = userAgent;
  for (const headerName of ["x-umami-website-id", "x-umami-hostname", "x-umami-cache"]) {
    const value = req.headers.get(headerName);
    if (value) headers[headerName] = value;
  }
  for (const headerName of [
    "eo-connecting-ip", "x-edgeone-client-ip", "eo-ipcountry", "x-edgeone-country-code",
    "eo-region-code", "x-edgeone-region-code", "eo-ipcity", "x-edgeone-city",
    "cf-ipcountry", "cf-region-code", "cf-ipcity",
  ]) {
    const value = req.headers.get(headerName);
    if (value) headers[headerName] = value;
  }

  try {
    const umamiResponse = await fetch("http://127.0.0.1:3008/api/send", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3_000),
    });
    const data = await umamiResponse.json();
    return applyAnonymousCookies(NextResponse.json(data, { status: umamiResponse.status }), req, visitorId, session.cookieValue);
  } catch (error) {
    console.error("Umami forward error in /u/api/send:", error);
    return applyAnonymousCookies(NextResponse.json({ ok: false }, { status: 502 }), req, visitorId, session.cookieValue);
  }
}
