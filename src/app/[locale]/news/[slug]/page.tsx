import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EditorialDetail } from "@/components/editorial/editorial-detail";
import { JsonLd } from "@/components/json-ld";
import { getEditorial, getEditorialAlternatePaths, getProducts, getSlugRedirect } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { breadcrumbSchema, newsArticleMetadata, newsArticleSchema } from "@/lib/seo";
import { selectNewsRelatedProducts } from "@/lib/news-related-products";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  assertLocale(locale);
  const item = (await getEditorial(locale, "news")).find((entry) => entry.slug === slug);
  if (!item) return {};
  const alternates = await getEditorialAlternatePaths("news", item.id);
  return newsArticleMetadata(locale, item, alternates);
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  assertLocale(locale);
  const [items, products, common, productCopy] = await Promise.all([
    getEditorial(locale, "news"),
    getProducts(locale),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "products" }),
  ]);
  const item = items.find((entry) => entry.slug === slug);
  if (!item) {
    const moved = await getSlugRedirect(locale, `/news/${slug}`);
    if (moved) redirect(`/${locale}${moved}`);
    notFound();
  }
  const recentItems = items.filter((entry) => entry.id !== item.id).slice(0, 5);
  const relatedProducts = selectNewsRelatedProducts(item, products);
  const schemas = [
    newsArticleSchema(locale, item),
    breadcrumbSchema([
      { name: common("home"), path: `/${locale}` },
      { name: common("news"), path: `/${locale}/news` },
      { name: item.title, path: `/${locale}/news/${item.slug}` },
    ]),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <EditorialDetail
        locale={locale}
        item={item}
        recentItems={recentItems}
        relatedProducts={relatedProducts}
        productLabels={{ details: common("details"), inquiry: common("inquiry"), model: productCopy("model") }}
        homeLabel={common("home")}
        sectionLabel={common("news")}
        basePath="/news"
      />
    </>
  );
}
