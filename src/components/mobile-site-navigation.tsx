"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronRightIcon, MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";

type MobileNavItem = {
  href: string;
  label: string;
};

type MobileSiteNavigationProps = {
  brand: string;
  slogan: string;
  menuLabel: string;
  navigationLabel: string;
  inquiryLabel: string;
  links: MobileNavItem[];
};

export function MobileSiteNavigation({ brand, slogan, menuLabel, navigationLabel, inquiryLabel, links }: MobileSiteNavigationProps) {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="xl:hidden" aria-label={menuLabel} />}>
        <MenuIcon aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="right" className="mobile-site-menu">
        <SheetHeader className="mobile-site-menu-header">
          <SheetTitle className="sr-only">{brand}</SheetTitle>
          <Link href="/" className="mobile-site-menu-brand" aria-label={brand} onClick={closeMenu}>
            <Image src="/brand/hefengqi-mark.png" alt="" aria-hidden width={42} height={42} className="mobile-site-menu-logo" />
            <span translate="no">RICEWIND</span>
          </Link>
          <SheetDescription className="mobile-site-menu-slogan">{slogan}</SheetDescription>
        </SheetHeader>

        <nav className="mobile-site-menu-nav" aria-label={navigationLabel}>
          {links.map((item) => (
            <Link href={item.href} className="mobile-site-menu-link" onClick={closeMenu} key={item.href}>
              <span>{item.label}</span>
              <ChevronRightIcon aria-hidden="true" />
            </Link>
          ))}
        </nav>

        <div className="mobile-site-menu-footer">
          <Link href="/contact" className="mobile-site-menu-inquiry" onClick={closeMenu}>{inquiryLabel}</Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
