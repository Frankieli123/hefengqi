import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupportDevice } from "@/components/support/support-device";
import { JsonLd } from "@/components/json-ld";
import { supportCopy } from "@/content/support";
import { assertLocale } from "@/lib/locale";
import { getSupportData } from "@/lib/support-repository";
import { equipmentCategory, findSupportDevice, relatedSupportArticles, SUPPORT_PATH, supportDevicePath } from "@/lib/support";
import { breadcrumbSchema, localizedMetadata, webPageSchema } from "@/lib/seo";
import type { Locale } from "@/types/domain";

type Props = { params: Promise<{ locale: string; brand: string; model: string }> };

async function findDevice(locale: Locale, brand: string, model: string) {
  const data = await getSupportData(locale);
  const product = findSupportDevice(data.products, brand, model);
  if (!product) notFound();
  return { ...data, product };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, brand, model } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const { product } = await findDevice(locale, brand, model);
  // Keep device scaffolds out of the index until model-specific manuals are reviewed.
  return localizedMetadata(locale, supportDevicePath(product), `${product.model} — ${supportCopy[locale].detailSuffix}`, product.directDefinition, true);
}

export default async function Page({ params }: Props) {
  const { locale, brand, model } = await params;
  assertLocale(locale);
  const { product, categories, articles } = await findDevice(locale, brand, model);
  const copy = supportCopy[locale];
  return <><JsonLd data={[webPageSchema(locale, supportDevicePath(product), `${product.model} — ${copy.detailSuffix}`, product.directDefinition), breadcrumbSchema([{ name: copy.home, path: `/${locale}` }, { name: copy.support, path: `/${locale}${SUPPORT_PATH}` }, { name: product.model, path: `/${locale}${supportDevicePath(product)}` }])]} /><SupportDevice locale={locale} product={product} categoryName={equipmentCategory(product, categories).name} articles={relatedSupportArticles(product, articles)} /></>;
}
