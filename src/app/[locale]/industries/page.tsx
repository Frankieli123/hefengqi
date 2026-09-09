import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EditorialIndex } from "@/components/editorial/editorial-index";
import { getEditorial } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";
type Props = { params: Promise<{ locale: string }> };
const copy = { zh: ["行业应用", "为通信基础设施、数据机房与关键能源场景整理清晰的产品与方案信息。"], en: ["Industries", "Clear product and solution information for communications infrastructure, data facilities, and critical energy."], ru: ["Отрасли", "Понятные данные о продукции и решениях для связи, ЦОД и критической энергетики."] } as const;
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; assertLocale(locale); return localizedMetadata(locale, "/industries", copy[locale][0], copy[locale][1]); }
export default async function Page({ params }: Props) { const { locale } = await params; assertLocale(locale); const [items, common] = await Promise.all([getEditorial(locale, "industries"), getTranslations({ locale, namespace: "common" })]); return <EditorialIndex locale={locale} eyebrow="Industries" title={copy[locale][0]} description={copy[locale][1]} basePath="/industries" items={items} detailsLabel={common("details")} />; }
