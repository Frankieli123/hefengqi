import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EditorialIndex } from "@/components/editorial/editorial-index";
import { getEditorial } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

const copy = {
  zh: ["新闻动态", "公司动态、产品资料更新与通信能源领域技术观察。"],
  en: ["News & insights", "Company updates, product-data releases, and technical perspectives on communications and energy."],
  ru: ["Новости и материалы", "Новости компании, обновления данных и технические материалы о связи и энергетике."],
} as const;

const categoryCopy = {
  zh: {
    navLabel: "新闻分类",
    emptyLabel: "该分类暂时没有已发布的文章。",
    introTitle: "聚焦技术变化与实际选型",
    introDescription: "围绕通信电源、数据中心、热管理与光通信等方向，整理行业趋势、产品选择和现场实践，为方案设计、采购决策与设备应用提供清晰参考。",
    categories: [["ALL", "全部"], ["INDUSTRY_INSIGHTS", "行业洞察"], ["BUYING_GUIDE", "选购指南"], ["TUTORIAL_GUIDE", "教程指南"]],
  },
  en: {
    navLabel: "News categories",
    emptyLabel: "There are no published articles in this category yet.",
    introTitle: "Technology context for practical selection",
    introDescription: "Coverage of telecom power, data centers, thermal management, and optical communications connects industry trends, buying considerations, and field practices with solution design, procurement, and equipment use.",
    categories: [["ALL", "All"], ["INDUSTRY_INSIGHTS", "Industry insights"], ["BUYING_GUIDE", "Buying guides"], ["TUTORIAL_GUIDE", "How-to guides"]],
  },
  ru: {
    navLabel: "Категории материалов",
    emptyLabel: "В этой категории пока нет опубликованных материалов.",
    introTitle: "Технологии и практический выбор оборудования",
    introDescription: "Материалы об электропитании связи, ЦОД, охлаждении и оптических сетях объединяют отраслевые тенденции, критерии выбора и практику эксплуатации для проектирования, закупки и применения оборудования.",
    categories: [["ALL", "Все"], ["INDUSTRY_INSIGHTS", "Отраслевые обзоры"], ["BUYING_GUIDE", "Руководства по выбору"], ["TUTORIAL_GUIDE", "Практические руководства"]],
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  return localizedMetadata(locale, "/news", copy[locale][0], copy[locale][1]);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  const [items, common] = await Promise.all([getEditorial(locale, "news"), getTranslations({ locale, namespace: "common" })]);
  const category = categoryCopy[locale];
  return <EditorialIndex locale={locale} eyebrow="News" title={copy[locale][0]} description={copy[locale][1]} basePath="/news" items={items} detailsLabel={common("details")} newsCategories={category.categories.map(([value, label]) => ({ value, label }))} newsNavLabel={category.navLabel} newsEmptyLabel={category.emptyLabel} newsIntroTitle={category.introTitle} newsIntroDescription={category.introDescription} />;
}
