import { Globe2Icon, MailIcon, MenuIcon, PhoneIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { SiteHeaderFrame } from "@/components/site-header-frame";
import { SiteNavLink } from "@/components/site-nav-link";
import { SiteHeaderSearch } from "@/components/site-header-search";

const links = ["home", "products", "solutions", "industries", "cases", "news", "about"] as const;

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
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="xl:hidden" aria-label="Menu" />}><MenuIcon /></SheetTrigger>
            <SheetContent side="right">
              <SheetHeader><SheetTitle>{t("brand")}</SheetTitle><SheetDescription>{t("products")}</SheetDescription></SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Mobile navigation">{links.map((key) => <Button key={key} variant="ghost" nativeButton={false} render={<Link href={key === "home" ? "/" : `/${key}`} className="justify-start" />}>{t(key)}</Button>)}<Button nativeButton={false} render={<Link href="/contact" />}>{t("inquiry")}</Button></nav>
            </SheetContent>
          </Sheet>
        </>}
      />
    </SiteHeaderFrame>
  );
}
