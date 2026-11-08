import { isIP } from "node:net";

const SESSION_ID = /^[a-zA-Z0-9_-]{16,128}$/;
const PRIVATE = new Set(["admin", "api", "_next", "media", "u"]);
const LOCALES = new Set(["zh", "en", "ru", "fr", "de", "es", "ar"]);
const PUBLIC_STATIC = new Set(["", "products", "solutions", "industries", "cases", "news", "contact", "about", "support", "support/troubleshooting", "search", "privacy", "terms", "products/compare"]);
const HOSTS = new Set(["ricewind.com", "www.ricewind.com", "hefengqi.nasl.cc"]);

export function readAnonymousSession(value: string | undefined, nowMs: number): string | null {
  const parts = value?.split(".");
  if (!parts || parts.length !== 2 || !SESSION_ID.test(parts[0]) || !Number.isSafeInteger(nowMs)) return null;
  const activity = parts[1];
  if (!/^[0-9a-z]{1,11}$/.test(activity)) return null;
  const lastActivity = Number.parseInt(activity, 36);
  if (!Number.isSafeInteger(lastActivity) || lastActivity.toString(36) !== activity.toLowerCase()) return null;
  return lastActivity <= nowMs && nowMs - lastActivity < 30 * 60 * 1_000 ? parts[0] : null;
}

export function sanitizeSubmissionPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048 || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  let url: URL;
  try { url = new URL(value, "https://ricewind.com"); } catch { return null; }
  if (/^https?:\/\/[^/?#]*@/i.test(value)) return null;
  if (!HOSTS.has(url.hostname) || !["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port || value.startsWith("//")) return null;
  if (!(value.startsWith("/") || /^https?:\/\//.test(value)) || url.pathname.includes("%") || /(?:^|\/)\.{1,2}(?:\/|$)/.test(value.split(/[?#]/)[0])) return null;
  const path = url.pathname.replace(/\/+/g, "/");
  if (!path.startsWith("/") || /[\u0000-\u001f]/.test(path) || path.length > 512) return null;
  const segments = path.split("/").filter(Boolean);
  if (segments.some((segment) => PRIVATE.has(segment.toLowerCase())) || !LOCALES.has(segments[0] ?? "")) return null;
  const publicPart = segments.slice(1).join("/");
  const slug = "[a-zA-Z0-9_-]+";
  if (!PUBLIC_STATIC.has(publicPart) && !new RegExp(`^(?:(?:products|solutions|industries|cases|news)/${slug}|products/category/${slug}(?:/${slug}){0,2}|support/troubleshooting/${slug}/${slug})$`).test(publicPart)) return null;
  return path;
}

export function sanitizeSourceDomain(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > 2_048 || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  const authority = /^https?:\/\/([^/?#]*)/i.exec(value)?.[1];
  if (!authority || authority.includes("@")) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || isIP(hostname.replace(/^\[|\]$/g, "")) || /(?:^|\.)(?:localhost|local|internal)$/.test(hostname)) return null;
    if (hostname.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname)) return null;
    return hostname;
  } catch { return null; }
}

export type InquiryAttribution = { attributionSessionKey: string | null; attributionPath: string | null; attributionReferrerDomain: string | null };
export function attributionFromRequest(cookie: string | undefined, payload: Record<string, unknown>, nowMs: number, hmac: (value: string) => string): InquiryAttribution {
  const session = readAnonymousSession(cookie, nowMs);
  return {
    attributionSessionKey: session ? hmac(`analytics-session:${session}`) : null,
    attributionPath: sanitizeSubmissionPath(payload.submissionPath),
    attributionReferrerDomain: sanitizeSourceDomain(payload.referrer),
  };
}
