import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations , setRequestLocale } from "next-intl/server";
import { EditorialDetail } from "@/components/editorial/editorial-detail";
import { JsonLd } from "@/components/json-ld";
import { getEditorialAlternatePaths, getEditorialBySlug, getSlugRedirect } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { breadcrumbSchema, localizedMetadata, organizationId } from "@/lib/seo";
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale, slug } = await params; assertLocale(locale);
  setRequestLocale(locale); const item = await getEditorialBySlug(locale, "cases", slug); if (!item) return {}; const alternates = await getEditorialAlternatePaths("cases", item.id); return localizedMetadata(locale, `/cases/${slug}`, item.seoTitle ?? item.title, item.seoDescription ?? item.summary, false, alternates); }
export default async function Page({ params }: Props) { const { locale, slug } = await params; assertLocale(locale); const [item, common] = await Promise.all([getEditorialBySlug(locale, "cases", slug), getTranslations({ locale, namespace: "common" })]); if (!item) { const moved = await getSlugRedirect(locale, `/cases/${slug}`); if (moved) redirect(`/${locale}${moved}`); notFound(); } return <><JsonLd data={[{ "@context": "https://schema.org", "@type": "Article", headline: item.title, description: item.summary, publisher: { "@type": "Organization", "@id": organizationId, name: locale === "zh" ? "禾风起" : "RICEWIND" } }, breadcrumbSchema([{ name: common("home"), path: `/${locale}` }, { name: common("cases"), path: `/${locale}/cases` }, { name: item.title, path: `/${locale}/cases/${item.slug}` }])]} /><EditorialDetail locale={locale} item={item} homeLabel={common("home")} sectionLabel={common("cases")} basePath="/cases" /></>; }
