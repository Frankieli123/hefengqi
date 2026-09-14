import type { Metadata } from "next";
import { SupportHub } from "@/components/support/support-hub";
import { JsonLd } from "@/components/json-ld";
import { supportCopy } from "@/content/support";
import { assertLocale } from "@/lib/locale";
import { getSupportData } from "@/lib/support-repository";
import { readSupportQuery, SUPPORT_PATH } from "@/lib/support";
import { breadcrumbSchema, collectionPageSchema, localizedMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  const copy = supportCopy[locale];
  const query = readSupportQuery(await searchParams);
  return localizedMetadata(locale, SUPPORT_PATH, copy.title, copy.description, Boolean(query.q || query.brand || query.type || query.page > 1));
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  const [data, query] = await Promise.all([getSupportData(locale), searchParams.then(readSupportQuery)]);
  const copy = supportCopy[locale];
  return <><JsonLd data={[collectionPageSchema(locale, SUPPORT_PATH, copy.title, copy.description), breadcrumbSchema([{ name: copy.home, path: `/${locale}` }, { name: copy.support, path: `/${locale}${SUPPORT_PATH}` }])]} /><SupportHub locale={locale} {...data} query={query} /></>;
}
