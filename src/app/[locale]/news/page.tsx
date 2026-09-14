import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EditorialIndex } from "@/components/editorial/editorial-index";
import { getEditorial } from "@/lib/content-repository";
import { assertLocale, coreContentLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";
import type { NewsCategory } from "@/types/domain";

type Props = { params: Promise<{ locale: string }> };

const copy = {
  zh: ["新闻动态", "公司动态、产品资料更新与通信能源领域技术观察。"],
  en: ["News & insights", "Company updates, product-data releases, and technical perspectives on communications and energy."],
  ru: ["Новости и материалы", "Новости компании, обновления данных и технические материалы о связи и энергетике."],
} as const;

const categoryCopy = {
  zh: {
    emptyLabel: "该分类暂时没有已发布的文章。",
    categories: [["ALL", "全部"], ["INDUSTRY_INSIGHTS", "行业洞察"], ["BUYING_GUIDE", "选购指南"], ["TUTORIAL_GUIDE", "教程指南"]],
  },
  en: {
    emptyLabel: "There are no published articles in this category yet.",
    categories: [["ALL", "All"], ["INDUSTRY_INSIGHTS", "Industry insights"], ["BUYING_GUIDE", "Buying guides"], ["TUTORIAL_GUIDE", "How-to guides"]],
  },
  ru: {
    emptyLabel: "В этой категории пока нет опубликованных материалов.",
    categories: [["ALL", "Все"], ["INDUSTRY_INSIGHTS", "Отраслевые обзоры"], ["BUYING_GUIDE", "Руководства по выбору"], ["TUTORIAL_GUIDE", "Практические руководства"]],
  },
} as const;

type NewsCategoryFilter = "ALL" | NewsCategory;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  const content = copy[coreContentLocale(locale)];
  return localizedMetadata(locale, "/news", content[0], content[1]);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  const [items, common] = await Promise.all([getEditorial(locale, "news"), getTranslations({ locale, namespace: "common" })]);
  const contentLocale = coreContentLocale(locale);
  const content = copy[contentLocale];
  const category = categoryCopy[contentLocale];
  return <EditorialIndex locale={locale} eyebrow="News" title={content[0]} description={content[1]} basePath="/news" items={items} detailsLabel={common("details")} newsCategories={category.categories.map(([value, label]) => ({ value: value as NewsCategoryFilter, label }))} newsEmptyLabel={category.emptyLabel} />;
}
