import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { locales } from "@/types/domain";

export async function POST(request: Request) {
  const result = z.object({
    locale: z.enum(locales),
    pathname: z.string().optional()
  }).safeParse(await request.json());

  if (!result.success) return NextResponse.json({ code: "INVALID_LOCALE" }, { status: 400 });

  const { locale, pathname } = result.data;
  let targetPath = "/";

  if (pathname) {
    const parts = pathname.split("/").filter(Boolean);
    // 如果首段是当前语言前缀，则剥离
    if (locales.includes(parts[0] as (typeof locales)[number])) {
      parts.shift();
    }

    const prodIdx = parts.indexOf("products");
    if (prodIdx !== -1 && parts[prodIdx + 1]) {
      if (parts[prodIdx + 1] === "category") {
        // 分类路径处理: /products/category/slug1/slug2...
        const catSlugs = parts.slice(prodIdx + 2);
        const targetSlugs: string[] = [];
        for (const slug of catSlugs) {
          try {
            const trans = await db.categoryTranslation.findFirst({
              where: { slug },
              include: { category: true }
            });
            if (trans) {
              const targetCatTrans = await db.categoryTranslation.findUnique({
                where: {
                  categoryId_locale: {
                    categoryId: trans.categoryId,
                    locale
                  }
                }
              });
              targetSlugs.push(targetCatTrans?.slug || slug);
            } else {
              targetSlugs.push(slug);
            }
          } catch (e) {
            targetSlugs.push(slug);
          }
        }
        parts.splice(prodIdx + 2, catSlugs.length, ...targetSlugs);
      } else {
        // 商品详情路径处理: /products/xxx-slug
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
          console.error("Error resolving product alternate slug:", e);
        }
      }
    }

    // 重新组合非前缀相对路径
    targetPath = "/" + parts.join("/");
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
