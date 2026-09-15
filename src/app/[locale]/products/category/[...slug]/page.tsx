import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Catalog } from "@/components/products/catalog";
import { JsonLd } from "@/components/json-ld";
import { getCategories, getCategoryAlternatePaths, getProductCatalogPage, getSlugRedirect } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { breadcrumbSchema, collectionPageSchema, localizedMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params; assertLocale(locale);
  const category = (await getCategories(locale)).find((item) => item.slug === slug.at(-1));
  if (!category) return {};
  const [query, alternates] = await Promise.all([searchParams, getCategoryAlternatePaths(category.id)]);
  return localizedMetadata(locale, `/products/category/${slug.join("/")}`, category.seoTitle ?? category.name, category.seoDescription ?? category.description, Boolean(query.q), alternates);
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params; assertLocale(locale); setRequestLocale(locale);
  const current = slug.at(-1); const categories = await getCategories(locale); const category = categories.find((item) => item.slug === current);
  if (!category || category.path !== slug.join("/")) { const moved = await getSlugRedirect(locale, `/products/category/${slug.join("/")}`); if (moved) redirect(`/${locale}${moved}`); notFound(); }
  const queryRaw = await searchParams; const query = Object.fromEntries(Object.entries(queryRaw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  const categoryKeys = new Set([category.key]);
  for (let changed = true; changed;) {
    changed = false;
    for (const item of categories) {
      if (item.parentKey && categoryKeys.has(item.parentKey) && !categoryKeys.has(item.key)) { categoryKeys.add(item.key); changed = true; }
    }
  }
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const [catalog, t, common] = await Promise.all([getProductCatalogPage(locale, { query: query.q, page, categoryKeys: [...categoryKeys] }), getTranslations("products"), getTranslations("common")]);
  const labels = { home: common("home"), products: common("products"), searchPlaceholder: t("searchPlaceholder"), searchAction: common("search"), category: t("category"), allProducts: t("allProducts"), filters: t("filters"), empty: t("empty"), emptyHelp: t("emptyHelp"), clear: t("clear"), model: t("model"), details: common("details"), inquiry: common("inquiry"), previous: t("previous"), next: t("next"), customSolutionTitle: t("customSolutionTitle"), customSolutionDesc: t("customSolutionDesc"), customSolutionCta: t("customSolutionCta") };
  return <main id="main-content"><JsonLd data={[breadcrumbSchema([{ name: common("home"), path: `/${locale}` }, { name: t("title"), path: `/${locale}/products` }, { name: category.name, path: `/${locale}/products/category/${slug.join("/")}` }]), collectionPageSchema(locale, `/products/category/${category.path}`, category.name, category.description)]} /><section className="bg-ink text-ink-foreground"><div className="page-shell py-14"><h1 className="text-3xl font-semibold leading-tight md:text-5xl">{category.name}</h1><p className="mt-5 max-w-3xl text-base leading-7 text-ink-muted">{category.description}</p></div></section><Catalog locale={locale} products={catalog.products} categories={categories} labels={labels} query={query} currentCategory={category.key} currentCategoryPath={category.path} currentPage={catalog.currentPage} pageCount={catalog.pageCount} totalCount={catalog.totalCount} /></main>;
}
