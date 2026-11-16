"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRightIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";

type PopularLink = {
  href: string;
  label: string;
};

type Props = {
  brand: ReactNode;
  navigation: ReactNode;
  actions: ReactNode;
  locale: string;
  searchLabel: string;
  searchPlaceholder: string;
  closeLabel: string;
  popularLabel: string;
  popularLinks: PopularLink[];
};

export function SiteHeaderSearch({ brand, navigation, actions, locale, searchLabel, searchPlaceholder, closeLabel, popularLabel, popularLinks }: Props) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    document.documentElement.dataset.siteSearch = "open";
    const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));

    function handlePointerDown(event: PointerEvent) {
      if (!formRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      delete document.documentElement.dataset.siteSearch;
    };
  }, [open]);

  function closeSearch() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function openSearch() {
    const stage = triggerRef.current?.closest(".site-header-stage");
    if (stage && triggerRef.current && formRef.current) {
      const stageRect = stage.getBoundingClientRect();
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const triggerRight = triggerRect.right - stageRect.left;
      const fieldWidth = Math.min(500, Math.max(320, triggerRight));
      const closeSpace = 56;
      const left = Math.max(0, triggerRight - fieldWidth);
      const width = Math.min(fieldWidth + closeSpace, stageRect.width - left);

      formRef.current.style.setProperty("--header-search-left", `${left}px`);
      formRef.current.style.setProperty("--header-search-width", `${width}px`);
    }
    setOpen(true);
  }

  return (
    <div className="site-header-inner site-header-shell site-header-search-layout" data-search-open={open}>
      <div className="site-header-brand-slot">{brand}</div>
      <div className="site-header-stage">
        <div className="site-header-navigation-slot" aria-hidden={open} inert={open ? true : undefined}>{navigation}</div>
        <div className="site-header-actions">
          <div className="site-header-search-anchor">
            <Button
              ref={triggerRef}
              type="button"
              variant="ghost"
              size="icon"
              className="site-header-search-trigger cursor-pointer"
              aria-label={searchLabel}
              aria-expanded={open}
              aria-controls="site-header-search-form"
              onClick={openSearch}
            >
              <SearchIcon aria-hidden="true" />
            </Button>
            <form
              ref={formRef}
              id="site-header-search-form"
              role="search"
              action={`/${locale}/search`}
              className="site-header-search-form"
              aria-hidden={!open}
              inert={open ? undefined : true}
            >
              <div className="site-header-search-bar">
                <label className="sr-only" htmlFor="site-header-search-input">{searchLabel}</label>
                <div className="site-header-search-field">
                  <Input
                    ref={inputRef}
                    id="site-header-search-input"
                    name="q"
                    type="search"
                    className="site-header-search-input"
                    placeholder={searchPlaceholder}
                    autoComplete="off"
                    required
                    tabIndex={open ? 0 : -1}
                  />
                  <Button type="submit" variant="ghost" size="icon" className="site-header-search-submit cursor-pointer" aria-label={searchLabel} tabIndex={open ? 0 : -1}>
                    <SearchIcon aria-hidden="true" />
                  </Button>
                </div>
                <Button type="button" variant="ghost" size="icon" className="site-header-search-close cursor-pointer" aria-label={closeLabel} onClick={closeSearch} tabIndex={open ? 0 : -1}>
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
              <div className="site-header-popular-links">
                <p>{popularLabel}</p>
                <nav aria-label={popularLabel}>
                  {popularLinks.map((link) => (
                    <Link href={link.href} key={link.href} onClick={() => setOpen(false)}>
                      <span>{link.label}</span>
                      <ArrowRightIcon aria-hidden="true" />
                    </Link>
                  ))}
                </nav>
              </div>
            </form>
          </div>
          <div className="site-header-other-actions-shell" aria-hidden={open} inert={open ? true : undefined}>
            <div className="site-header-other-actions">{actions}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
