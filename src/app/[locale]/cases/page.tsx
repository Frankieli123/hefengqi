import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EditorialIndex } from "@/components/editorial/editorial-index";
import { getEditorial } from "@/lib/content-repository";
import { assertLocale, coreContentLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";
type Props = { params: Promise<{ locale: string }> };
const copy = { zh: ["客户案例", "只发布经过授权且可核验的项目背景、实施方法与结果。"], en: ["Case studies", "Only authorized and verifiable project context, delivery methods, and outcomes are published."], ru: ["Проекты", "Публикуются только разрешённые и проверяемые сведения, методы и результаты проектов."] } as const;
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; assertLocale(locale); const content = copy[coreContentLocale(locale)]; return localizedMetadata(locale, "/cases", content[0], content[1]); }
export default async function Page({ params }: Props) { const { locale } = await params; assertLocale(locale); const [items, common] = await Promise.all([getEditorial(locale, "cases"), getTranslations({ locale, namespace: "common" })]); const content = copy[coreContentLocale(locale)]; return <EditorialIndex locale={locale} eyebrow="Cases" title={content[0]} description={content[1]} basePath="/cases" items={items} detailsLabel={common("details")} />; }
