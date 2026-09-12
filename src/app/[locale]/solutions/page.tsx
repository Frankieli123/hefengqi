import type { Metadata } from "next";
import { IndustriesLanding } from "@/components/editorial/industries-landing";
import { getEditorial } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

const copy = {
  zh: ["解决方案", "面向数据中心、电信与 5G、医疗设施及工业制造场景，提供连续供电、热管理、通信与运维一体化解决方案。"],
  en: ["Solutions", "Integrated power, thermal management, communications, and operations solutions for data centers, telecom and 5G, healthcare, and manufacturing."],
  ru: ["Решения", "Комплексные решения для электропитания, охлаждения, связи и эксплуатации ЦОД, телекоммуникаций и 5G, медицины и промышленности."],
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  return localizedMetadata(locale, "/solutions", copy[locale][0], copy[locale][1]);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  const items = await getEditorial(locale, "industries");
  return <IndustriesLanding locale={locale} title={copy[locale][0]} description={copy[locale][1]} items={items} basePath="/solutions" />;
}
