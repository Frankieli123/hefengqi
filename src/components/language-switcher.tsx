"use client";

import { LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/types/domain";

const choices: Array<{ locale: Locale; label: string }> = [{ locale: "zh", label: "中文" }, { locale: "en", label: "English" }, { locale: "ru", label: "Русский" }];

export function LanguageSwitcher({ label }: { label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  async function switchLocale(locale: Locale) {
    await fetch("/api/locale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }) });
    router.replace(pathname, { locale });
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="cursor-pointer" aria-label={label} />}><LanguagesIcon data-icon="inline-start" /><span className="hidden sm:inline">{label}</span></DropdownMenuTrigger>
      <DropdownMenuContent align="end"><DropdownMenuGroup>{choices.map((choice) => <DropdownMenuItem key={choice.locale} onClick={() => void switchLocale(choice.locale)}>{choice.label}</DropdownMenuItem>)}</DropdownMenuGroup></DropdownMenuContent>
    </DropdownMenu>
  );
}
