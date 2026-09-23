"use client";

import { useRef, useState } from "react";
import { ArrowRightIcon, FileTextIcon } from "lucide-react";
import Image from "next/image";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { newsFeedCopy } from "@/content/news-feed";
import { Link, useRouter } from "@/i18n/navigation";
import type { EditorialItem, Locale, NewsCategory } from "@/types/domain";
import styles from "./news-feed.module.css";

export type NewsCategoryOption = { value: NewsCategory | "ALL"; label: string };
export type NewsFeedItem = Pick<EditorialItem, "id" | "slug" | "title" | "summary" | "updatedAt" | "publishedAt" | "coverImage" | "newsCategory"> & { displayDate?: string };

type NewsCategoryFeedProps = {
  locale: Locale;
  items: NewsFeedItem[];
  categories: NewsCategoryOption[];
  detailsLabel: string;
  emptyLabel: string;
};

const dateLocales: Record<Locale, string> = { zh: "zh-CN", en: "en", ru: "ru", fr: "fr", de: "de", es: "es", ar: "ar" };

export function NewsCategoryFeed({ locale, items, categories, detailsLabel, emptyLabel }: NewsCategoryFeedProps) {
  const copy = newsFeedCopy[locale];
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<NewsCategory | "ALL">("ALL");
  const panelRef = useRef<HTMLElement>(null);
  const prefetchedArticles = useRef(new Set<string>());
  const visibleItems = items.filter((item) => activeCategory === "ALL" || (item.newsCategory ?? "INDUSTRY_INSIGHTS") === activeCategory);
  const hasFilters = activeCategory !== "ALL";
  const dateFormatter = new Intl.DateTimeFormat(dateLocales[locale], { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  const categoryLabel = (value: NewsCategory) => categories.find((category) => category.value === value)?.label ?? "";

  function clearFilters() {
    setActiveCategory("ALL");
  }

  function selectGuide(category: NewsCategory) {
    setActiveCategory(category);
    panelRef.current?.focus({ preventScroll: true });
    panelRef.current?.scrollIntoView?.({ block: "start", behavior: "instant" });
  }

  function prefetchArticle(slug: string) {
    const href = `/news/${slug}` as const;
    if (prefetchedArticles.current.has(href)) return;
    prefetchedArticles.current.add(href);
    router.prefetch(href);
  }

  return (
    <div className={styles.feed}>
      <div className={`page-shell ${styles.breadcrumb}`}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink render={<Link locale={locale} href="/" />}>{copy.home}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{copy.news}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className={`page-shell ${styles.layout}`}>
        <div className={styles.main}>
          <section id="news-category-panel" aria-labelledby="news-list-heading" ref={panelRef} tabIndex={-1} className={styles.panel}>
            <div className={styles.listHeading}>
              <h2 id="news-list-heading">{activeCategory === "ALL" ? copy.latest : categoryLabel(activeCategory)}</h2>
              <div className={styles.listStatus}>
                <span className={styles.order}>{copy.order}</span>
                <span role="status" aria-atomic="true">{copy.results.replace("{count}", String(visibleItems.length))}</span>
                {hasFilters ? <button type="button" onClick={clearFilters} className={styles.clear}>{copy.clear}</button> : null}
              </div>
            </div>
            {visibleItems.length ? visibleItems.map((item) => {
              const date = item.publishedAt ?? item.updatedAt;
              const titleId = `news-title-${item.id}`;
              return (
                <article key={item.id} className={styles.article}>
                  <Link
                    locale={locale}
                    href={`/news/${item.slug}`}
                    prefetch={false}
                    onPointerEnter={() => prefetchArticle(item.slug)}
                    onFocus={() => prefetchArticle(item.slug)}
                    onTouchStart={() => prefetchArticle(item.slug)}
                    className={styles.articleLink}
                    aria-labelledby={titleId}
                  >
                    <div className={`${styles.image} ${item.coverImage ? "" : styles.noImage}`}>
                      {item.coverImage ? (
                        <Image src={item.coverImage.src} alt={item.coverImage.alt} width={item.coverImage.width} height={item.coverImage.height} sizes="(max-width: 767px) 88px, 200px" loading="lazy" />
                      ) : <FileTextIcon aria-hidden />}
                    </div>
                    <div className={styles.articleCopy}>
                      <div className={styles.meta}>
                        <span>{categoryLabel(item.newsCategory ?? "INDUSTRY_INSIGHTS")}</span>
                        <time dateTime={date}>{item.displayDate ?? dateFormatter.format(new Date(date))}</time>
                      </div>
                      <h3 id={titleId}>{item.title}</h3>
                      <p className={styles.summary}>{item.summary}</p>
                    </div>
                    <span className={styles.action}>{detailsLabel}<ArrowRightIcon aria-hidden /></span>
                  </Link>
                </article>
              );
            }) : (
              <div className={styles.empty}>
                <h3>{copy.noResults}</h3>
                <p>{emptyLabel}</p>
                {hasFilters ? <button type="button" onClick={clearFilters} className={styles.clear}>{copy.clear}</button> : null}
              </div>
            )}
          </section>
        </div>

        <aside className={styles.aside} aria-labelledby="news-reading-guide">
          <p className={styles.eyebrow}>RICEWIND / INSIGHTS</p>
          <h2 id="news-reading-guide">{copy.guideTitle}</h2>
          <p>{copy.guideDescription}</p>
          <ul className={styles.guideList}>
            {categories.filter((category) => category.value !== "ALL").map((category) => (
              <li key={category.value}>
                <button type="button" className={styles.guideButton} aria-pressed={activeCategory === category.value} aria-controls="news-category-panel" onClick={() => selectGuide(category.value as NewsCategory)}>
                  {category.label}<ArrowRightIcon aria-hidden />
                </button>
                <p>{copy.categoryDescriptions[category.value as NewsCategory]}</p>
              </li>
            ))}
          </ul>
          <section className={styles.support} aria-labelledby="news-support-heading">
            <h3 id="news-support-heading">{copy.supportTitle}</h3>
            <p>{copy.supportDescription}</p>
            <Link locale={locale} href="/contact" className={styles.action}>{copy.supportLink}<ArrowRightIcon aria-hidden /></Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
