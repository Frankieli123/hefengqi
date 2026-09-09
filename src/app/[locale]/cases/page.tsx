import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EditorialIndex } from "@/components/editorial/editorial-index";
import { getEditorial } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";
type Props = { params: Promise<{ locale: string }> };
const copy = { zh: ["客户案例", "只发布经过授权且可核验的项目背景、实施方法与结果。"], en: ["Case studies", "Only authorized and verifiable project context, delivery methods, and outcomes are published."], ru: ["Проекты", "Публикуются только разрешённые и проверяемые сведения, методы и результаты проектов."] } as const;
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; assertLocale(locale); return localizedMetadata(locale, "/cases", copy[locale][0], copy[locale][1]); }
export default async function Page({ params }: Props) { const { locale } = await params; assertLocale(locale); const [items, common] = await Promise.all([getEditorial(locale, "cases"), getTranslations({ locale, namespace: "common" })]); return <EditorialIndex locale={locale} eyebrow="Cases" title={copy[locale][0]} description={copy[locale][1]} basePath="/cases" items={items} detailsLabel={common("details")} />; }
