import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { IndustriesLanding } from "@/components/editorial/industries-landing";
import { getEditorial } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";
import type { Locale } from "@/types/domain";

type Props = { params: Promise<{ locale: string }> };

const copy: Record<Locale, readonly [string, string]> = {
  zh: ["解决方案", "面向数据中心、电信与 5G、医疗设施及工业制造场景，提供连续供电、热管理、通信与运维一体化解决方案。"],
  en: ["Solutions", "Integrated power, thermal management, communications, and operations solutions for data centers, telecom and 5G, healthcare, and manufacturing."],
  ru: ["Решения", "Комплексные решения для электропитания, охлаждения, связи и эксплуатации ЦОД, телекоммуникаций и 5G, медицины и промышленности."],
  fr: ["Solutions", "Solutions intégrées d'alimentation, de gestion thermique, de télécommunications et d'exploitation pour centres de données, 5G, santé et industrie."],
  de: ["Lösungen", "Integrierte Lösungen für Stromversorgung, Wärmemanagement, Telekommunikation und Betrieb für Rechenzentren, 5G, Gesundheitswesen und Industrie."],
  es: ["Soluciones", "Soluciones integradas de energía, control térmico, comunicaciones y operaciones para centros de datos, 5G, salud y manufactura."],
  ar: ["الحلول الهندسية", "حلول متكاملة للتغذية الكهربائية، والإدارة الحرارية، والاتصالات والتشغيل لمراكز البيانات وشبكات 5G والمنشآت الصحية والصناعية."]
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const content = copy[locale];
  return localizedMetadata(locale, "/solutions", content[0], content[1]);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  const items = await getEditorial(locale, "industries");
  const content = copy[locale];
  return <IndustriesLanding locale={locale} title={content[0]} description={content[1]} items={items} basePath="/solutions" />;
}
