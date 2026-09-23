import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRightIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { BrandMarquee } from "@/components/brand-marquee";
import { HomeHeroCarousel } from "@/components/home-hero-carousel";
import { HomeProductCarousel } from "@/components/home-product-carousel";
import { HomeMotion } from "@/components/home-motion";
import { HomeTechnicalVisual } from "@/components/home-technical-visual";
import { JsonLd } from "@/components/json-ld";
import { SectionHeading } from "@/components/section-heading";
import { getIndustryVisual } from "@/content/industry-landing";
import { Link } from "@/i18n/navigation";
import { getCategories, getEditorialSummaries, getHomeProductGroups } from "@/lib/content-repository";
import { getHomeHeroSlides } from "@/lib/home-hero";
import { getHomeProductSeriesImages, homeProductSeries } from "@/lib/home-product-series";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata, organizationSchema } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };



const partnerBrands = [
  { name: "VERTIV", key: "vertiv", href: "/products?q=vertiv" },
  { name: "HUAWEI", key: "huawei", href: "/products?q=huawei" },
  { name: "DELTA", key: "delta", href: "/products?q=delta" },
  { name: "ELTEK", key: "eltek", href: "/products?q=eltek" },
  { name: "SANTAK", key: "santak", href: "/products?q=santak" },
  { name: "ZTE", key: "zte", href: "/products?q=zte" },
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });
  return localizedMetadata(locale, "", t("title"), t("description"));
}

