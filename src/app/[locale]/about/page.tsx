import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRightIcon,
  Building2Icon,
  CheckCircle2Icon,
  ClockIcon,
  CpuIcon,
  ExternalLinkIcon,
  Globe2Icon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  RadioTowerIcon,
  ServerIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { aboutData } from "@/content/about";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata, organizationSchema, webPageSchema } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

const scenarioIconMap = {
  server: ServerIcon,
  tower: RadioTowerIcon,
  cpu: CpuIcon,
  shield: ShieldCheckIcon,
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  const content = aboutData[locale];
  return localizedMetadata(locale, "/about", content.title, content.lead);
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  const content = aboutData[locale];

  return (
    <main id="main-content" className="flex flex-col">
      <JsonLd
        data={[
          organizationSchema(locale),
          webPageSchema(locale, "/about", content.title, content.lead, "AboutPage"),
        ]}
      />

      {/* Hero / Header Section with Earth Background */}
      <header className="relative overflow-hidden bg-[#0a0d12] text-white">
        {/* Background Earth Image with Gradients for Maximum Legibility */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/about/hero-earth.webp"
            alt="Global telecommunications and energy infrastructure network"
            fill
            priority
            quality={92}
            sizes="100vw"
            className="object-cover object-[65%_center] sm:object-center opacity-90"
          />
          {/* Horizontal contrast gradient protecting left-side text */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0d12]/95 via-[#0a0d12]/75 to-transparent sm:via-[#0a0d12]/55" />
          {/* Vertical subtle edge blend gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0d12]/50 via-transparent to-[#0a0d12]/95" />
        </div>

        <div className="page-shell relative z-10 py-16 sm:py-20 lg:py-28 flex flex-col gap-12 sm:gap-16">
          <div className="flex max-w-4xl flex-col gap-6">
            {content.slogan ? (
              <div className="inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-[#c7000b]">
                <span className="inline-block h-2 w-2 rounded-full bg-[#c7000b]" aria-hidden="true" />
                <span>{content.slogan}</span>
              </div>
            ) : null}
            <h1 className="section-title heading-underlined heading-underlined-left text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              {content.title}
            </h1>
            <p className="max-w-3xl text-base sm:text-lg lg:text-xl leading-relaxed text-white/85">
              {content.lead}
            </p>
          </div>

          {/* High-impact Metrics Cards with Frosted Glass Backdrop */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            {content.stats.map((stat, i) => (
              <div
                key={i}
                className="group relative flex flex-col justify-between rounded-xl border border-white/15 bg-black/40 p-5 sm:p-6 backdrop-blur-md transition-all hover:border-white/30 hover:bg-black/55"
              >
                <div>
                  <div className="flex items-baseline font-bold tracking-tight text-white">
                    <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-none tabular-nums">
                      {stat.value}
                    </span>
                    {stat.suffix ? (
                      <span className="ml-1 text-xl sm:text-2xl lg:text-3xl font-bold text-[#c7000b]">
                        {stat.suffix}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2.5 text-sm sm:text-base font-semibold text-white/95">
                    {stat.label}
                  </div>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-white/70 leading-relaxed">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Mission-Critical Application Scenarios */}
      <section className="border-y border-border/70 bg-muted/30">
        <div className="page-shell section-pad flex flex-col gap-10 sm:gap-12">
          <div className="flex flex-col gap-3">
            <h2 className="section-title heading-underlined heading-underlined-left text-2xl sm:text-3xl font-bold text-foreground">
              {content.scenariosTitle}
            </h2>
            <p className="max-w-3xl text-sm sm:text-base text-muted-foreground">
              {content.scenariosSubtitle}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {content.scenarios.map((scenario) => {
              const Icon = scenarioIconMap[scenario.iconName];
              return (
                <div
                  key={scenario.id}
                  className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card p-6 sm:p-7 transition-all hover:border-border hover:shadow-[0_4px_20px_rgb(0_0_0_/_5%)]"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">
                        SCENARIO
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                      {scenario.title}
                    </h3>
                    <div className="inline-flex w-fit rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-medium text-foreground/80 border border-border/40">
                      {scenario.specs}
                    </div>
                    <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                      {scenario.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Authenticity & Engineering Standards (High-contrast ink theme) */}
      <section className="bg-ink text-ink-foreground relative overflow-hidden">
        <div className="page-shell section-pad flex flex-col gap-10 sm:gap-12">
          <div className="flex flex-col gap-3">
            <h2 className="section-title heading-underlined heading-underlined-left text-2xl sm:text-3xl font-bold text-white">
              {content.commitmentsTitle}
            </h2>
            <p className="max-w-3xl text-sm sm:text-base text-ink-muted">
              {content.commitmentsSubtitle}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {content.commitments.map((commitment) => (
              <div
                key={commitment.id}
                className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex flex-col gap-4">
                  <span className="w-fit rounded border border-[#c7000b]/40 bg-[#c7000b]/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-[#c7000b]">
                    {commitment.tag}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white">
                    {commitment.title}
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed text-ink-muted">
                    {commitment.description}
                  </p>
                  <ul className="mt-2 flex flex-col gap-2.5 border-t border-white/10 pt-4">
                    {commitment.highlights.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-white/90">
                        <CheckCircle2Icon className="h-4 w-4 shrink-0 text-[#c7000b] mt-0.5" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proven Global Track Record */}
      <section className="page-shell section-pad flex flex-col gap-10 sm:gap-12">
        <div className="flex flex-col gap-3">
          <h2 className="section-title heading-underlined heading-underlined-left text-2xl sm:text-3xl font-bold text-foreground">
            {content.projectsTitle}
          </h2>
          <p className="max-w-3xl text-sm sm:text-base text-muted-foreground">
            {content.projectsSubtitle}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {content.projects.map((project) => (
            <div
              key={project.id}
              className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-6 sm:p-7 transition-all hover:border-foreground/20"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span className="font-semibold text-primary">{project.region}</span>
                  <span>{project.sector}</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground leading-snug">
                  {project.title}
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  {project.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Standardized 5-Step Procurement Workflow */}
      <section className="border-y border-border/70 bg-muted/30">
        <div className="page-shell section-pad flex flex-col gap-10 sm:gap-12">
          <div className="flex flex-col gap-3">
            <h2 className="section-title heading-underlined heading-underlined-left text-2xl sm:text-3xl font-bold text-foreground">
              {content.processTitle}
            </h2>
            <p className="max-w-3xl text-sm sm:text-base text-muted-foreground">
              {content.processSubtitle}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {content.steps.map((step) => (
              <div
                key={step.step}
                className="relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-5 transition-all hover:border-foreground/20"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-3xl font-extrabold text-[#c7000b]">
                      {step.step}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      STEP
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <div className="text-xs font-medium text-foreground/80">
                    {step.summary}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Corporate Info & Direct Contact */}
      <section className="page-shell section-pad flex flex-col gap-10 sm:gap-12">
        <div className="flex flex-col gap-3">
          <h2 className="section-title heading-underlined heading-underlined-left text-2xl sm:text-3xl font-bold text-foreground">
            {content.companySectionTitle}
          </h2>
          <p className="max-w-3xl text-sm sm:text-base text-muted-foreground">
            {content.companySectionSubtitle}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Building2Icon className="h-5 w-5 text-primary mt-1 shrink-0" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {content.companyInfo.legalNameLabel}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {content.companyInfo.legalName}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2Icon className="h-5 w-5 text-primary mt-1 shrink-0" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {content.companyInfo.brandLabel}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {content.companyInfo.brand}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPinIcon className="h-5 w-5 text-primary mt-1 shrink-0" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {content.companyInfo.locationLabel}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {content.companyInfo.location}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe2Icon className="h-5 w-5 text-primary mt-1 shrink-0" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {content.companyInfo.websiteLabel}
                  </span>
                  <a
                    href={content.companyInfo.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    {content.companyInfo.websiteUrl}
                    <ExternalLinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MailIcon className="h-5 w-5 text-primary mt-1 shrink-0" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {content.companyInfo.emailLabel}
                  </span>
                  <a
                    href={`mailto:${content.companyInfo.email}`}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {content.companyInfo.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <PhoneIcon className="h-5 w-5 text-primary mt-1 shrink-0" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {content.companyInfo.phoneLabel}
                  </span>
                  <a
                    href={`tel:${content.companyInfo.phone.replace(/\s+/g, "")}`}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {content.companyInfo.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:col-span-2 border-t border-border/60 pt-4">
                <ClockIcon className="h-5 w-5 text-primary mt-1 shrink-0" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {content.companyInfo.hoursLabel}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {content.companyInfo.hours}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-6 rounded-xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
            <div className="flex flex-col gap-3">
              <span className="w-fit rounded-full bg-[#c7000b] px-3 py-1 text-xs font-semibold text-white">
                B2B INQUIRY
              </span>
              <h3 className="text-xl font-bold text-foreground">
                {content.ctaTitle}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {content.ctaSubtitle}
              </p>
            </div>

            <Button
              size="lg"
              className="w-full bg-[#c7000b] text-white hover:bg-[#a80009]"
              nativeButton={false}
              render={<Link href="/contact" />}
            >
              {content.ctaButtonText}
              <ArrowRightIcon className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
