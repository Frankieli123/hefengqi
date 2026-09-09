import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";
import { Analytics } from "@/components/analytics";
import { JsonLd } from "@/components/json-ld";
import { env } from "@/lib/env";

const siteUrl = env.SITE_URL;
const skipLabels = { zh: "跳到主要内容", en: "Skip to main content", ru: "Перейти к основному содержанию" } as const;

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <NextIntlClientProvider><div className="public-site min-h-screen"><JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: "HEFENGQI", url: `${siteUrl}/${locale}`, inLanguage: locale }} /><a className="skip-link" href="#main-content">{skipLabels[locale]}</a><SiteHeader />{children}<SiteFooter /><Analytics /></div></NextIntlClientProvider>;
}
