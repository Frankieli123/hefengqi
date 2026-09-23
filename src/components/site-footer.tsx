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
          <CopyEmailButton locale={locale as Locale} email="lee@ricewind.com" className="site-footer-contact-value site-footer-email-copy break-all">lee@ricewind.com</CopyEmailButton>
          <CopyEmailButton locale={locale as Locale} email="cheng@ricewind.com" className="site-footer-contact-value site-footer-email-copy break-all">cheng@ricewind.com</CopyEmailButton>
          <a className="site-footer-contact-value" href="tel:+8617621197907"><span>{t("phoneLabel")}</span> <bdi dir="ltr">+86 17621197907</bdi></a>
          <a className="site-footer-contact-value" href="https://wa.me/8617621197907" target="_blank" rel="noopener noreferrer"><span dir="ltr">WhatsApp</span> <bdi dir="ltr">+8617621197907</bdi></a>
        </div>
        <nav className="flex flex-col gap-3 text-sm" aria-label={t("footerRules")}>
          <strong className="mb-1 text-ink-foreground">{t("footerRules")}</strong>
          <Link href="/privacy">{t("privacy")}</Link>
          <Link href="/terms">{t("terms")}</Link>
        </nav>
      </div>
      <div className="page-shell">
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
