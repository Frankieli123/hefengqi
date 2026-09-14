import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations , setRequestLocale } from "next-intl/server";
import { EditorialDetail } from "@/components/editorial/editorial-detail";
import { JsonLd } from "@/components/json-ld";
import { getEditorial, getEditorialAlternatePaths, getSlugRedirect } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const item = (await getEditorial(locale, "industries")).find((entry) => entry.slug === slug);
  if (!item) return {};
  const alternates = await getEditorialAlternatePaths("industries", item.id, "/solutions");
  return localizedMetadata(locale, `/solutions/${slug}`, item.seoTitle ?? item.title, item.seoDescription ?? item.summary, false, alternates);
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  assertLocale(locale);
  const [items, common] = await Promise.all([getEditorial(locale, "industries"), getTranslations({ locale, namespace: "common" })]);
  const item = items.find((entry) => entry.slug === slug);
  if (!item) {
    const moved = await getSlugRedirect(locale, `/industries/${slug}`);
    if (moved) redirect(`/${locale}${moved.replace(/^\/industries/, "/solutions")}`);
    notFound();
  }
  return <><JsonLd data={{ "@context": "https://schema.org", "@type": "Service", name: item.title, description: item.summary, provider: { "@type": "Organization", name: "HEFENGQI" } }} /><EditorialDetail locale={locale} item={item} homeLabel={common("home")} sectionLabel={common("solutions")} basePath="/solutions" /></>;
}
