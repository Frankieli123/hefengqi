import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hasInvalidServerActionId } from "@/lib/request-guard";

const PUBLIC_FILE = /\.[^/]+$/;
const locales = new Set(["zh", "en", "ru", "fr", "de", "es", "ar"]);

export function proxy(request: NextRequest) {
  if (hasInvalidServerActionId(request.headers.get("next-action") ?? undefined)) {
    return new NextResponse("Invalid server action", { status: 400 });
  }
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/admin")) {
   const forwarded=new Headers(request.headers);forwarded.set("x-ricewind-pathname",pathname);
   return NextResponse.next({request:{headers:forwarded}});
  }
  if (PUBLIC_FILE.test(pathname) || pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/admin")) return NextResponse.next();
  const locale = pathname.split("/")[1];
  if (locale && !locales.has(locale)) return NextResponse.next();
  const forwarded = new Headers(request.headers);
  if (locale) forwarded.set("x-hfq-locale", locale);
  return NextResponse.next({ request: { headers: forwarded } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
