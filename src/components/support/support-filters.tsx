"use client";

import { useTransition, type FormEvent } from "react";
import { SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supportCopy } from "@/content/support";
import { SUPPORT_PATH, supportHref, type SupportQuery } from "@/lib/support";
import type { Locale } from "@/types/domain";

type Option = { value: string; label: string };

export function SupportFilters({ locale, query, brands, types }: { locale: Locale; query: SupportQuery; brands: Option[]; types: Option[] }) {
  const copy = supportCopy[locale];
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => router.push(supportHref({ q: String(data.get("q") ?? "").trim(), brand: String(data.get("brand") ?? ""), type: String(data.get("type") ?? "") }), { scroll: false }));
  }

  return <form action={`/${locale}${SUPPORT_PATH}`} role="search" aria-label={copy.searchLabel} className="support-filters" onSubmit={submit} aria-busy={pending}>
    <label className="support-search-label" htmlFor="support-query">{copy.searchLabel}</label>
    <div className="support-search-row">
      <Input id="support-query" name="q" type="search" defaultValue={query.q} placeholder={copy.searchPlaceholder} maxLength={160} aria-describedby="support-search-hint" />
      <Button type="submit" size="lg" disabled={pending}><SearchIcon aria-hidden />{pending ? copy.searching : copy.search}</Button>
    </div>
    <p className="support-search-hint" id="support-search-hint">{copy.searchHint}</p>
    <details className="support-filter-options" open={Boolean(query.brand || query.type)}>
      <summary><SlidersHorizontalIcon aria-hidden />{copy.filters}</summary>
      <div className="support-select-row">
        {[{ name: "brand", label: copy.brand, all: copy.allBrands, options: brands }, { name: "type", label: copy.type, all: copy.allTypes, options: types }].map((field) => <label className="support-select-field" key={field.name}>
          <span>{field.label}</span>
          <select name={field.name} defaultValue={query[field.name as "brand" | "type"]} disabled={pending} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
            <option value="">{field.all}</option>
            {query[field.name as "brand" | "type"] && !field.options.some((option) => option.value === query[field.name as "brand" | "type"]) ? <option value={query[field.name as "brand" | "type"]}>{query[field.name as "brand" | "type"]}</option> : null}
            {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>)}
        {query.q || query.brand || query.type ? <Link href={SUPPORT_PATH} className="support-clear">{copy.clear}</Link> : null}
      </div>
    </details>
  </form>;
}
