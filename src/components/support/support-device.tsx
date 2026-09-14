import Image from "next/image";
import { ArrowRightIcon, BookOpenIcon, ChevronDownIcon } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { SupportArticles, SupportCta } from "@/components/support/support-shared";
import { Link } from "@/i18n/navigation";
import { supportCopy } from "@/content/support";
import { formatBrandName } from "@/lib/brand";
import { formatAttributeValue } from "@/lib/attribute-format";
import { SUPPORT_PATH, supportDevicePath, supportHref } from "@/lib/support";
import type { EditorialItem, Locale, ProductView } from "@/types/domain";

export function SupportDevice({ locale, product, categoryName, articles }: { locale: Locale; product: ProductView; categoryName: string; articles: EditorialItem[] }) {
  const copy = supportCopy[locale];
  const sections = [{ id: "equipment", title: copy.overview }, { id: "alarms", title: copy.alarms }, { id: "prepare", title: copy.prepare }, { id: "references", title: copy.related }];
  return <main id="main-content" className="support-page">
    <div className="page-shell support-breadcrumb"><Breadcrumb><BreadcrumbList>
      <BreadcrumbItem><BreadcrumbLink render={<Link locale={locale} href="/" />}>{copy.home}</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
      <BreadcrumbItem><BreadcrumbLink render={<Link locale={locale} href={SUPPORT_PATH} />}>{copy.support}</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
      <BreadcrumbItem><BreadcrumbLink render={<Link locale={locale} href={supportHref({ brand: product.brand.toLowerCase() })} />}>{formatBrandName(product.brandDisplayName ?? product.brand)}</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
      <BreadcrumbItem><BreadcrumbPage>{product.model}</BreadcrumbPage></BreadcrumbItem>
    </BreadcrumbList></Breadcrumb></div>
    <header className="support-detail-header"><div className="page-shell"><p className="support-meta">{formatBrandName(product.brandDisplayName ?? product.brand)} / {categoryName}</p><h1>{product.model}{" "}<span>{copy.detailSuffix}</span></h1><p className="support-detail-description">{product.directDefinition}</p></div></header>
    <div className="page-shell support-detail-layout">
      <aside className="support-toc"><details><summary>{copy.contents}<ChevronDownIcon aria-hidden /></summary><nav aria-label={copy.contents}>{sections.map((section) => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}</nav></details></aside>
      <div className="support-detail-body">
        <section id="equipment" aria-labelledby="equipment-title"><h2 id="equipment-title">{copy.overview}</h2><div className="support-equipment-overview"><div>
          <dl className="support-equipment-facts"><div><dt>{copy.brand}</dt><dd>{formatBrandName(product.brandDisplayName ?? product.brand)}</dd></div><div><dt>{copy.model}</dt><dd>{product.model}</dd></div><div><dt>{copy.category}</dt><dd>{categoryName}</dd></div><div><dt>{copy.version}</dt><dd>{copy.versionUnknown}</dd></div></dl>
          <Link locale={locale} href={`/products/${product.slug}`} className="support-action">{copy.productLink}<ArrowRightIcon aria-hidden /></Link>
        </div>{product.image ? <Image className="support-detail-product-image" src={product.image.src} width={product.image.width} height={product.image.height} alt={product.image.alt} sizes="(max-width: 767px) 120px, 220px" /> : null}</div>
          <p className="support-source-note">{copy.sourceDescription}</p>
          {product.attributes.length ? <dl className="support-specifications">{product.attributes.slice(0, 6).map((attribute) => <div key={attribute.key}><dt>{attribute.label}</dt><dd>{formatAttributeValue(attribute.value, attribute.unit)}</dd></div>)}</dl> : null}
        </section>
        <section id="alarms" aria-labelledby="alarms-title"><h2 id="alarms-title">{copy.alarms}</h2><div className="support-alarm-table"><div className="support-alarm-head" aria-hidden><span>{copy.alarmCode}</span><span>{copy.led}</span><span>{copy.cause}</span><span>{copy.procedure}</span></div><div className="support-empty"><BookOpenIcon aria-hidden /><h3>{copy.noAlarms}</h3><p>{copy.noAlarmsDescription}</p><a href="#prepare" className="support-action">{copy.prepare}<ArrowRightIcon aria-hidden /></a></div></div></section>
        <section id="prepare" aria-labelledby="prepare-title"><h2 id="prepare-title">{copy.prepare}</h2><ol className="support-prepare-list">{copy.notes.map((note, index) => <li key={note.title}><span className="support-note-number">0{index + 1}</span><div><h3>{note.title}</h3><p>{note.body}</p></div></li>)}</ol>
          <p className="support-source-note">{copy.prepareDescription}</p>
          <form action={`/${locale}/contact`} className="support-context-form">
            <input type="hidden" name="productId" value={product.id} /><input type="hidden" name="support" value="1" />
            <input type="hidden" name="source" value={supportDevicePath(product)} />
            <label htmlFor="support-version">{copy.version}</label><input id="support-version" name="version" placeholder={copy.versionPlaceholder} maxLength={160} />
            <label htmlFor="support-alarm">{copy.alarmLabel}</label><textarea id="support-alarm" name="alarm" placeholder={copy.alarmPlaceholder} maxLength={1200} rows={4} aria-describedby="support-context-help" />
            <p id="support-context-help">{copy.contextHelp}</p><Button size="lg" type="submit">{copy.contact}<ArrowRightIcon data-icon="inline-end" /></Button>
          </form>
        </section>
        <section id="references" aria-labelledby="references-title"><h2 id="references-title">{copy.related}</h2>{articles.length ? <SupportArticles locale={locale} articles={articles.slice(0, 4)} /> : <p className="support-source-note">{copy.noArticlesDescription}</p>}<Link locale={locale} href="/news" className="support-action">{copy.allArticles}<ArrowRightIcon aria-hidden /></Link></section>
        <div className="support-parts-note"><div><h2>{copy.partsTitle}</h2><p>{copy.partsDescription}</p></div><Link locale={locale} href={`/contact?productId=${encodeURIComponent(product.id)}&support=1`} className="support-action">{copy.partsAction}<ArrowRightIcon aria-hidden /></Link></div>
      </div>
    </div>
    <SupportCta locale={locale} productId={product.id} />
  </main>;
}
