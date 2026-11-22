import { emptyCasesCopy } from "@/content/t4-hubs";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations , setRequestLocale } from "next-intl/server";
import { EditorialIndex } from "@/components/editorial/editorial-index";
import { getEditorialSummaries } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";
import type { Locale } from "@/types/domain";

type Props = { params: Promise<{ locale: string }> };

const copy: Record<Locale, readonly [string, string]> = {
  zh: ["客户案例", "只发布经过授权且可核验的项目背景、实施方法与结果。"],
  en: ["Case studies", "Only authorized and verifiable project context, delivery methods, and outcomes are published."],
  ru: ["Проекты", "Публикуются только разрешённые и проверяемые сведения, методы и результаты проектов."],
  fr: ["Études de cas", "Seuls les contextes de projet autorisés et vérifiables, les méthodes de réalisation et les résultats sont publiés."],
  de: ["Fallstudien", "Es werden ausschließlich autorisierte und überprüfbare Projektkontexte, Umsetzungsmethoden und Ergebnisse veröffentlicht."],
  es: ["Casos de éxito", "Solo se publican antecedentes de proyectos autorizados y verificables, métodos de ejecución y resultados obtenidos."],
  ar: ["دراسات الحالة والمشاريع", "ننشر فقط سياق المشاريع المعتمد والقابل للتحقق، وطرق التنفيذ والنتائج الميدانية المحققة."]
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const content = copy[locale];
  const items = await getEditorialSummaries(locale, "cases");
  return localizedMetadata(locale, "/cases", content[0], items.length ? content[1] : emptyCasesCopy[locale], items.length === 0);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  const [items, common] = await Promise.all([
    getEditorialSummaries(locale, "cases"),
    getTranslations({ locale, namespace: "common" })
  ]);
  const content = copy[locale];
  return (
    <>
    <EditorialIndex
      locale={locale}
      eyebrow="Cases"
      title={content[0]}
      description={items.length ? content[1] : emptyCasesCopy[locale]}
      basePath="/cases"
      items={items}
      detailsLabel={common("details")}
    />
    {!items.length ? <nav className="page-shell flex flex-wrap gap-6 py-8" aria-label={content[0]}><Link locale={locale} href="/products" className="underline">{common("products")}</Link><Link locale={locale} href="/solutions" className="underline">{common("solutions")}</Link></nav> : null}
    </>
  );
}
