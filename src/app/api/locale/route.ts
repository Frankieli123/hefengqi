import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const result = z.object({
    locale: z.enum(["zh", "en", "ru"]),
    pathname: z.string().optional()
  }).safeParse(await request.json());

  if (!result.success) return NextResponse.json({ code: "INVALID_LOCALE" }, { status: 400 });

  const { locale, pathname } = result.data;
  let targetPath = "/";

  if (pathname) {
    const parts = pathname.split('/').filter(Boolean);
    // 如果首段是当前语言前缀 (zh, en, ru)，则剥离
    if (['zh', 'en', 'ru'].includes(parts[0])) {
      parts.shift();
    }

    const prodIdx = parts.indexOf('products');
    if (prodIdx !== -1 && parts[prodIdx + 1] && parts[prodIdx + 1] !== 'category') {
      const currentSlug = parts[prodIdx + 1];
      try {
        const trans = await db.productTranslation.findFirst({
          where: { slug: currentSlug }
        });
        if (trans) {
          const targetTrans = await db.productTranslation.findUnique({
            where: {
              productId_locale: {
                productId: trans.productId,
                locale
              }
            }
          });
          if (targetTrans?.slug) {
            parts[prodIdx + 1] = targetTrans.slug;
          }
        }
      } catch (e) {
        console.error('Error resolving product alternate slug:', e);
      }
    }

    // 重新组合非前缀相对路径，例如 "" (首页) 或 "/solutions" 或 "/products/xxx-en"
    targetPath = '/' + parts.join('/');
  }

  const response = NextResponse.json({ ok: true, targetPath });
  response.cookies.set("HFQ_LOCALE", locale, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 31_536_000,
    path: "/"
  });
  return response;
}
