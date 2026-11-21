import { Mail, Phone } from "lucide-react";
import { languageLabel } from "@/lib/language-label";
import { getLocale, getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/brand-mark";
import { Link } from "@/i18n/navigation";
import { Separator } from "@/components/ui/separator";
import { CopyEmailButton } from "@/components/copy-email-button";
import { getCategories } from "@/lib/content-repository";
import type { Locale } from "@/types/domain";

export async function SiteFooter() {
  const [t, locale] = await Promise.all([getTranslations("common"), getLocale()]);
  const categories = (await getCategories(locale as Locale)).filter((category) => category.level === 1 && !category.parentKey);
  const isZh = locale === "zh";
  const companyName = isZh ? "杭州禾风起通信技术有限公司" : "Hangzhou Ricewind Technology Co., Ltd.";

  return (
    <footer className={`site-footer bg-ink text-ink-foreground${locale === "ar" ? " is-arabic" : ""}`}>
      <div className="page-shell grid gap-x-10 gap-y-12 py-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.35fr_1fr_1.2fr_1.45fr_1fr]">
        <div className="site-footer-brand flex min-w-0 max-w-md flex-col gap-5">
          <BrandMark />
          <div className="flex flex-col gap-1 text-sm leading-7 text-ink-muted">
            <p>{t("footerTagline")}</p>
            <p className="text-xs leading-5">{t("footerAddress")}</p>
            <p className="text-xs leading-5">{t("serviceCountries")}</p>
          </div>
        </div>
        <nav className="flex flex-col gap-3 text-sm" aria-label={t("footerQuickLinks")}>
          <strong className="mb-1 text-ink-foreground">{t("footerQuickLinks")}</strong>
          <Link href="/solutions">{t("solutions")}</Link>
          <Link href="/news">{t("news")}</Link>
          <Link href="/support/troubleshooting">{t("support")}</Link>
          <Link href="/about">{t("about")}</Link>
        </nav>
        <nav className="flex min-w-0 flex-col gap-3 text-sm" aria-label={t("footerProducts")}>
          <strong className="mb-1 text-ink-foreground">{t("footerProducts")}</strong>
          {categories.length ? categories.map((category) => <Link className="line-clamp-2" href={`/products/category/${category.path}`} key={category.key}>{category.name}</Link>) : <Link href="/products">{t("products")}</Link>}
        </nav>
        <div className="site-footer-contact flex min-w-0 flex-col gap-3 text-sm" aria-labelledby="footer-contact-title">
          <strong id="footer-contact-title" className="mb-1 text-ink-foreground">{t("footerContact")}</strong>
          <CopyEmailButton locale={locale as Locale} email="lee@ricewind.com" className="site-footer-contact-value inline-flex items-center gap-2 rounded-sm transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current site-footer-email-copy break-all"><Mail aria-hidden="true" data-contact-icon="mail" className="h-4 w-4 shrink-0" /><span>lee@ricewind.com</span></CopyEmailButton>
          <CopyEmailButton locale={locale as Locale} email="cheng@ricewind.com" className="site-footer-contact-value inline-flex items-center gap-2 rounded-sm transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current site-footer-email-copy break-all"><Mail aria-hidden="true" data-contact-icon="mail" className="h-4 w-4 shrink-0" /><span>cheng@ricewind.com</span></CopyEmailButton>
          <a className="site-footer-contact-value inline-flex items-center gap-2 rounded-sm transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current" href="tel:+8617621197907"><Phone aria-hidden="true" data-contact-icon="phone" className="h-4 w-4 shrink-0" /><span>{t("phoneLabel")}</span> <bdi dir="ltr">+86 17621197907</bdi></a>
          <a className="site-footer-contact-value inline-flex items-center gap-2 rounded-sm transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current" href="https://wa.me/8617621197907" target="_blank" rel="noopener noreferrer"><svg aria-hidden="true" focusable="false" data-contact-icon="whatsapp" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.59 5.96L.06 24l6.29-1.65a11.9 11.9 0 0 0 5.7 1.45h.01c6.56 0 11.9-5.34 11.9-11.9a11.82 11.82 0 0 0-3.44-8.42ZM12.06 21.8a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.73.98.99-3.64-.24-.38a9.85 9.85 0 0 1-1.51-5.27c0-5.45 4.44-9.89 9.9-9.89a9.82 9.82 0 0 1 7 2.9 9.84 9.84 0 0 1 2.89 7c0 5.45-4.44 9.89-9.91 9.89Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37s-1.04 1.01-1.04 2.47 1.06 2.87 1.21 3.07c.15.2 2.09 3.19 5.06 4.47.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z" /></svg><span dir="ltr">WhatsApp</span> <bdi dir="ltr">+8617621197907</bdi></a>
          <a className="site-footer-contact-value inline-flex items-center gap-2 rounded-sm transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current" href="https://www.facebook.com/profile.php?id=61594261613869" target="_blank" rel="noopener noreferrer"><svg aria-hidden="true" focusable="false" data-contact-icon="facebook" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.095 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971h-1.513c-1.491 0-1.956.931-1.956 1.887v2.263h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.1 24 12.073Z" /></svg><span dir="ltr">Facebook</span></a>
        </div>
        <nav className="flex flex-col gap-3 text-sm" aria-label={t("footerRules")}>
          <strong className="mb-1 text-ink-foreground">{t("footerRules")}</strong>
          <Link href="/privacy">{t("privacy")}</Link>
          <Link href="/terms">{t("terms")}</Link>
        </nav>
      </div>
      <div className="page-shell">
        <nav data-language-homes="true" aria-label={t("language")} className="flex flex-wrap gap-x-5 gap-y-2 pb-6 text-xs text-ink-muted">
          {([ ["en", "English"], ["ru", "Русский"], ["fr", "Français"], ["de", "Deutsch"], ["es", "Español"], ["ar", "العربية"], ["zh", "中文"] ] as const).map(([code, name]) => <a key={code} href={`/${code}`} hrefLang={code} lang={code} aria-current={locale === code ? "page" : undefined}>{languageLabel(code, locale as Locale, name)}</a>)}
        </nav>
        <Separator className="bg-ink-border" />
        <div className="flex flex-col justify-between gap-3 py-6 text-xs text-ink-muted sm:flex-row">
          <span>© {new Date().getUTCFullYear()} {companyName}. {t("allRights")}</span>
          {isZh ? (
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer noopener" className="transition-colors hover:text-ink-foreground">
              浙ICP备2025193354号-1
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
