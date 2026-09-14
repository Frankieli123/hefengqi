import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InquiryForm } from "@/components/inquiry/inquiry-form";
import { JsonLd } from "@/components/json-ld";
import { supportCopy } from "@/content/support";
import { getCategories, getProductById } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata, webPageSchema } from "@/lib/seo";
import { supportDevicePath } from "@/lib/support";
import { env } from "@/lib/env";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ productId?: string; support?: string; alarm?: string; version?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  const t = await getTranslations({ locale, namespace: "inquiry" });
  return localizedMetadata(locale, "/contact", t("title"), t("description"));
}

export default async function ContactPage({ params, searchParams }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const [query, t, categories] = await Promise.all([searchParams, getTranslations("inquiry"), getCategories(locale)]);
  const productId = typeof query.productId === "string" ? query.productId : undefined;
  const isSupport = query.support === "1";
  const selectedProduct = productId ? await getProductById(locale, productId) : undefined;
  const copy = supportCopy[locale];
  const title = isSupport ? copy.inquirySubject : t("title");
  const description = isSupport ? copy.contactDescription : t("description");
  const initialRequirements = isSupport ? [
    copy.inquirySubject,
    `${copy.brand}: ${selectedProduct?.brand ?? ""}`,
    `${copy.model}: ${selectedProduct?.model ?? ""}`,
    `${copy.version}: ${typeof query.version === "string" ? query.version.slice(0, 160) : ""}`,
    `${copy.alarmLabel}: ${typeof query.alarm === "string" ? query.alarm.slice(0, 1200) : ""}`,
    ...(selectedProduct ? [`${copy.inquiryPage}: ${new URL(`/${locale}${supportDevicePath(selectedProduct)}`, env.SITE_URL)}`] : []),
  ].join("\n") : undefined;
  const initialInterestedCategoryId = categories.find((category) => category.key === selectedProduct?.categoryKey)?.id;
  const categoriesByKey = new Map(categories.map((category) => [category.key, category]));
  const categoryOptions = categories.map((category) => {
    const names = [category.name];
    const visited = new Set([category.key]);
    let parentKey = category.parentKey;
    while (parentKey && !visited.has(parentKey)) {
      visited.add(parentKey);
      const parent = categoriesByKey.get(parentKey);
      if (!parent) break;
      names.unshift(parent.name);
      parentKey = parent.parentKey;
    }
    return { id: category.id, name: names.join(" / ") };
  });
  const labels = {
    name: t("name"), email: t("email"), phone: t("phone"), country: t("country"),
    interestedProduct: t("interestedProduct"), selectProduct: t("selectProduct"),
    requirements: t("requirements"), requirementsHint: t("requirementsHint"), privacy: t("privacy"),
    submit: t("submit"), sending: t("sending"), success: t("success"), reference: t("reference"), error: t("error"),
    validation: {
      name: t("validation.name"), email: t("validation.email"), country: t("validation.country"),
      interestedCategoryId: t("validation.interestedProduct"), requirements: t("validation.requirements"),
      privacyConsent: t("validation.privacy"),
    },
  };

  return <main id="main-content" className="page-shell section-pad">
    <JsonLd data={webPageSchema(locale, "/contact", title, description, "ContactPage")} />
    <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
      <div className="flex flex-col gap-6"><h1 className="section-title heading-underlined heading-underlined-left">{title}</h1><p className="text-lg leading-8 text-muted-foreground">{description}</p><div className="border-t pt-6 text-sm leading-7 text-muted-foreground"><p>{t("contactNote")}</p></div></div>
      <InquiryForm key={initialRequirements ?? productId ?? "general"} locale={locale} productId={productId} initialRequirements={initialRequirements} initialInterestedCategoryId={initialInterestedCategoryId} categories={categoryOptions} labels={labels} turnstileSiteKey={env.TURNSTILE_SITE_KEY} />
    </div>
  </main>;
}
