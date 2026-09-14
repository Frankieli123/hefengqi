import { NextRequest, NextResponse } from "next/server";

function normalizeIp(ip: string): string {
  if (!ip) return "127.0.0.1";
  const cleanIp = ip.split(",")[0].trim();
  if (cleanIp.includes(":")) {
    const parts = cleanIp.split(":");
    if (parts.length >= 4) {
      return `${parts.slice(0, 4).join(":")}::1`;
    }
  }
  return cleanIp;
}

export async function POST(req: NextRequest) {
  // 1. Check if the current user is an authenticated administrator.
  // Admin browsing/testing should never pollute production analytics.
  const adminToken = req.cookies.get("better-auth.session_token")?.value;
  if (adminToken) {
    return NextResponse.json({ disabled: true, ok: true });
  }

  // 2. Extract incoming IP address from CDN/proxy headers
  const incomingIp =
    req.headers.get("eo-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "127.0.0.1";

  // 3. Umami uses the address transiently for anonymous visitor and region
  // aggregation. It is not persisted in a first-party cookie.
  const canonicalIp = normalizeIp(incomingIp);

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 4. Forward to local Umami service with canonical IP
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Forwarded-For": canonicalIp,
    "X-Real-IP": canonicalIp,
  };

  const userAgent = req.headers.get("user-agent");
  if (userAgent) headers["User-Agent"] = userAgent;

  const websiteId = req.headers.get("x-umami-website-id");
  if (websiteId) headers["x-umami-website-id"] = websiteId;

  const hostname = req.headers.get("x-umami-hostname");
  if (hostname) headers["x-umami-hostname"] = hostname;

  const cache = req.headers.get("x-umami-cache");
  if (cache) headers["x-umami-cache"] = cache;

  // Pass location headers if present from Tencent EdgeOne / CDN
  const geoHeaders = [
    "eo-connecting-ip",
    "eo-ipcountry",
    "eo-region-code",
    "eo-ipcity",
    "cf-ipcountry",
    "cf-region-code",
    "cf-ipcity",
  ];
  for (const h of geoHeaders) {
    const val = req.headers.get(h);
    if (val) headers[h] = val;
  }

  try {
    const umamiRes = await fetch("http://127.0.0.1:3008/api/send", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });

    const data = await umamiRes.json();
    return NextResponse.json(data, { status: umamiRes.status });
  } catch (err) {
    console.error("Umami forward error in /u/api/send:", err);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
