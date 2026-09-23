import { Globe2Icon, MailIcon, PhoneIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MobileSiteNavigation } from "@/components/mobile-site-navigation";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { SiteHeaderFrame } from "@/components/site-header-frame";
import { SiteNavLink } from "@/components/site-nav-link";
import { SiteHeaderSearch } from "@/components/site-header-search";
import { CopyEmailButton } from "@/components/copy-email-button";
import type { Locale } from "@/types/domain";

const links = ["home", "products", "solutions", "support", "news", "about", "contact"] as const;
const linkHref = (key: typeof links[number]) => key === "home" ? "/" : key === "support" ? "/support/troubleshooting" : `/${key}`;

export async function SiteHeader() {
  const [t, locale] = await Promise.all([getTranslations("common"), getLocale()]);
  return (
    <SiteHeaderFrame>
      <div className="site-utility-bar">
        <div className="site-header-shell site-utility-inner">
          <CopyEmailButton locale={locale as Locale} email="lee@ricewind.com" className="site-utility-email-copy"><MailIcon aria-hidden="true" />lee@ricewind.com</CopyEmailButton>
          <a href="tel:+8617621197907"><PhoneIcon aria-hidden="true" /><span>{t("phoneLabel")}</span><bdi dir="ltr">+86 17621197907</bdi></a>
          <span className="site-utility-service"><Globe2Icon aria-hidden="true" />{t("serviceCountries")}</span>
        </div>
      </div>
      <SiteHeaderSearch
        brand={<BrandMark />}
        navigation={<nav className="site-primary-nav hidden h-full items-center gap-3 xl:flex 2xl:gap-6" aria-label="Main navigation">{links.map((key) => <SiteNavLink key={key} href={linkHref(key)}>{t(key)}</SiteNavLink>)}</nav>}
        locale={locale}
        searchLabel={t("search")}
        searchPlaceholder={t("searchPlaceholder")}
        closeLabel={t("closeSearch")}
        popularLabel={t("popularLinks")}
        popularLinks={links.slice(1, 6).map((key) => ({ href: linkHref(key), label: t(key) }))}
        actions={<>
          <LanguageSwitcher label={t("language")} />
          <Button className="hidden px-3 sm:inline-flex" nativeButton={false} render={<Link href="/contact" />}>{t("inquiry")}</Button>
          <MobileSiteNavigation
            brand={t("brand")}
            slogan={t("slogan")}
            menuLabel="Menu"
            closeLabel={t("closeMenu")}
            navigationLabel="Mobile navigation"
            inquiryLabel={t("inquiry")}
            locale={locale}
            links={links.map((key) => ({ href: linkHref(key), label: t(key) }))}
          />
        </>}
      />
    </SiteHeaderFrame>
  );
}
