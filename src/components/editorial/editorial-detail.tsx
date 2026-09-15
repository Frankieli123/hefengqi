import { CalendarIcon, MailIcon, MessageSquareIcon } from "lucide-react";
import Image from "next/image";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ProductCard } from "@/components/products/product-card";
import { EditorialRichText } from "@/components/editorial/editorial-rich-text";
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


const contactCopy: Record<Locale, { title: string; desc: string; emailLabel: string; whatsappLabel: string }> = {
  zh: { title: "工程采购与技术支持通道", desc: "如需获取产品规格书、工程拓扑方案定制或批量采购报价，欢迎随时联系禾风起专业团队。", emailLabel: "商务邮箱", whatsappLabel: "WhatsApp 技术专线" },
  en: { title: "Engineering Procurement & Technical Desk", desc: "For technical datasheets, custom power topology design, or volume export quotations, reach out to HEFENGQI engineers.", emailLabel: "Sales Email", whatsappLabel: "WhatsApp Direct Desk" },
  ru: { title: "Поставки оборудования и техническая поддержка", desc: "Для получения технической документации, расчета энергетической топологии и оптовых заказов свяжитесь со специалистами HEFENGQI.", emailLabel: "Электронная почта", whatsappLabel: "WhatsApp линия поддержки" },
  fr: { title: "Approvisionnement et support technique", desc: "Pour les fiches techniques, les topologies d'alimentation sur mesure ou les devis de gros, contactez les ingénieurs HEFENGQI.", emailLabel: "E-mail commercial", whatsappLabel: "Ligne directe WhatsApp" },
  de: { title: "Beschaffung und technischer Support", desc: "Für Produktdatenblätter, kundenspezifische Stromversorgungslösungen oder Großhandelsangebote kontaktieren Sie HEFENGQI.", emailLabel: "Geschäftliche E-Mail", whatsappLabel: "WhatsApp-Supportlinie" },
  es: { title: "Adquisiciones e ingeniería de soporte", desc: "Para fichas técnicas, proyectos a medida o presupuestos de exportación por volumen, comuníquese con los ingenieros de HEFENGQI.", emailLabel: "Correo comercial", whatsappLabel: "Línea directa WhatsApp" },
  ar: { title: "المشتريات الهندسية ومكتب الدعم الفني", desc: "للحصول على المواصفات الفنية، وتصاميم طوبولوجيا الطاقة المخصصة، وعروض الأسعار بالجملة، تواصل مع مهندسي HEFENGQI.", emailLabel: "البريد التجاري", whatsappLabel: "خط واتساب المباشر" },
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
                    <div className="editorial-rich-text"><EditorialRichText document={item.richBody} fallback={item.body} /></div>
                    <div className="mt-8 rounded-lg border border-border/80 bg-muted/30 p-5 shadow-xs sm:p-6">
                      <div className="flex flex-col gap-3">
                        <h3 className="text-base font-semibold text-foreground sm:text-lg">{contactCopy[locale].title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{contactCopy[locale].desc}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm font-medium">
                          <a href="mailto:lee@ricewind.com" dir="ltr" className="inline-flex items-center gap-2 rounded-md bg-background px-3.5 py-2 text-foreground border border-border/70 hover:border-primary/50 hover:text-primary transition-colors">
                            <MailIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                            <span>lee@ricewind.com</span>
                          </a>
                          <a href="https://wa.me/8617621197907" target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex items-center gap-2 rounded-md bg-background px-3.5 py-2 text-foreground border border-border/70 hover:border-primary/50 hover:text-primary transition-colors">
                            <MessageSquareIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                            <span>+86 17621197907</span>
                          </a>
                        </div>
                      </div>
                    </div>
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
                <div className="editorial-rich-text editorial-overview-copy">
                  <EditorialRichText document={item.richBody} fallback={item.body} />
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
