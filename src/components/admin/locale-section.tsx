import type { ReactNode } from "react";
import { managedLocaleLabel, managedLocaleMeta, type ManagedLocale } from "@/lib/admin-locales";
import { cn } from "@/lib/utils";

export function LocaleSection({ locale, children, complete, defaultOpen = locale === "zh", className }: {
  locale: ManagedLocale;
  children: ReactNode;
  complete?: boolean;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details open={defaultOpen} className={cn("group rounded-lg border border-border bg-background", className)}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span>{managedLocaleLabel(locale)}</span>
        <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
          {complete === undefined ? null : <span className={cn("size-2 rounded-full", complete ? "bg-emerald-500" : "bg-amber-500")} aria-hidden="true" />}
          {complete === undefined ? "展开编辑" : complete ? "已填写" : "待补充"}
          <span className="transition-transform duration-200 group-open:rotate-180" aria-hidden="true">⌄</span>
        </span>
      </summary>
      <div className="border-t border-border px-4 py-5" dir={managedLocaleMeta[locale].direction}>{children}</div>
    </details>
  );
}
