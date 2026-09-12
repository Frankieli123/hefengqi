import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { ProductDetail } from "@/components/products/product-detail";
import { ProductViewTracker } from "@/components/products/product-view-tracker";
import { getProductAlternatePaths, getProducts, getSlugRedirect } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { breadcrumbSchema, faqSchema, localizedMetadata, productSchema } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale, slug } = await params; assertLocale(locale); const product = (await getProducts(locale)).find((item) => item.slug === slug); if (!product) return {}; const alternates = await getProductAlternatePaths(product.id); return localizedMetadata(locale, `/products/${slug}`, product.seoTitle ?? product.name, product.seoDescription ?? product.directDefinition, false, alternates); }

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params; assertLocale(locale); setRequestLocale(locale);
  const [products, t, common] = await Promise.all([getProducts(locale), getTranslations("products"), getTranslations("common")]);
  const product = products.find((item) => item.slug === slug); if (!product) { const moved = await getSlugRedirect(locale, `/products/${slug}`); if (moved) redirect(`/${locale}${moved}`); notFound(); }
  const labels = { home: common("home"), products: common("products"), inquiry: common("inquiry"), details: common("details"), model: t("model"), keySpecs: t("keySpecs"), specValue: t("specValue"), what: t("what"), problem: t("problem"), who: t("who"), advantages: t("advantages"), specs: t("specs"), applications: t("applications"), faq: t("faq"), related: t("related"), continueExploring: t("continueExploring"), updated: t("updated"), noPrice: t("noPrice") };
  const recommendations = products
    .filter((item) => item.id !== product.id)
    .sort((left, right) => {
      const leftSameBrand = (product.brandId ? left.brandId === product.brandId : left.brand === product.brand) ? 1 : 0;
      const rightSameBrand = (product.brandId ? right.brandId === product.brandId : right.brand === product.brand) ? 1 : 0;
      if (rightSameBrand !== leftSameBrand) return rightSameBrand - leftSameBrand;

      const leftSameCat = left.categoryKey === product.categoryKey ? 1 : 0;
      const rightSameCat = right.categoryKey === product.categoryKey ? 1 : 0;
      return rightSameCat - leftSameCat;
    })
    .slice(0, 4);
  const breadcrumbItems = [
    { name: common("home"), path: `/${locale}` },
    { name: common("products"), path: `/${locale}/products` },
    ...(product.categoryTrail ?? []).map((category) => ({ name: category.name, path: `/${locale}/products/category/${category.path}` })),
    { name: product.name, path: `/${locale}/products/${slug}` },
  ];
  const schemas: Array<Record<string, unknown>> = [productSchema(locale, product), breadcrumbSchema(breadcrumbItems)]; if (product.faqs.length) schemas.push(faqSchema(product.faqs));
  return <main id="main-content"><JsonLd data={schemas} /><ProductViewTracker productId={product.id} /><ProductDetail product={product} locale={locale} labels={labels} recommendations={recommendations} /></main>;
}
