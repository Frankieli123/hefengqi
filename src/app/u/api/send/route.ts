import { NextRequest, NextResponse } from "next/server";

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.20.") ||
    ip.startsWith("172.21.") ||
    ip.startsWith("172.22.") ||
    ip.startsWith("172.23.") ||
    ip.startsWith("172.24.") ||
    ip.startsWith("172.25.") ||
    ip.startsWith("172.26.") ||
    ip.startsWith("172.27.") ||
    ip.startsWith("172.28.") ||
    ip.startsWith("172.29.") ||
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.")
  );
}

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

  // 3. Retrieve or generate persistent visitor device ID and canonical IP
  const cookieValue = req.cookies.get("_hfq_vid")?.value;
  let vid = "";
  let canonicalIp = "";

  if (cookieValue) {
    const [existingVid, encodedIp] = cookieValue.split(".");
    if (existingVid) {
      vid = existingVid;
      if (encodedIp) {
        try {
          const decoded = Buffer.from(encodedIp, "base64url").toString("utf-8");
          if (decoded && (decoded.includes(".") || decoded.includes(":"))) {
            canonicalIp = decoded;
          }
        } catch {
          // Fall back
        }
      }
    }
  }

  if (!vid) {
    vid = crypto.randomUUID();
  }

  // Determine canonical IP:
  // If we have no canonical IP yet, use normalized incoming IP.
  // If current canonical is private LAN but incoming is public, upgrade to public.
  // If current canonical is IPv6 but incoming is stable IPv4, prefer IPv4.
  if (!canonicalIp) {
    canonicalIp = normalizeIp(incomingIp);
  } else if (isPrivateIp(canonicalIp) && !isPrivateIp(incomingIp)) {
    canonicalIp = normalizeIp(incomingIp);
  } else if (canonicalIp.includes(":") && incomingIp.includes(".") && !isPrivateIp(incomingIp)) {
    canonicalIp = incomingIp;
  }

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
    const res = NextResponse.json(data, { status: umamiRes.status });

    // Persist visitor ID and canonical IP in a 1-year 1st-party cookie
    const serializedCookie = `${vid}.${Buffer.from(canonicalIp).toString("base64url")}`;
    res.cookies.set("_hfq_vid", serializedCookie, {
      path: "/",
      maxAge: 365 * 24 * 3600,
      sameSite: "lax",
      httpOnly: true,
    });

    return res;
  } catch (err) {
    console.error("Umami forward error in /u/api/send:", err);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
