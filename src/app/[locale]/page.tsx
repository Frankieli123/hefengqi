import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { BrandMarquee } from "@/components/brand-marquee";
import { HomeHeroCarousel } from "@/components/home-hero-carousel";
import { HomeMotion } from "@/components/home-motion";
import { HomeTechnicalVisual } from "@/components/home-technical-visual";
import { JsonLd } from "@/components/json-ld";
import { SectionHeading } from "@/components/section-heading";
import { Link } from "@/i18n/navigation";
import { getCategories, getEditorial } from "@/lib/content-repository";
import { getHomeHeroSlides } from "@/lib/home-hero";
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

const productSeries = [
  { key: "cabinetAir", categoryKey: "cabinet-air-conditioning", image: "/images/product-series/cabinet-air-conditioner.webp", width: 1200, height: 800 },
  { key: "precisionAir", categoryKey: "precision-air-conditioning", image: "/images/product-series/precision-air-conditioner.webp", width: 1200, height: 800 },
  { key: "dcPower", categoryKey: "dc-power-systems", image: "/images/product-series/dc-power-system.webp", width: 1200, height: 800 },
  { key: "upsPower", categoryKey: "battery", image: "/images/product-series/ups-power-system.webp", width: 1200, height: 800 },
  { key: "indoorPower", search: "indoor power system", image: "/images/product-series/indoor-power-system.webp", width: 1200, height: 900 },
  { key: "kvm", search: "KVM", image: "/images/product-series/kvm-system.webp", width: 1200, height: 800 },
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });
  return localizedMetadata(locale, "", t("title"), t("description"));
}

