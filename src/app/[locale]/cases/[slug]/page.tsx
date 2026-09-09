import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EditorialDetail } from "@/components/editorial/editorial-detail";
import { JsonLd } from "@/components/json-ld";
import { getEditorial, getEditorialAlternatePaths, getSlugRedirect } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale, slug } = await params; assertLocale(locale); const item = (await getEditorial(locale, "cases")).find((entry) => entry.slug === slug); if (!item) return {}; const alternates = await getEditorialAlternatePaths("cases", item.id); return localizedMetadata(locale, `/cases/${slug}`, item.seoTitle ?? item.title, item.seoDescription ?? item.summary, false, alternates); }
export default async function Page({ params }: Props) { const { locale, slug } = await params; assertLocale(locale); const [items, common] = await Promise.all([getEditorial(locale, "cases"), getTranslations({ locale, namespace: "common" })]); const item = items.find((entry) => entry.slug === slug); if (!item) { const moved = await getSlugRedirect(locale, `/cases/${slug}`); if (moved) redirect(`/${locale}${moved}`); notFound(); } return <><JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: item.title, description: item.summary, dateModified: item.updatedAt, publisher: { "@type": "Organization", name: "HEFENGQI" } }} /><EditorialDetail locale={locale} item={item} homeLabel={common("home")} sectionLabel={common("cases")} basePath="/cases" /></>; }
