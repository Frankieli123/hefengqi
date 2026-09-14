import Image from "next/image";
import { ArrowRightIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { supportCopy } from "@/content/support";
import type { EditorialItem, Locale } from "@/types/domain";

export function SupportCta({ locale, productId }: { locale: Locale; productId?: string }) {
  const copy = supportCopy[locale];
  return <section className="bg-primary text-primary-foreground">
    <div className="page-shell flex flex-col items-start justify-between gap-8 py-14 md:flex-row md:items-center">
      <div className="flex max-w-3xl flex-col gap-3"><h2 className="text-2xl font-semibold leading-snug text-balance md:text-3xl">{copy.contactTitle}</h2><p className="leading-7 opacity-85">{copy.contactDescription}</p></div>
      <Button size="lg" variant="secondary" render={<Link locale={locale} href={productId ? `/contact?productId=${encodeURIComponent(productId)}&support=1` : "/contact?support=1"} />}>
        {copy.contact}<ArrowRightIcon data-icon="inline-end" />
      </Button>
    </div>
  </section>;
}

export function SupportArticles({ locale, articles }: { locale: Locale; articles: EditorialItem[] }) {
  const copy = supportCopy[locale];
  return <div className="support-article-list">{articles.map((article) => <article key={article.id} className="support-article">
    <Link locale={locale} href={`/news/${article.slug}`} className="support-article-image" tabIndex={-1} aria-hidden>
      {article.coverImage ? <Image src={article.coverImage.src} width={article.coverImage.width} height={article.coverImage.height} alt="" sizes="(max-width: 767px) 88px, 160px" loading="lazy" /> : <FileTextIcon aria-hidden />}
    </Link>
    <div><p className="support-meta">{copy.technicalArticles}</p><h3><Link locale={locale} href={`/news/${article.slug}`} className="support-text-link">{article.title}</Link></h3><p className="support-article-summary">{article.summary}</p></div>
    <ArrowRightIcon className="support-row-arrow" aria-hidden />
  </article>)}</div>;
}
