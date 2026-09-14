import { CalendarIcon } from "lucide-react";
import Image from "next/image";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ProductCard } from "@/components/products/product-card";
import { Link } from "@/i18n/navigation";
import type { EditorialItem, Locale, NewsCategory, ProductView } from "@/types/domain";

const copy: Record<Locale, {
  recent: string;
  overview: string;
  relatedProducts: string;
  published: string;
  updated: string;
  author: string;
  categories: Record<NewsCategory, string>;
}> = {
  zh: {
    recent: "近期资讯", overview: "概述", relatedProducts: "相关产品", published: "发布", updated: "更新", author: "作者",
    categories: { INDUSTRY_INSIGHTS: "行业洞察", BUYING_GUIDE: "选购指南", TUTORIAL_GUIDE: "教程指南" },
  },
  en: {
    recent: "Recent news", overview: "Overview", relatedProducts: "Related products", published: "Published", updated: "Updated", author: "Author",
    categories: { INDUSTRY_INSIGHTS: "Industry insights", BUYING_GUIDE: "Buying guide", TUTORIAL_GUIDE: "How-to guide" },
  },
  ru: {
    recent: "Последние новости", overview: "Обзор", relatedProducts: "Связанные продукты", published: "Опубликовано", updated: "Обновлено", author: "Автор",
    categories: { INDUSTRY_INSIGHTS: "Отраслевой обзор", BUYING_GUIDE: "Руководство по выбору", TUTORIAL_GUIDE: "Практическое руководство" },
  },
  fr: {
    recent: "Actualités récentes", overview: "Aperçu", relatedProducts: "Produits connexes", published: "Publié", updated: "Mis à jour", author: "Auteur",
    categories: { INDUSTRY_INSIGHTS: "Perspectives de l'industrie", BUYING_GUIDE: "Guide d'achat", TUTORIAL_GUIDE: "Guide pratique" },
  },
  de: {
    recent: "Aktuelle Nachrichten", overview: "Überblick", relatedProducts: "Verwandte Produkte", published: "Veröffentlicht", updated: "Aktualisiert", author: "Autor",
    categories: { INDUSTRY_INSIGHTS: "Brancheneinblicke", BUYING_GUIDE: "Kaufberatung", TUTORIAL_GUIDE: "Anleitungen" },
  },
  es: {
    recent: "Noticias recientes", overview: "Descripción general", relatedProducts: "Productos relacionados", published: "Publicado", updated: "Actualizado", author: "Autor",
    categories: { INDUSTRY_INSIGHTS: "Perspectivas del sector", BUYING_GUIDE: "Guía de compra", TUTORIAL_GUIDE: "Guía práctica" },
  },
  ar: {
    recent: "أحدث الأخبار", overview: "نظرة عامة", relatedProducts: "المنتجات ذات الصلة", published: "تاريخ النشر", updated: "تاريخ التحديث", author: "المؤلف",
    categories: { INDUSTRY_INSIGHTS: "رؤى الصناعة", BUYING_GUIDE: "دليل الشراء", TUTORIAL_GUIDE: "دليل إرشادي" },
  },
};

const dateLocales: Record<Locale, string> = { zh: "zh-CN", en: "en-US", ru: "ru-RU", fr: "fr-FR", de: "de-DE", es: "es-ES", ar: "ar-SA" };

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

function NewsMeta({ locale, item }: { locale: Locale; item: EditorialItem }) {
  const labels = copy[locale];
  const displayDate = item.publishedAt ?? item.updatedAt;
  const showUpdated = item.publishedAt && formatDate(item.publishedAt, locale) !== formatDate(item.updatedAt, locale);
  return (
    <div className="editorial-news-meta">
      <span className="editorial-detail-date">
        <CalendarIcon aria-hidden="true" />
        {item.publishedAt ? labels.published : labels.updated}
        <time dateTime={displayDate}>{formatDate(displayDate, locale)}</time>
      </span>
      {showUpdated ? (
        <span className="editorial-detail-date">
          {labels.updated}
          <time dateTime={item.updatedAt}>{formatDate(item.updatedAt, locale)}</time>
        </span>
      ) : null}
      {item.authorName?.trim() ? <span className="editorial-detail-date">{labels.author}: {item.authorName.trim()}</span> : null}
    </div>
  );
}

function RecentNews({ locale, items }: { locale: Locale; items: EditorialItem[] }) {
  const labels = copy[locale];
  return (
    <aside className="editorial-recent-news" aria-labelledby="recent-news-heading">
      <h2 id="recent-news-heading">{labels.recent}</h2>
      <div className="editorial-recent-list">
        {items.map((recent) => (
          <Link key={recent.id} locale={locale} href={`/news/${recent.slug}`} className={`group editorial-recent-item ${recent.coverImage ? "has-image" : ""}`}>
            {recent.coverImage ? (
              <div className="editorial-recent-image">
                <Image src={recent.coverImage.src} alt={recent.coverImage.alt} width={recent.coverImage.width} height={recent.coverImage.height} sizes="104px" />
              </div>
            ) : null}
            <span className="editorial-recent-copy">
              <time dateTime={recent.publishedAt ?? recent.updatedAt}>{formatDate(recent.publishedAt ?? recent.updatedAt, locale)}</time>
              <span>{recent.title}</span>
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}

export function EditorialDetail({ locale, item, homeLabel, sectionLabel, basePath, recentItems = [], relatedProducts = [], productLabels }: EditorialDetailProps) {
  const labels = copy[locale];
  const isNews = basePath === "/news";
  const category = labels.categories[item.newsCategory ?? "INDUSTRY_INSIGHTS"];

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
        {isNews ? (
          <>
            <header className="editorial-news-detail-header">
              <div className={`editorial-detail-hero editorial-news-detail-hero page-shell ${item.coverImage ? "" : "is-without-cover"}`}>
                {item.coverImage ? (
                  <div className="editorial-detail-media">
                    <figure>
                      <Image src={item.coverImage.src} alt={item.coverImage.alt} width={item.coverImage.width} height={item.coverImage.height} sizes="(max-width: 1023px) 100vw, 38vw" preload />
                    </figure>
                  </div>
                ) : null}
                <div className="editorial-detail-intro">
                  <p className="editorial-news-detail-category">RICEWIND / {category}</p>
                  <h1>{item.title}</h1>
                  <p className="editorial-news-detail-summary">{item.summary}</p>
                  <NewsMeta locale={locale} item={item} />
                </div>
              </div>
            </header>

            <div className="editorial-news-content">
              <div className="editorial-news-layout page-shell">
                <div className="editorial-article-body">
                  <div className="editorial-article-copy">
                    {item.body.map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}
                  </div>
                </div>
                <RecentNews locale={locale} items={recentItems} />
              </div>
            </div>
          </>
        ) : (
          <>
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
              </div>
            </header>
            <div className="bg-card">
              <div className="page-shell section-pad grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
                <h2 className="section-title">{labels.overview}</h2>
                <div className="flex flex-col gap-6">
                  {item.body.map((paragraph, index) => <p className="text-lg leading-9" key={`${index}-${paragraph}`}>{paragraph}</p>)}
                </div>
              </div>
            </div>
          </>
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
