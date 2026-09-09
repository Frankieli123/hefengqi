import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: Request) {
  const result = z.object({ locale: z.enum(["zh", "en", "ru"]) }).safeParse(await request.json());
  if (!result.success) return NextResponse.json({ code: "INVALID_LOCALE" }, { status: 400 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("HFQ_LOCALE", result.data.locale, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 31_536_000, path: "/" });
  return response;
}
