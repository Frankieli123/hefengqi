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

const links = ["home", "products", "solutions", "news", "about", "contact"] as const;

export async function SiteHeader() {
  const [t, locale] = await Promise.all([getTranslations("common"), getLocale()]);
  return (
    <SiteHeaderFrame>
      <div className="site-utility-bar">
        <div className="site-header-shell site-utility-inner">
          <a href="mailto:3180623@gmail.com"><MailIcon aria-hidden="true" />3180623@gmail.com</a>
          <a href="tel:+8617621197907"><PhoneIcon aria-hidden="true" />{t("phoneLabel")} +86 17621197907</a>
          <span className="site-utility-service"><Globe2Icon aria-hidden="true" />{t("serviceCountries")}</span>
        </div>
      </div>
      <SiteHeaderSearch
        brand={<BrandMark />}
        navigation={<nav className="hidden h-full items-center gap-8 xl:flex" aria-label="Main navigation">{links.map((key) => <SiteNavLink key={key} href={key === "home" ? "/" : `/${key}`}>{t(key)}</SiteNavLink>)}</nav>}
        locale={locale}
        searchLabel={t("search")}
        searchPlaceholder={t("searchPlaceholder")}
        closeLabel={t("closeSearch")}
        popularLabel={t("popularLinks")}
        popularLinks={links.slice(1, 5).map((key) => ({ href: `/${key}`, label: t(key) }))}
        actions={<>
          <LanguageSwitcher label={t("language")} />
          <Button className="hidden sm:inline-flex" nativeButton={false} render={<Link href="/contact" />}>{t("inquiry")}</Button>
          <MobileSiteNavigation
            brand={t("brand")}
            slogan={t("slogan")}
            menuLabel="Menu"
            navigationLabel="Mobile navigation"
            inquiryLabel={t("inquiry")}
            links={links.map((key) => ({ href: key === "home" ? "/" : `/${key}`, label: t(key) }))}
          />
        </>}
      />
    </SiteHeaderFrame>
  );
}
