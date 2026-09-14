import Image from "next/image";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon, FileTextIcon, SearchXIcon } from "lucide-react";
import { EditorialPageHeader } from "@/components/editorial/editorial-page-header";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { SupportFilters } from "@/components/support/support-filters";
import { SupportArticles, SupportCta } from "@/components/support/support-shared";
import { supportCopy } from "@/content/support";
import { Link } from "@/i18n/navigation";
import { formatBrandName } from "@/lib/brand";
import { getPaginationEntries } from "@/lib/pagination";
import { equipmentCategory, matchesSupportQuery, relatedSupportArticles, SUPPORT_PATH, supportDevicePath, supportHref, type SupportQuery } from "@/lib/support";
import type { CategoryView, EditorialItem, Locale, ProductView } from "@/types/domain";

export function SupportHub({ locale, products, categories, articles, query }: { locale: Locale; products: ProductView[]; categories: CategoryView[]; articles: EditorialItem[]; query: SupportQuery }) {
  const copy = supportCopy[locale];
  const devices = products.map((product) => ({ product, type: equipmentCategory(product, categories), articles: relatedSupportArticles(product, articles) }));
  const options = (values: Array<[string, string]>) => [...new Map(values)].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, locale));
  const brands = options(products.map((product) => [product.brand.toLowerCase(), formatBrandName(product.brand)]));
  const types = options(devices.map((device) => [device.type.key, device.type.name]));
  const matches = devices.filter(({ product, type, articles: related }) => (!query.brand || product.brand.toLowerCase() === query.brand) && (!query.type || type.key === query.type) && matchesSupportQuery([product.brand, product.model, product.name, type.name, ...related.map((article) => `${article.title} ${article.summary}`)].join(" "), query.q));
  const pageCount = Math.max(1, Math.ceil(matches.length / 6));
  const page = Math.min(query.page, pageCount);
  const visible = matches.slice((page - 1) * 6, page * 6);
  const scopedArticles = query.q || query.brand || query.type
    ? articles.filter((article) => matches.some((device) => device.articles.some((entry) => entry.id === article.id)) || (!query.brand && !query.type && matchesSupportQuery(`${article.title} ${article.summary}`, query.q)))
    : articles;

  return <main id="main-content" className="support-page">
    <EditorialPageHeader title={copy.title} description={copy.description} />
    <div className="page-shell support-breadcrumb"><Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink render={<Link locale={locale} href="/" />}>{copy.home}</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{copy.support}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb></div>
    <div className="page-shell support-hub-layout">
      <section aria-labelledby="support-devices" className="support-device-section">
        <SupportFilters key={`${locale}:${query.q}:${query.brand}:${query.type}`} locale={locale} query={query} brands={brands} types={types} />
        <div className="support-section-heading"><div><h2 id="support-devices">{copy.devices}</h2><p>{copy.devicesDescription}</p></div><span className="support-result-count" role="status">{matches.length} {copy.deviceCount}</span></div>
        {visible.length ? <>
          <div className="support-list-head" aria-hidden><span>{copy.device}</span><span>{copy.resources}</span></div>
          <div className="support-device-list">{visible.map(({ product, type, articles: related }) => <article className="support-device-row" key={product.id}>
            <Link locale={locale} href={supportDevicePath(product)} tabIndex={-1} aria-hidden className="support-device-image">
              {product.image ? <Image src={product.image.src} width={product.image.width} height={product.image.height} alt="" sizes="(max-width: 767px) 64px, 88px" loading="lazy" /> : <FileTextIcon aria-hidden />}
            </Link>
            <div className="support-device-copy"><p className="support-meta">{formatBrandName(product.brand)}<span aria-hidden> / </span>{type.name}</p><h3><Link locale={locale} href={supportDevicePath(product)} className="support-text-link">{product.model}</Link></h3><p className="support-device-name">{product.name}</p></div>
            <div className="support-device-resources"><span>{copy.productData}</span>{related.length ? <span>{copy.technicalArticles} · {related.length}</span> : null}</div>
            <Link locale={locale} href={supportDevicePath(product)} className="support-action" aria-label={`${copy.open} · ${product.model}`}>{copy.open}<ArrowRightIcon aria-hidden /></Link>
          </article>)}</div>
          {pageCount > 1 ? <nav className="support-pagination" aria-label={copy.pagination}>
            {page > 1 ? <Link locale={locale} href={supportHref({ ...query, page: page - 1 })} aria-label={copy.previous} className="support-page-step"><ChevronLeftIcon aria-hidden /><span>{copy.previous}</span></Link> : <span className="support-page-step" aria-disabled="true"><ChevronLeftIcon aria-hidden /><span>{copy.previous}</span></span>}
            <div className="support-page-numbers">{getPaginationEntries(page, pageCount).map((entry) => typeof entry === "number" ? <Link locale={locale} href={supportHref({ ...query, page: entry })} key={entry} aria-current={page === entry ? "page" : undefined}>{entry}</Link> : <span key={entry} aria-hidden>…</span>)}</div>
            <span className="support-page-status">{page} / {pageCount}</span>
            {page < pageCount ? <Link locale={locale} href={supportHref({ ...query, page: page + 1 })} aria-label={copy.next} className="support-page-step"><span>{copy.next}</span><ChevronRightIcon aria-hidden /></Link> : <span className="support-page-step" aria-disabled="true"><span>{copy.next}</span><ChevronRightIcon aria-hidden /></span>}
          </nav> : null}
        </> : <div className="support-empty"><SearchXIcon aria-hidden /><h3>{copy.noResults}</h3><p>{copy.noResultsDescription}</p><div className="support-empty-actions"><Button variant="outline" render={<Link locale={locale} href={SUPPORT_PATH} />}>{copy.clear}</Button><Link locale={locale} href="/contact?support=1" className="support-action">{copy.contact}<ArrowRightIcon aria-hidden /></Link></div></div>}
      </section>
      <aside className="support-help-panel" aria-labelledby="support-help-title"><span className="support-help-eyebrow">RICEWIND / SUPPORT</span><h2 id="support-help-title">{copy.prepare}</h2><ol>{copy.notes.map((note, index) => <li key={note.title}><span className="support-note-number">0{index + 1}</span><div><h3>{note.title}</h3><p>{note.body}</p></div></li>)}</ol><Link locale={locale} href="/contact?support=1" className="support-action">{copy.contact}<ArrowRightIcon aria-hidden /></Link></aside>
    </div>
    <section className="support-reference-section" aria-labelledby="support-articles"><div className="page-shell"><div className="support-section-heading"><div><h2 id="support-articles">{copy.articlesTitle}</h2><p>{copy.articlesDescription}</p></div><Link locale={locale} href="/news" className="support-action">{copy.allArticles}<ArrowRightIcon aria-hidden /></Link></div>{scopedArticles.length ? <SupportArticles locale={locale} articles={scopedArticles.slice(0, 3)} /> : <div className="support-empty support-empty-compact"><FileTextIcon aria-hidden /><h3>{copy.noArticles}</h3><p>{copy.noArticlesDescription}</p></div>}</div></section>
    <SupportCta locale={locale} />
  </main>;
}