function FallbackHero({ eyebrow, title, description, productsCta, inquiryCta }: { eyebrow: string; title: string; description: string; productsCta: string; inquiryCta: string }) {
  return <section className="home-hero home-hero-fallback"><div className="page-shell grid min-h-full gap-10 py-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-16"><div className="flex flex-col items-start gap-7"><span className="eyebrow">{eyebrow}</span><h1 className="home-hero-title">{title}</h1><p className="home-hero-summary">{description}</p><div className="flex flex-wrap gap-3"><Button size="lg" nativeButton={false} render={<Link href="/products" />}>{productsCta}<ArrowRightIcon data-icon="inline-end" /></Button><Button size="lg" variant="outline" nativeButton={false} render={<Link href="/contact" />}>{inquiryCta}</Button></div></div><HomeTechnicalVisual /></div></section>;
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const [t, common, heroSlides, solutions, industries, cases, newsItems, categories] = await Promise.all([
    getTranslations("home"),
    getTranslations("common"),
    getHomeHeroSlides(locale),
    getEditorial(locale, "solutions"),
    getEditorial(locale, "industries"),
    getEditorial(locale, "cases"),
    getEditorial(locale, "news"),
    getCategories(locale),
  ]);
  const solution = solutions[0];
  const industry = industries[0];
  const caseStudy = cases[0];
  const news = newsItems[0];
  const categoryByKey = new Map(categories.map((category) => [category.key, category]));
  const seriesCards = productSeries.map((item) => {
    const title = t(`productSeries.${item.key}.title`);
    const category = "categoryKey" in item ? categoryByKey.get(item.categoryKey) : undefined;
    const href = category ? `/products/category/${category.path}` : `/products?q=${encodeURIComponent("search" in item ? item.search : title)}`;
    return { ...item, title, description: t(`productSeries.${item.key}.description`), href };
  });

  return <main id="main-content">
    <JsonLd data={organizationSchema(locale)} />
    <HomeMotion />
    {heroSlides.length ? <HomeHeroCarousel slides={heroSlides} labels={{ previous: t("previousSlide"), next: t("nextSlide"), slide: t("slideLabel") }} /> : <FallbackHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} productsCta={t("productsCta")} inquiryCta={t("inquiryCta")} />}

    <section className="bg-ink text-ink-foreground" aria-label={t("partnerTitle")} data-reveal>
      <BrandMarquee brands={partnerBrands} />
    </section>

    <section className="bg-ink text-ink-foreground" data-reveal><div className="page-shell grid gap-12 py-20 lg:grid-cols-[.8fr_1.2fr]"><span className="eyebrow">HEFENGQI / 01</span><div className="flex flex-col gap-7"><h2 className="section-title">{t("aboutTitle")}</h2><p className="max-w-2xl text-lg leading-8 text-ink-muted">{t("aboutBody")}</p><ul className="grid gap-3 text-sm sm:grid-cols-2">{[common("products"), common("solutions"), common("inquiry"), common("contact")].map((item) => <li className="flex items-center gap-2" key={item}><CheckIcon className="text-primary" aria-hidden="true" />{item}</li>)}</ul></div></div></section>

    <section className="home-product-series" data-reveal><div className="page-shell section-pad flex flex-col gap-12"><div className="home-product-series-heading"><h2>{t("productTitle")}</h2><p>{t("productBody")}</p></div><div className="home-product-series-grid">{seriesCards.map((item) => <Link className="home-media-card home-product-series-card group" href={item.href} key={item.key}><div className="home-media-card-visual home-product-series-media"><Image src={item.image} alt={item.title} width={item.width} height={item.height} sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1023px) 50vw, 33vw" /></div><div className="home-product-series-copy"><h3 className="home-interactive-title">{item.title}</h3><p>{item.description}</p><span className="home-product-series-link">{common("details")}<ArrowRightIcon className="motion-arrow" aria-hidden="true" /></span></div></Link>)}</div></div></section>

    {solution && industry ? <section className="bg-card" data-reveal><div className="page-shell section-pad flex flex-col gap-16"><SectionHeading eyebrow="Solutions" title={t("solutionTitle")} /><div className="grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-2"><article className="home-feature-panel flex min-h-96 flex-col justify-end gap-5 bg-ink p-8 text-ink-foreground"><span className="eyebrow">01</span><h3 className="home-interactive-title text-xl font-medium">{solution.title}</h3><p className="leading-7 text-ink-muted">{solution.summary}</p><Button variant="secondary" className="self-start" nativeButton={false} render={<Link href={`/solutions/${solution.slug}`} />}>{common("details")}<ArrowRightIcon data-icon="inline-end" /></Button></article><article className="technical-grid home-feature-panel flex min-h-96 flex-col justify-end gap-5 bg-background p-8"><span className="eyebrow">02</span><h3 className="home-interactive-title text-xl font-medium">{industry.title}</h3><p className="leading-7 text-muted-foreground">{industry.summary}</p><Button variant="outline" className="self-start" nativeButton={false} render={<Link href={`/industries/${industry.slug}`} />}>{common("details")}<ArrowRightIcon data-icon="inline-end" /></Button></article></div></div></section> : null}

    {caseStudy && news ? <section className="page-shell section-pad grid gap-14 lg:grid-cols-[.75fr_1.25fr]" data-reveal><SectionHeading eyebrow="Proof" title={t("caseTitle")} /><div className="flex flex-col divide-y border-y"><Link href={`/cases/${caseStudy.slug}`} className="home-story-link group flex items-start justify-between gap-6 py-8"><div className="min-w-0 flex flex-col gap-3"><span className="text-xs text-muted-foreground">CASE / 01</span><h3 className="home-interactive-title text-xl font-medium">{caseStudy.title}</h3><p className="leading-7 text-muted-foreground">{caseStudy.summary}</p></div><ArrowRightIcon className="motion-arrow shrink-0" aria-hidden="true" /></Link><Link href={`/news/${news.slug}`} className="home-story-link group flex items-start justify-between gap-6 py-8"><div className="min-w-0 flex flex-col gap-3"><span className="text-xs text-muted-foreground">NEWS / 01</span><h3 className="home-interactive-title text-xl font-medium">{news.title}</h3><p className="leading-7 text-muted-foreground">{news.summary}</p></div><ArrowRightIcon className="motion-arrow shrink-0" aria-hidden="true" /></Link></div></section> : null}

    <section className="bg-primary text-primary-foreground" data-reveal><div className="page-shell flex flex-col items-start justify-between gap-8 py-14 md:flex-row md:items-center"><div className="flex max-w-3xl flex-col gap-3"><h2 className="text-2xl font-semibold leading-snug text-balance md:text-3xl">{t("finalTitle")}</h2><p className="leading-7 opacity-85">{t("finalBody")}</p></div><Button size="lg" variant="secondary" nativeButton={false} render={<Link href="/contact" />}>{common("inquiry")}<ArrowRightIcon data-icon="inline-end" /></Button></div></section>
  </main>;
}
