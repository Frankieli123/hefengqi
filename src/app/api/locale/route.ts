import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { locales, type Locale } from "@/types/domain";

function decodeSegment(value: string) {
  try { return decodeURIComponent(value); } catch { return value; }
}

async function localizedEditorialSlug(section: string, sourceSlug: string, sourceLocale: Locale | undefined, targetLocale: Locale) {
  const slug = decodeSegment(sourceSlug);
  const sourceWhere = { slug, published: true, ...(sourceLocale ? { locale: sourceLocale } : {}) };

  if (section === "solutions" || section === "industries") {
    // Public solution pages are backed by Industry translations.
    const source = await db.industryTranslation.findFirst({ where: sourceWhere, select: { industryId: true } });
    if (!source) return undefined;
    const target = await db.industryTranslation.findUnique({
      where: { industryId_locale: { industryId: source.industryId, locale: targetLocale } },
      select: { slug: true, published: true },
    });
    return target?.published ? target.slug : undefined;
  }

  if (section === "cases") {
    const source = await db.caseStudyTranslation.findFirst({ where: sourceWhere, select: { caseStudyId: true } });
    if (!source) return undefined;
    const target = await db.caseStudyTranslation.findUnique({
      where: { caseStudyId_locale: { caseStudyId: source.caseStudyId, locale: targetLocale } },
      select: { slug: true, published: true },
    });
    return target?.published ? target.slug : undefined;
  }

  if (section === "news") {
    const source = await db.newsArticleTranslation.findFirst({ where: sourceWhere, select: { articleId: true } });
    if (!source) return undefined;
    const target = await db.newsArticleTranslation.findUnique({
      where: { articleId_locale: { articleId: source.articleId, locale: targetLocale } },
      select: { slug: true, published: true },
    });
    return target?.published ? target.slug : undefined;
  }

  return undefined;
}

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
    let sourceLocale: Locale | undefined;
    // 如果首段是当前语言前缀，则剥离
    if (locales.includes(parts[0] as (typeof locales)[number])) {
      sourceLocale = parts.shift() as Locale;
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
          } catch {
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

    const section = parts[0];
    if (["solutions", "industries", "cases", "news"].includes(section) && parts[1]) {
      try {
        const targetSlug = await localizedEditorialSlug(section, parts[1], sourceLocale, locale);
        if (targetSlug) parts[1] = targetSlug;
      } catch (error) {
        console.error("Error resolving editorial alternate slug:", error);
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
