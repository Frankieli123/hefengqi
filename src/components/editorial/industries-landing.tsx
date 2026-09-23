import { ArrowRightIcon, BatteryChargingIcon, ExternalLinkIcon, NetworkIcon, SnowflakeIcon } from "lucide-react";
import Image from "next/image";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { EditorialPageHeader } from "@/components/editorial/editorial-page-header";
import { getBrandSolutions, getIndustryVisual, industryLandingCopy } from "@/content/industry-landing";
import { Link } from "@/i18n/navigation";
import { collectionPageSchema } from "@/lib/seo";
import type { EditorialItem, Locale } from "@/types/domain";

const methodIcons = [BatteryChargingIcon, SnowflakeIcon, NetworkIcon] as const;

type IndustriesLandingProps = {
  locale: Locale;
  title: string;
  description: string;
  items: EditorialItem[];
  basePath: "/solutions";
};

export function IndustriesLanding({ locale, title, description, items, basePath }: IndustriesLandingProps) {
  const copy = industryLandingCopy[locale];
  const brandSolutions = getBrandSolutions(locale);

  return (
    <main id="main-content" className="industries-landing">
      <JsonLd data={collectionPageSchema(locale, basePath, title, description, items.map((item) => ({ name: item.title, path: `${basePath}/${item.slug}` })))} />

      <EditorialPageHeader title={title} description={description} />

      <nav className="section-subnav" aria-label={copy.navLabel}>
        <div className="page-shell section-subnav-inner">
          <a className="section-subnav-link" href="#solution-method">{copy.nav.method}</a>
          <a className="section-subnav-link" href="#industry-scenarios">{copy.nav.industries}</a>
          <a className="section-subnav-link" href="#brand-solutions">{copy.nav.solutions}</a>
        </div>
      </nav>

      <section id="solution-method" className="page-shell industries-method section-pad">
        <div className="industries-section-heading industries-section-heading-left">
          <h2>{copy.methodTitle}</h2>
          <p>{copy.methodDescription}</p>
        </div>
        <div className="industries-method-grid">
          {copy.methodItems.map((item, index) => {
            const Icon = methodIcons[index];
            return (
              <article key={item.title} className="industries-method-item">
                <span className="industries-method-icon" aria-hidden="true"><Icon /></span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="industry-scenarios" className="industries-scenes-section">
        <div className="page-shell section-pad">
          <div className="industries-section-heading">
            <h2 className="heading-underlined heading-underlined-center">{copy.industriesTitle}</h2>
            <p>{copy.industriesDescription}</p>
          </div>
          <div className="industries-scene-grid">
            {items.map((item) => {
              const image = item.coverImage ?? getIndustryVisual(item.key ?? item.slug, item.title);
              const objectPosition = "objectPosition" in image && typeof image.objectPosition === "string" ? image.objectPosition : undefined;
              return (
                <article key={item.id} className="industries-scene-card">
                  <Link locale={locale} href={`${basePath}/${item.slug}`} className="industries-scene-media" aria-label={item.title}>
                    <Image src={image.src} alt={image.alt} fill sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 66vw" style={{ objectPosition }} />
                  </Link>
                  <div className="industries-scene-copy">
                    <h3><Link locale={locale} href={`${basePath}/${item.slug}`}>{item.title}</Link></h3>
                    <p>{item.summary}</p>
                    <Link locale={locale} href={`${basePath}/${item.slug}`} className="industries-text-link">
                      {copy.industryAction}<ArrowRightIcon aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="brand-solutions" className="industries-brand-section">
        <div className="page-shell section-pad">
          <div className="industries-section-heading">
            <h2 className="heading-underlined heading-underlined-center">{copy.solutionsTitle}</h2>
            <p>{copy.solutionsDescription}</p>
          </div>
          <div className="industries-brand-grid">
            {brandSolutions.map((solution) => (
              <article key={solution.key} className="industries-brand-card">
                <Link locale={locale} href={solution.productHref} className="industries-brand-media" aria-label={`${solution.brand} · ${solution.title}`}>
                  <Image src={solution.image.src} alt={solution.image.alt} fill sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw" style={{ objectPosition: solution.objectPosition }} />
                  <span>{solution.brand}</span>
                </Link>
                <div className="industries-brand-copy">
                  <h3>{solution.title}</h3>
                  <p>{solution.summary}</p>
                  <ul aria-label={solution.title}>
                    {solution.capabilities.map((capability) => <li key={capability}>{capability}</li>)}
                  </ul>
                  <div className="industries-brand-actions">
                    <Link locale={locale} href={solution.productHref} className="industries-text-link">
                      {solution.actionLabel}<ArrowRightIcon aria-hidden="true" />
                    </Link>
                    <a href={solution.sourceUrl} target="_blank" rel="noreferrer" className="industries-source-link">
                      {copy.sourceAction}<ExternalLinkIcon aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="industries-solutions-note">{copy.solutionsNote}</p>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="page-shell flex flex-col items-start justify-between gap-8 py-14 md:flex-row md:items-center">
          <div className="flex max-w-3xl flex-col gap-3">
            <h2 className="text-2xl font-semibold leading-snug text-balance md:text-3xl">{copy.ctaTitle}</h2>
            <p className="leading-7 opacity-85">{copy.ctaDescription}</p>
          </div>
          <Button size="lg" variant="secondary" nativeButton={false} render={<Link locale={locale} href="/contact" />}>
            {copy.ctaAction}<ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </section>
    </main>
  );
}
