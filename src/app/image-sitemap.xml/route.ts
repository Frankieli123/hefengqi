import { getProducts } from "@/lib/content-repository";
import { env } from "@/lib/env";
import { locales } from "@/types/domain";

export const dynamic = "force-dynamic";

const siteUrl = env.SITE_URL;
function xml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export async function GET() {
  const collections = await Promise.all(locales.map(async (locale) => ({ locale, products: await getProducts(locale) })));

  const urls = collections.flatMap(({ locale, products }) =>
    products
      .filter((product) => product.image)
      .map((product) => {
        const lastmod = product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString();
        return `<url><loc>${xml(`${siteUrl}/${locale}/products/${product.slug}`)}</loc><lastmod>${lastmod}</lastmod><image:image><image:loc>${xml(new URL(product.image!.src, siteUrl).toString())}</image:loc></image:image></url>`;
      })
  ).join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls}</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
