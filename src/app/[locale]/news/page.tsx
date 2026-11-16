import type { Metadata } from "next";
import { getTranslations , setRequestLocale } from "next-intl/server";
import { EditorialIndex } from "@/components/editorial/editorial-index";
import { getEditorialSummaries } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";
import type { Locale, NewsCategory } from "@/types/domain";

type Props = { params: Promise<{ locale: string }> };

const copy: Record<Locale, readonly [string, string]> = {
  zh: ["新闻动态", "公司动态、产品资料更新与通信能源领域技术观察。"],
  en: ["News & insights", "Company updates, product-data releases, and technical perspectives on communications and energy."],
  ru: ["Новости и материалы", "Новости компании, обновления данных и технические материалы о связи и энергетике."],
  fr: ["Actualités & perspectives", "Mises à jour de l'entreprise, documentation technique et analyses du secteur des télécoms et de l'énergie."],
  de: ["Nachrichten & Einblicke", "Unternehmens-Updates, Produktdatenblätter und technische Analysen zu Telekommunikations- und Energiesystemen."],
  es: ["Noticias y perspectivas", "Actualizaciones de la empresa, fichas técnicas y análisis sobre telecomunicaciones y energía."],
  ar: ["الأخبار والرؤى", "تحديثات الشركة وبيانات المنتجات والرؤى الفنية حول الاتصالات والطاقة."],
};

const categoryCopy: Record<Locale, { emptyLabel: string; categories: readonly (readonly [string, string])[] }> = {
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
  fr: {
    emptyLabel: "Aucun article publié dans cette catégorie pour le moment.",
    categories: [["ALL", "Tous"], ["INDUSTRY_INSIGHTS", "Perspectives de l'industrie"], ["BUYING_GUIDE", "Guides d'achat"], ["TUTORIAL_GUIDE", "Guides pratiques"]],
  },
  de: {
    emptyLabel: "In dieser Kategorie wurden noch keine Artikel veröffentlicht.",
    categories: [["ALL", "Alle"], ["INDUSTRY_INSIGHTS", "Brancheneinblicke"], ["BUYING_GUIDE", "Kaufberatung"], ["TUTORIAL_GUIDE", "Anleitungen"]],
  },
  es: {
    emptyLabel: "No hay artículos publicados en esta categoría todavía.",
    categories: [["ALL", "Todos"], ["INDUSTRY_INSIGHTS", "Perspectivas del sector"], ["BUYING_GUIDE", "Guías de compra"], ["TUTORIAL_GUIDE", "Guías prácticas"]],
  },
  ar: {
    emptyLabel: "لا توجد مقالات منشورة في هذا القسم حتى الآن.",
    categories: [["ALL", "الكل"], ["INDUSTRY_INSIGHTS", "رؤى الصناعة"], ["BUYING_GUIDE", "دليل الشراء"], ["TUTORIAL_GUIDE", "دليل إرشادي"]],
  },
};

type NewsCategoryFilter = "ALL" | NewsCategory;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const content = copy[locale as Locale];
  return localizedMetadata(locale as Locale, "/news", content[0], content[1]);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  const [items, common] = await Promise.all([getEditorialSummaries(locale as Locale, "news"), getTranslations({ locale, namespace: "common" })]);
  const content = copy[locale as Locale];
  const category = categoryCopy[locale as Locale];
  return <EditorialIndex locale={locale as Locale} eyebrow="News" title={content[0]} description={content[1]} basePath="/news" items={items} detailsLabel={common("details")} newsCategories={category.categories.map(([value, label]) => ({ value: value as NewsCategoryFilter, label }))} newsEmptyLabel={category.emptyLabel} />;
}
