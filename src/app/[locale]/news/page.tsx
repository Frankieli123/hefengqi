import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EditorialIndex } from "@/components/editorial/editorial-index";
import { getEditorial } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";
type Props = { params: Promise<{ locale: string }> };
const copy = { zh: ["新闻动态", "公司动态、产品资料更新与通信能源领域技术观察。"], en: ["News & insights", "Company updates, product-data releases, and technical perspectives on communications and energy."], ru: ["Новости и материалы", "Новости компании, обновления данных и технические материалы о связи и энергетике."] } as const;
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; assertLocale(locale); return localizedMetadata(locale, "/news", copy[locale][0], copy[locale][1]); }
export default async function Page({ params }: Props) { const { locale } = await params; assertLocale(locale); const [items, common] = await Promise.all([getEditorial(locale, "news"), getTranslations({ locale, namespace: "common" })]); return <EditorialIndex locale={locale} eyebrow="News" title={copy[locale][0]} description={copy[locale][1]} basePath="/news" items={items} detailsLabel={common("details")} />; }
