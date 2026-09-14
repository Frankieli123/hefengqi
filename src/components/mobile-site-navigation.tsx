import Image from "next/image";

type MobileNavItem = {
  href: string;
  label: string;
};

type MobileSiteNavigationProps = {
  brand: string;
  slogan: string;
  menuLabel: string;
  closeLabel: string;
  navigationLabel: string;
  inquiryLabel: string;
  locale: string;
  links: MobileNavItem[];
};

const menuId = "mobile-site-menu";

function localizedHref(locale: string, href: string) {
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

function MenuIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

function ChevronIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>;
}

export function MobileSiteNavigation({ brand, slogan, menuLabel, closeLabel, navigationLabel, inquiryLabel, locale, links }: MobileSiteNavigationProps) {
  return <>
    <button type="button" className="mobile-site-menu-trigger xl:hidden" aria-label={menuLabel} aria-haspopup="dialog" popoverTarget={menuId}>
      <MenuIcon />
    </button>
    <aside id={menuId} className="mobile-site-menu xl:hidden" popover="auto" role="dialog" aria-label={navigationLabel}>
      <header className="mobile-site-menu-header">
        <a href={`/${locale}`} className="mobile-site-menu-brand" aria-label={brand}>
          <Image src="/brand/hefengqi-mark.png" alt="" aria-hidden width={42} height={42} className="mobile-site-menu-logo" />
          <span translate="no">RICEWIND</span>
        </a>
        <p className="mobile-site-menu-slogan">{slogan}</p>
        <button type="button" className="mobile-site-menu-close" aria-label={closeLabel} popoverTarget={menuId} popoverTargetAction="hide"><CloseIcon /></button>
      </header>
      <nav className="mobile-site-menu-nav" aria-label={navigationLabel}>
        {links.map((item) => <a href={localizedHref(locale, item.href)} className="mobile-site-menu-link" key={item.href}><span>{item.label}</span><ChevronIcon /></a>)}
      </nav>
      <div className="mobile-site-menu-footer"><a href={`/${locale}/contact`} className="mobile-site-menu-inquiry">{inquiryLabel}</a></div>
    </aside>
  </>;
}