function FallbackHero({ eyebrow: _eyebrow, title, description, productsCta, inquiryCta }: { eyebrow?: string; title: string; description: string; productsCta: string; inquiryCta: string }) {
  return <section className="home-hero home-hero-fallback"><div className="page-shell grid min-h-full gap-10 py-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-16"><div className="flex flex-col items-start gap-7"><h1 className="home-hero-title">{title}</h1><p className="home-hero-summary">{description}</p><div className="flex flex-wrap gap-3"><Button size="lg" nativeButton={false} render={<Link href="/products" />}>{productsCta}<ArrowRightIcon data-icon="inline-end" /></Button><Button size="lg" variant="outline" nativeButton={false} render={<Link href="/contact" />}>{inquiryCta}</Button></div></div><HomeTechnicalVisual /></div></section>;
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const [t, common, heroSlides, industries, cases, newsItems, categories, seriesImages, productGroups] = await Promise.all([
    getTranslations("home"),
    getTranslations("common"),
    getHomeHeroSlides(locale),
    getEditorialSummaries(locale, "industries"),
    getEditorialSummaries(locale, "cases"),
    getEditorialSummaries(locale, "news"),
    getCategories(locale),
    getHomeProductSeriesImages(locale),
    getHomeProductGroups(locale),
  ]);
  const [primarySolution, secondarySolution] = industries;
  const featuredSolutions = [primarySolution, secondarySolution].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const caseStudy = cases[0];
  const news = newsItems[0];
  const categoryByKey = new Map(categories.map((category) => [category.key, category]));
  const seriesCards = homeProductSeries.map((item) => {
    const title = t(`productSeries.${item.key}.title`);
    const category = categoryByKey.get(item.categoryKey);
    const href = category ? `/products/category/${category.path}` : "/products";
    const image = seriesImages[item.categoryKey];
    return { ...item, image, title, description: t(`productSeries.${item.key}.description`), href };
  });

  return <main id="main-content">
    <JsonLd data={organizationSchema(locale)} />
    <HomeMotion />
    {heroSlides.length ? <HomeHeroCarousel slides={heroSlides} labels={{ previous: t("previousSlide"), next: t("nextSlide"), slide: t("slideLabel") }} /> : <FallbackHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} productsCta={t("productsCta")} inquiryCta={t("inquiryCta")} />}

    <section className="bg-ink text-ink-foreground relative overflow-hidden">
      <div className="py-16 sm:py-20 lg:py-24 flex flex-col gap-12 sm:gap-14">
        <div className="page-shell">
          <div className="flex flex-col items-center text-center gap-4">
            <h2 className="section-title heading-underlined heading-underlined-center text-center">
              {t("partnerTitle")}
            </h2>
            <p className="max-w-2xl text-base text-ink-muted leading-relaxed">
              {t("partnerSubtitle")}
            </p>
          </div>
        </div>

        <BrandMarquee brands={partnerBrands} />

        <div className="page-shell">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            {[
              { key: "countries", value: t("stats.countries.value"), suffix: t("stats.countries.suffix"), label: t("stats.countries.label"), sub: t("stats.countries.sub") },
              { key: "brands", value: t("stats.brands.value"), suffix: t("stats.brands.suffix"), label: t("stats.brands.label"), sub: t("stats.brands.sub") },
              { key: "projects", value: t("stats.projects.value"), suffix: t("stats.projects.suffix"), label: t("stats.projects.label"), sub: t("stats.projects.sub") },
              { key: "support", value: t("stats.support.value"), suffix: t("stats.support.suffix"), label: t("stats.support.label"), sub: t("stats.support.sub") },
            ].map((stat) => (
              <div
                key={stat.key}
                className="group relative flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6 lg:p-7 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <div className="flex items-baseline font-bold tracking-tight text-white">
                    <span className="text-3xl sm:text-4xl lg:text-[46px] leading-none tabular-nums">
                      {stat.value}
                    </span>
                    {stat.suffix ? (
                      <span className="ml-0.5 text-xl sm:text-2xl lg:text-3xl font-semibold text-[#c7000b]">
                        {stat.suffix}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-sm sm:text-base lg:text-lg font-semibold text-white/95 transition-colors group-hover:text-white">
                    {stat.label}
                  </div>
                  <div className="text-xs sm:text-sm text-ink-muted/80 leading-relaxed">
                    {stat.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>



    <section className="home-product-series" data-reveal><div className="home-product-series-inner page-shell section-pad flex flex-col gap-12"><div className="home-product-series-heading"><h2>{t("productTitle")}</h2><p>{t("productBody")}</p></div><div className="home-product-series-grid">{seriesCards.map((item) => <Link className="home-media-card home-product-series-card group" href={item.href} key={item.key}><div className="home-media-card-visual home-product-series-media">{item.image ? <Image src={item.image.src} alt={item.image.alt} width={item.image.width} height={item.image.height} sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1023px) 50vw, 33vw" /> : <span className="home-product-series-media-empty" aria-hidden="true" />}</div><div className="home-product-series-copy"><h3 className="home-interactive-title">{item.title}</h3><p>{item.description}</p><span className="home-product-series-link">{common("details")}<ArrowRightIcon className="motion-arrow" aria-hidden="true" /></span></div></Link>)}</div></div></section>

    <HomeProductCarousel groups={productGroups} locale={locale} labels={{ categories: t("productCarousel.categories"), previous: t("productCarousel.previous"), next: t("productCarousel.next"), viewAll: t("productCarousel.viewAll"), empty: t("productCarousel.empty") }} />

    {featuredSolutions.length ? (
      <section className="home-solutions-section" data-reveal>
        <div className="home-solutions-inner page-shell section-pad flex flex-col gap-12">
          <SectionHeading eyebrow="Solutions" title={t("solutionTitle")} description={t("solutionBody")} />
          <div className="home-solutions-grid">
            {featuredSolutions.map((solution) => {
              const image = getIndustryVisual(solution.key ?? solution.slug, solution.title);
              const objectPosition = "objectPosition" in image && typeof image.objectPosition === "string" ? image.objectPosition : undefined;
              return (
                <article className="home-solution-tile" key={solution.id}>
                  <Link href={`/solutions/${solution.slug}`} className="home-solution-tile-link" aria-label={solution.title}>
                    <Image className="home-solution-tile-image" src={image.src} alt={image.alt} fill sizes="(max-width: 767px) calc(100vw - 2.5rem), 50vw" style={{ objectPosition }} />
                    <span className="home-solution-tile-overlay" aria-hidden="true" />
                    <div className="home-solution-tile-copy">
                      <h3>{solution.title}</h3>
                      <p>{solution.summary}</p>
                      <span className="home-solution-tile-action">{common("details")}<ArrowRightIcon aria-hidden="true" /></span>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    ) : null}

    {caseStudy && news ? <section className="page-shell section-pad grid gap-14 lg:grid-cols-[.75fr_1.25fr]" data-reveal><SectionHeading eyebrow="Proof" title={t("caseTitle")} /><div className="flex flex-col divide-y border-y"><Link href={`/cases/${caseStudy.slug}`} className="home-story-link group flex items-start justify-between gap-6 py-8"><div className="min-w-0 flex flex-col gap-3"><span className="text-xs text-muted-foreground">CASE / 01</span><h3 className="home-interactive-title text-xl font-medium">{caseStudy.title}</h3><p className="leading-7 text-muted-foreground">{caseStudy.summary}</p></div><ArrowRightIcon className="motion-arrow shrink-0" aria-hidden="true" /></Link><Link href={`/news/${news.slug}`} className="home-story-link group flex items-start justify-between gap-6 py-8"><div className="min-w-0 flex flex-col gap-3"><span className="text-xs text-muted-foreground">NEWS / 01</span><h3 className="home-interactive-title text-xl font-medium">{news.title}</h3><p className="leading-7 text-muted-foreground">{news.summary}</p></div><ArrowRightIcon className="motion-arrow shrink-0" aria-hidden="true" /></Link></div></section> : null}

    <section className="bg-primary text-primary-foreground" data-reveal><div className="page-shell flex flex-col items-start justify-between gap-8 py-14 md:flex-row md:items-center"><div className="flex max-w-3xl flex-col gap-3"><h2 className="text-2xl font-semibold leading-snug text-balance md:text-3xl">{t("finalTitle")}</h2><p className="leading-7 opacity-85">{t("finalBody")}</p></div><Button size="lg" variant="secondary" nativeButton={false} render={<Link href="/contact" />}>{common("inquiry")}<ArrowRightIcon data-icon="inline-end" /></Button></div></section>
  </main>;
}
