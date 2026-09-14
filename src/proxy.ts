import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_FILE = /\.[^/]+$/;
const locales = new Set(["zh", "en", "ru", "fr", "de", "es", "ar"]);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (PUBLIC_FILE.test(pathname) || pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/admin")) return NextResponse.next();
  const locale = pathname.split("/")[1];
  if (locale && !locales.has(locale)) return NextResponse.next();
  const forwarded = new Headers(request.headers);
  if (locale) forwarded.set("x-hfq-locale", locale);
  return NextResponse.next({ request: { headers: forwarded } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
