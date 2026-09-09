import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Catalog } from "@/components/products/catalog";
import { JsonLd } from "@/components/json-ld";
import { getCategories, getProducts } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { breadcrumbSchema, collectionPageSchema, localizedMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> { const { locale } = await params; assertLocale(locale); const query = await searchParams; const t = await getTranslations({ locale, namespace: "products" }); return localizedMetadata(locale, "/products", t("title"), t("description"), Boolean(query.q || query.compare)); }

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params; assertLocale(locale); setRequestLocale(locale);
  const queryRaw = await searchParams; const query = Object.fromEntries(Object.entries(queryRaw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  const [products, categories, t, common] = await Promise.all([getProducts(locale), getCategories(locale), getTranslations("products"), getTranslations("common")]);
  const labels = { home: common("home"), products: common("products"), searchPlaceholder: t("searchPlaceholder"), searchAction: common("search"), category: t("category"), allProducts: t("allProducts"), filters: t("filters"), empty: t("empty"), emptyHelp: t("emptyHelp"), clear: t("clear"), model: t("model"), details: common("details"), inquiry: common("inquiry"), compare: common("compare"), previous: t("previous"), next: t("next"), comparison: t("comparison") };
  return <main id="main-content"><JsonLd data={[breadcrumbSchema([{ name: common("home"), path: `/${locale}` }, { name: t("title"), path: `/${locale}/products` }]), collectionPageSchema(locale, "/products", t("title"), t("description"), products.map((product) => ({ name: product.name, path: `/products/${product.slug}` })))]} /><section className="bg-ink text-ink-foreground"><div className="page-shell py-14"><span className="eyebrow">Catalog</span><h1 className="mt-6 text-3xl font-semibold leading-tight md:text-5xl">{t("title")}</h1><p className="mt-5 max-w-3xl text-base leading-7 text-ink-muted">{t("description")}</p></div></section><Catalog locale={locale} products={products} categories={categories} labels={labels} query={query} /></main>;
}
