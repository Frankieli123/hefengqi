import { ArrowRightIcon } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { EditorialPageHeader } from "@/components/editorial/editorial-page-header";
import { NewsCategoryFeed, type NewsCategoryOption } from "@/components/editorial/news-category-feed";
import { Link } from "@/i18n/navigation";
import type { EditorialItem } from "@/types/domain";
import type { Locale } from "@/types/domain";
import { collectionPageSchema } from "@/lib/seo";
import Image from "next/image";

export function EditorialIndex({ locale, eyebrow, title, description, basePath, items, detailsLabel, newsCategories, newsEmptyLabel }: { locale: Locale; eyebrow: string; title: string; description: string; basePath: string; items: EditorialItem[]; detailsLabel: string; newsCategories?: NewsCategoryOption[]; newsEmptyLabel?: string }) {
  void eyebrow;
  const isNews = basePath === "/news";

  return (
    <main id="main-content">
      <JsonLd data={collectionPageSchema(locale, basePath, title, description, items.map((item) => ({ name: item.title, path: `${basePath}/${item.slug}` })))} />
      <EditorialPageHeader title={title} description={description} />
      {isNews && newsCategories ? (
        <NewsCategoryFeed locale={locale} items={items.map(({ id, slug, title, summary, updatedAt, publishedAt, coverImage, newsCategory }) => ({ id, slug, title, summary, updatedAt, publishedAt, coverImage, newsCategory }))} categories={newsCategories} detailsLabel={detailsLabel} emptyLabel={newsEmptyLabel ?? description} />
      ) : <section className="page-shell section-pad">
        <div className="flex flex-col divide-y border-y">
          {items.map((item, index) => (
            <article key={item.id} className={`grid gap-5 py-9 md:items-center ${isNews && item.coverImage ? "md:grid-cols-[6rem_15rem_1fr_auto]" : "md:grid-cols-[6rem_1fr_auto]"}`}>
              <span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              {isNews && item.coverImage ? (
                <Link locale={locale} href={`${basePath}/${item.slug}`} aria-label={item.title} className="group block overflow-hidden rounded-lg">
                  <Image src={item.coverImage.src} alt={item.coverImage.alt} width={item.coverImage.width} height={item.coverImage.height} sizes="(max-width: 768px) 100vw, 240px" className="aspect-video h-auto w-full object-cover transition-transform duration-400 group-hover:scale-[1.04]" />
                </Link>
              ) : null}
              <div className="flex max-w-3xl flex-col gap-3">
                <h2 className="text-2xl font-medium md:text-3xl">{item.title}</h2>
                <p className="leading-7 text-muted-foreground">{item.summary}</p>
                {isNews ? <time className="text-xs text-muted-foreground" dateTime={item.updatedAt}>{item.updatedAt}</time> : null}
              </div>
              <Button variant="ghost" nativeButton={false} render={<Link locale={locale} href={`${basePath}/${item.slug}`} />}>
                {detailsLabel}
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </article>
          ))}
        </div>
      </section>}
    </main>
  );
}
