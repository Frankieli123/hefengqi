import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations , setRequestLocale } from "next-intl/server";
import { EditorialDetail } from "@/components/editorial/editorial-detail";
import { JsonLd } from "@/components/json-ld";
import { getEditorialAlternatePaths, getEditorialBySlug, getEditorialRecentSummaries, getNewsRelatedProducts, getSlugRedirect } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { breadcrumbSchema, newsArticleMetadata, newsArticleSchema } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const item = await getEditorialBySlug(locale, "news", slug);
  if (!item) return {};
  const alternates = await getEditorialAlternatePaths("news", item.id);
  return newsArticleMetadata(locale, item, alternates);
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  assertLocale(locale);
  const [item, common, productCopy] = await Promise.all([
    getEditorialBySlug(locale, "news", slug),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "products" }),
  ]);
  if (!item) {
    const moved = await getSlugRedirect(locale, `/news/${slug}`);
    if (moved) redirect(`/${locale}${moved}`);
    notFound();
  }
  const [recentItems, relatedProducts] = await Promise.all([
    getEditorialRecentSummaries(locale, "news", item.id, 5),
    getNewsRelatedProducts(locale, item),
  ]);
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
