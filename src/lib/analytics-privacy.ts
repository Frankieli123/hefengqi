import { isIP } from "node:net";

const PRIVATE_ANALYTICS_PREFIXES = new Set(["admin", "api", "_next", "media", "u"]);
const PUBLIC_LOCALES = new Set(["zh", "en", "ru", "fr", "de", "es", "ar"]);

function stripAddressPort(value: string): string {
  const candidate = value.split(",")[0]?.trim().replace(/^"|"$/g, "") ?? "";
  const bracketed = candidate.match(/^\[([^\]]+)](?::\d+)?$/);
  if (bracketed) return bracketed[1];
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) return candidate.slice(0, candidate.lastIndexOf(":"));
  return candidate;
}

export function normalizeClientIp(value: string | null | undefined): string {
  const candidate = stripAddressPort(value ?? "");
  const mappedIpv4 = candidate.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)?.[1];
  if (mappedIpv4 && isIP(mappedIpv4) === 4) return mappedIpv4;
  return isIP(candidate) ? candidate.toLowerCase() : "0.0.0.0";
}

export function maskClientIp(value: string): string {
  const normalized = normalizeClientIp(value);
  if (isIP(normalized) === 4) return `${normalized.split(".").slice(0, 3).join(".")}.xxx`;
  if (isIP(normalized) === 6) {
    const visible = normalized.split(":").filter(Boolean).slice(0, 3);
    return visible.length ? `${visible.join(":")}::****` : "::****";
  }
  return "未知";
}

export function sanitizeAnalyticsPath(value: unknown, allowedHostnames: ReadonlySet<string>): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > 2_048) return null;
  let url: URL;
  try {
    url = new URL(value, "https://analytics.invalid");
  } catch {
    return null;
  }
  const trimmed = value.trim();
  const relative = trimmed.startsWith("/") && !trimmed.startsWith("//");
  if (!relative && !allowedHostnames.has(url.hostname.toLowerCase())) return null;
  if (!["http:", "https:"].includes(url.protocol)) return null;
  const path = url.pathname.replace(/\/{2,}/g, "/");
  if (!path.startsWith("/") || path.length > 512 || /[\u0000-\u001f]/.test(path)) return null;
  const firstSegment = path.split("/")[1]?.toLowerCase() ?? "";
  return PRIVATE_ANALYTICS_PREFIXES.has(firstSegment) ? null : path;
}

export function localeFromPath(path: string): string | null {
  const locale = path.split("/")[1]?.toLowerCase();
  return locale && PUBLIC_LOCALES.has(locale) ? locale : null;
}

export function sanitizeCountry(value: string | null | undefined): string | null {
  const country = value?.trim().toUpperCase();
  return country && /^[A-Z]{2}$/.test(country) ? country : null;
}

export function sanitizeGeoName(value: string | null | undefined): string | null {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // CDN providers may send plain UTF-8 instead of URI encoding.
  }
  const normalized = decoded.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return normalized && normalized.length <= 120 ? normalized : null;
}

export function sanitizeUmamiSessionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)
    ? normalized
    : null;
}

export function sanitizeReferrerDomain(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname && hostname.length <= 253 ? hostname : null;
  } catch {
    return null;
  }
}

export function isAnalyticsPageViewEvent(type: unknown, payload: Record<string, unknown>): boolean {
  return type === "pageview" || (type === "event" && typeof payload.name !== "string");
}
