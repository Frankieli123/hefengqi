"use client";

import { LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/types/domain";

const choices: Array<{ locale: Locale; label: string }> = [
  { locale: "zh", label: "中文" },
  { locale: "en", label: "English" },
  { locale: "ru", label: "Русский" }
];

export function LanguageSwitcher({ label }: { label: string }) {
  const router = useRouter();
  const pathname = usePathname();

  async function switchLocale(locale: Locale) {
    try {
      const res = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, pathname: window.location.pathname })
      });
      const data = await res.json();
      if (data?.targetPath) {
        // 如果后端计算出了该商品在目标语言下的真实 Slug 路径，直接跳转对应路由
        router.replace(data.targetPath, { locale });
        return;
      }
    } catch (e) {
      console.error('switchLocale error:', e);
    }
    router.replace(pathname, { locale });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="cursor-pointer px-3" aria-label={label} />}>
        <LanguagesIcon data-icon="inline-start" />
        <span className="hidden sm:inline">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {choices.map((choice) => (
            <DropdownMenuItem key={choice.locale} onClick={() => void switchLocale(choice.locale)}>
              {choice.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
