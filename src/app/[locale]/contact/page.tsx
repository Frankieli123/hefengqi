import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InquiryForm } from "@/components/inquiry/inquiry-form";
import { JsonLd } from "@/components/json-ld";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata, webPageSchema } from "@/lib/seo";
import { env } from "@/lib/env";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ productId?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; assertLocale(locale); const t = await getTranslations({ locale, namespace: "inquiry" }); return localizedMetadata(locale, "/contact", t("title"), t("description")); }
export default async function ContactPage({ params, searchParams }: Props) { const { locale } = await params; assertLocale(locale); setRequestLocale(locale); const [{ productId }, t] = await Promise.all([searchParams, getTranslations("inquiry")]); const labels = { name: t("name"), company: t("company"), email: t("email"), phone: t("phone"), country: t("country"), quantity: t("quantity"), requirements: t("requirements"), privacy: t("privacy"), submit: t("submit"), sending: t("sending"), success: t("success"), reference: t("reference"), error: t("error") }; return <main id="main-content" className="page-shell section-pad"><JsonLd data={webPageSchema(locale, "/contact", t("title"), t("description"), "ContactPage")} /><div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]"><div className="flex flex-col gap-6"><span className="eyebrow">Contact</span><h1 className="section-title">{t("title")}</h1><p className="text-lg leading-8 text-muted-foreground">{t("description")}</p><div className="border-t pt-6 text-sm leading-7 text-muted-foreground"><p>Sales email and company address are configured from verified site settings before launch.</p></div></div><InquiryForm locale={locale} productId={productId} labels={labels} turnstileSiteKey={env.TURNSTILE_SITE_KEY} /></div></main>; }
