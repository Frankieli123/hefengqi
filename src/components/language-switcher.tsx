"use client";

import Image from "next/image";
import { LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import type { Locale } from "@/types/domain";

const choices: Array<{ locale: Locale; label: string; flag: string }> = [
  { locale: "zh", label: "中文（简体）", flag: "/flags/cn.svg" },
  { locale: "en", label: "English", flag: "/flags/us.svg" },
  { locale: "ru", label: "Русский", flag: "/flags/ru.svg" },
  { locale: "fr", label: "Français", flag: "/flags/fr.svg" },
  { locale: "de", label: "Deutsch", flag: "/flags/de.svg" },
  { locale: "es", label: "Español", flag: "/flags/es.svg" },
  { locale: "ar", label: "العربية", flag: "/flags/sa.svg" },
];

export function LanguageSwitcher({ label }: { label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as Locale;

  async function switchLocale(locale: Locale) {
    if (locale === currentLocale) return;
    try {
      const res = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, pathname: window.location.pathname })
      });
      const data = await res.json();
      if (data?.targetPath) {
        router.replace(data.targetPath, { locale });
        return;
      }
    } catch (e) {
      console.error("switchLocale error:", e);
    }
    router.replace(pathname, { locale });
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger render={<Button variant="ghost" className="cursor-pointer px-3" aria-label={label} />}>
        <LanguagesIcon data-icon="inline-start" />
        <span className="hidden sm:inline">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 border-border/60 p-1 shadow-lg">
        <DropdownMenuGroup>
          {choices.map((choice) => <DropdownMenuItem key={choice.locale} onClick={() => void switchLocale(choice.locale)} className="min-h-9 cursor-pointer gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-foreground hover:bg-muted/70 focus:bg-muted/70 focus:text-foreground"><span className="relative h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10" aria-hidden="true"><Image src={choice.flag} alt="" fill sizes="20px" className="object-cover" /></span><span>{choice.label}</span></DropdownMenuItem>)}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
