import { CalendarIcon } from "lucide-react";
import Image from "next/image";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ProductCard } from "@/components/products/product-card";
import { Link } from "@/i18n/navigation";
import type { EditorialItem, Locale, ProductView } from "@/types/domain";

const copy: Record<Locale, { recent: string; article: string; overview: string; relatedProducts: string }> = {
  zh: { recent: "近期资讯", article: "正文", overview: "概述", relatedProducts: "相关产品" },
  en: { recent: "Recent news", article: "Article", overview: "Overview", relatedProducts: "Related products" },
  ru: { recent: "Последние новости", article: "Статья", overview: "Обзор", relatedProducts: "Связанные продукты" },
};

const dateLocales: Record<Locale, string> = { zh: "zh-CN", en: "en-US", ru: "ru-RU" };

function formatDate(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(dateLocales[locale], { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(date);
}

type EditorialDetailProps = {
  locale: Locale;
  item: EditorialItem;
  homeLabel: string;
  sectionLabel: string;
  basePath: string;
  recentItems?: EditorialItem[];
  relatedProducts?: ProductView[];
  productLabels?: { details: string; inquiry: string; model: string };
};

export function EditorialDetail({ locale, item, homeLabel, sectionLabel, basePath, recentItems = [], relatedProducts = [], productLabels }: EditorialDetailProps) {
  const labels = copy[locale];
  const isNews = basePath === "/news";
  return (
    <main id="main-content">
      <div className="page-shell py-5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href={`/${locale}`}>{homeLabel}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href={`/${locale}${basePath}`}>{sectionLabel}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{item.title}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <article>
        <header className="editorial-detail-hero page-shell">
          <div className="editorial-detail-media">
            {item.coverImage ? (
              <figure>
                <Image src={item.coverImage.src} alt={item.coverImage.alt} width={item.coverImage.width} height={item.coverImage.height} sizes="(max-width: 1023px) 100vw, 38vw" preload />
              </figure>
            ) : <span className="eyebrow">HEFENGQI</span>}
          </div>
          <div className="editorial-detail-intro">
            <h1>{item.title}</h1>
            <p>{item.summary}</p>
            {isNews ? (
              <span className="editorial-detail-date">
                <CalendarIcon aria-hidden="true" />
                <time dateTime={item.updatedAt}>{formatDate(item.updatedAt, locale)}</time>
              </span>
            ) : null}
          </div>
        </header>

        {isNews ? (
          <div className="editorial-news-content">
            <div className="editorial-news-layout page-shell">
              <section className="editorial-article-body" aria-labelledby="article-heading">
                <h2 id="article-heading">{labels.article}</h2>
                <div className="editorial-article-copy">
                  {item.body.map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}
                </div>
              </section>

              <aside className="editorial-recent-news" aria-labelledby="recent-news-heading">
                <h2 id="recent-news-heading">{labels.recent}</h2>
                <div className="editorial-recent-list">
                  {recentItems.map((recent) => (
                    <Link key={recent.id} locale={locale} href={`/news/${recent.slug}`} className={`group editorial-recent-item ${recent.coverImage ? "has-image" : ""}`}>
                      {recent.coverImage ? (
                        <div className="editorial-recent-image">
                          <Image src={recent.coverImage.src} alt={recent.coverImage.alt} width={recent.coverImage.width} height={recent.coverImage.height} sizes="112px" />
                        </div>
                      ) : null}
                      <span className="editorial-recent-copy">
                        <time dateTime={recent.updatedAt}>{formatDate(recent.updatedAt, locale)}</time>
                        <span>{recent.title}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <div className="bg-card">
            <div className="page-shell section-pad grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
              <h2 className="section-title">{labels.overview}</h2>
              <div className="flex flex-col gap-6">
                {item.body.map((paragraph, index) => <p className="text-lg leading-9" key={`${index}-${paragraph}`}>{paragraph}</p>)}
              </div>
            </div>
          </div>
        )}

        {isNews && relatedProducts.length && productLabels ? (
          <section className="news-related-products" aria-labelledby="related-products-heading">
            <div className="page-shell">
              <div className="product-explore-heading news-related-products-heading"><h2 id="related-products-heading">{labels.relatedProducts}</h2></div>
              <div className="product-explore-grid news-related-products-grid">
                {relatedProducts.map((product) => <ProductCard key={product.id} product={product} locale={locale} headingAs="h3" imageSizes="(max-width: 767px) 50vw, (max-width: 1023px) 50vw, (max-width: 1712px) 25vw, 420px" labels={productLabels} />)}
              </div>
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}
