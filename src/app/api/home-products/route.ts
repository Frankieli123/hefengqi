import { NextResponse } from "next/server";
import { z } from "zod";
import { getHomeProductGroupPage, HOME_PRODUCT_CATEGORY_KEYS, HOME_PRODUCT_PAGE_LIMIT } from "@/lib/content-repository";
import { locales } from "@/types/domain";

export const runtime = "nodejs";

const integerQuery = (fallback: number, min: number, max: number) => z.preprocess((value) => {
  if (value === undefined || value === "") return fallback;
  return typeof value === "string" ? Number(value) : value;
}, z.number().int().min(min).max(max));

const querySchema = z.object({
  locale: z.enum(locales),
  category: z.enum(HOME_PRODUCT_CATEGORY_KEYS),
  offset: integerQuery(0, 0, 10_000),
  limit: integerQuery(HOME_PRODUCT_PAGE_LIMIT, 1, HOME_PRODUCT_PAGE_LIMIT),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = querySchema.safeParse({
    locale: url.searchParams.get("locale") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!result.success) return NextResponse.json({ code: "INVALID_QUERY" }, { status: 400 });

  const page = await getHomeProductGroupPage(result.data.locale, result.data.category, result.data.offset, result.data.limit);
  if (!page) return NextResponse.json({ code: "CATEGORY_NOT_FOUND" }, { status: 404 });
  return NextResponse.json(page, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
