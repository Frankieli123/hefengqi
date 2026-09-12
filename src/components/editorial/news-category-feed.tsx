"use client";

import { useState } from "react";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { EditorialItem, Locale, NewsCategory } from "@/types/domain";

export type NewsCategoryOption = {
  value: NewsCategory | "ALL";
  label: string;
};

type NewsCategoryFeedProps = {
  locale: Locale;
  items: EditorialItem[];
  categories: NewsCategoryOption[];
  detailsLabel: string;
  navLabel: string;
  emptyLabel: string;
  introTitle: string;
  introDescription: string;
};

const dateLocales: Record<Locale, string> = { zh: "zh-CN", en: "en", ru: "ru" };

export function NewsCategoryFeed({ locale, items, categories, detailsLabel, navLabel, emptyLabel, introTitle, introDescription }: NewsCategoryFeedProps) {
  const [activeCategory, setActiveCategory] = useState<NewsCategory | "ALL">("ALL");
  const visibleItems = activeCategory === "ALL"
    ? items
    : items.filter((item) => (item.newsCategory ?? "INDUSTRY_INSIGHTS") === activeCategory);
  const activeTabId = `news-category-${activeCategory.toLowerCase()}`;

  return (
    <>
      <nav className="section-subnav" aria-label={navLabel}>
        <div className="page-shell section-subnav-inner" role="tablist" aria-label={navLabel}>
          {categories.map((category) => (
            <button
              key={category.value}
              id={`news-category-${category.value.toLowerCase()}`}
              type="button"
              role="tab"
              aria-selected={activeCategory === category.value}
              aria-controls="news-category-panel"
              className="section-subnav-link"
              onClick={() => setActiveCategory(category.value)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </nav>

      <section
        id="news-category-panel"
        role="tabpanel"
        aria-labelledby={activeTabId}
        className="page-shell section-pad"
      >
        <div className="news-category-intro">
          <h2>{introTitle}</h2>
          <p>{introDescription}</p>
        </div>
        {visibleItems.length ? (
          <div className="flex flex-col divide-y border-y">
            {visibleItems.map((item, index) => (
              <article key={item.id} className={`grid gap-5 py-9 md:items-center ${item.coverImage ? "md:grid-cols-[6rem_15rem_1fr_auto]" : "md:grid-cols-[6rem_1fr_auto]"}`}>
                <span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                {item.coverImage ? (
                  <Link locale={locale} href={`/news/${item.slug}`} aria-label={item.title} className="group block overflow-hidden rounded-lg">
                    <Image src={item.coverImage.src} alt={item.coverImage.alt} width={item.coverImage.width} height={item.coverImage.height} sizes="(max-width: 768px) 100vw, 240px" className="aspect-video h-auto w-full object-cover transition-transform duration-400 group-hover:scale-[1.04]" />
                  </Link>
                ) : null}
                <div className="flex max-w-3xl flex-col gap-3">
                  <h2 className="text-2xl font-medium md:text-3xl">{item.title}</h2>
                  <p className="leading-7 text-muted-foreground">{item.summary}</p>
                  <time className="text-xs text-muted-foreground" dateTime={item.updatedAt}>
                    {new Intl.DateTimeFormat(dateLocales[locale], { year: "numeric", month: "long", day: "numeric" }).format(new Date(item.updatedAt))}
                  </time>
                </div>
                <Button variant="ghost" nativeButton={false} render={<Link locale={locale} href={`/news/${item.slug}`} />}>
                  {detailsLabel}
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </article>
            ))}
          </div>
        ) : <p className="news-category-empty">{emptyLabel}</p>}
      </section>
    </>
  );
}
