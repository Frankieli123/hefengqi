import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EditorialIndex } from "@/components/editorial/editorial-index";
import { getEditorial } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };
const copy = { zh: ["解决方案", "围绕现场输入、负载、空间、备电与维护约束组织设备选型。"], en: ["Solutions", "Equipment selection organized around site input, load, space, backup, and maintenance constraints."], ru: ["Решения", "Подбор оборудования с учётом ввода, нагрузки, пространства, резерва и обслуживания."] } as const;
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; assertLocale(locale); return localizedMetadata(locale, "/solutions", copy[locale][0], copy[locale][1]); }
export default async function Page({ params }: Props) { const { locale } = await params; assertLocale(locale); const [items, common] = await Promise.all([getEditorial(locale, "solutions"), getTranslations({ locale, namespace: "common" })]); return <EditorialIndex locale={locale} eyebrow="Solutions" title={copy[locale][0]} description={copy[locale][1]} basePath="/solutions" items={items} detailsLabel={common("details")} />; }
