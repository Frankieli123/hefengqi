import { Fragment } from "react";
import { ArrowRightIcon, CheckIcon, MailIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductCard } from "@/components/products/product-card";
import { ProductGallery } from "@/components/products/product-gallery";
import { formatBrandName } from "@/lib/brand";
import { Link } from "@/i18n/navigation";
import type { Locale, ProductView } from "@/types/domain";

type Labels = {
  home: string;
  products: string;
  inquiry: string;
  details: string;
  model: string;
  keySpecs: string;
  specValue: string;
  what: string;
  problem: string;
  who: string;
  advantages: string;
  specs: string;
  applications: string;
  faq: string;
  related: string;
  continueExploring: string;
  updated: string;
  noPrice: string;
};

export function ProductDetail({
  product,
  locale,
  labels,
  recommendations = []
}: {
  product: ProductView;
  locale: Locale;
  labels: Labels;
  recommendations?: ProductView[];
}) {
  const featuredAttributes = product.featuredAttributes ?? [];
  const featuredPlaceholderCount = (3 - (featuredAttributes.length % 3)) % 3;

  return (
    <>
      <div className="page-shell py-5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>{labels.home}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/products" />}>{labels.products}</BreadcrumbLink>
            </BreadcrumbItem>
            {product.categoryTrail?.map((category) => (
              <Fragment key={category.key}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link href={`/products/category/${category.path}`} />}>
                    {category.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </Fragment>
            ))}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <section className="product-detail-hero page-shell grid gap-10 pb-16 pt-4 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div className="lg:max-w-[42rem]">
          <ProductGallery key={product.id} images={product.images ?? (product.image ? [product.image] : [])} model={product.model} />
        </div>
        <div className="product-detail-intro flex flex-col items-start gap-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{formatBrandName(product.brand)}</Badge>
            <Badge variant="outline">{labels.model}: {product.model}</Badge>
          </div>
          <h1 className="product-detail-title text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
            {product.name}
          </h1>
          <p className="product-detail-summary text-lg leading-8 text-muted-foreground">
            {product.directDefinition}
          </p>
          <p className="text-sm text-muted-foreground">{labels.noPrice}</p>
          <Button size="lg" nativeButton={false} render={<Link href={`/contact?productId=${product.id}`} />}>
            <MailIcon data-icon="inline-start" />
            {labels.inquiry}
          </Button>
        </div>
      </section>

      {featuredAttributes.length ? (
        <section className="bg-ink text-ink-foreground">
          <dl className="page-shell grid gap-px bg-ink-border py-px md:grid-cols-3">
            {featuredAttributes.map((attribute) => (
              <div className="flex min-h-32 flex-col justify-end gap-3 bg-ink p-6" key={attribute.key}>
                <dt className="text-xs uppercase tracking-wider text-ink-muted">{attribute.label}</dt>
                <dd className="text-xl font-medium">
                  {attribute.value}
                  {(() => {
                    if (!attribute.unit) return "";
                    const val = attribute.value.toLowerCase();
                    const u = attribute.unit.toLowerCase();
                    if (val.includes(u)) return "";
                    if (u === "slots" && (val.includes("槽位") || val.includes("slot"))) return "";
                    if (u === "a" && (val.includes("a") || val.includes("安"))) return "";
                    if (u === "vac" && val.includes("vac")) return "";
                    if (u === "vdc" && val.includes("vdc")) return "";
                    return " " + attribute.unit;
                  })()}
                </dd>
              </div>
            ))}
            {Array.from({ length: featuredPlaceholderCount }, (_, index) => (
              <div aria-hidden="true" className="hidden min-h-32 bg-ink md:block" key={`featured-placeholder-${index}`} />
            ))}
          </dl>
        </section>
      ) : null}

      <div className="product-detail-content page-shell section-pad flex flex-col gap-20">
        <section aria-labelledby="product-overview" className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <h2 id="product-overview" className="section-title">{labels.what}</h2>
          <div className="flex flex-col gap-10 text-lg leading-8">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">{labels.what}</h3>
              <p>{product.whatItIs}</p>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">{labels.problem}</h3>
              <p>{product.problemSolved}</p>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">{labels.who}</h3>
              <p>{product.suitableFor}</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="advantages" className="grid gap-10 border-y py-12 lg:grid-cols-[.75fr_1.25fr]">
          <h2 id="advantages" className="section-title">{labels.advantages}</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {product.advantages.map((item) => (
              <li className="flex items-start gap-3 text-base leading-7" key={item}>
                <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                  <CheckIcon />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="specifications" className="flex flex-col gap-8">
          <h2 id="specifications" className="section-title">{labels.specs}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.keySpecs}</TableHead>
                <TableHead>{labels.specValue}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.attributes.map((attribute) => (
                <TableRow key={attribute.key}>
                  <TableCell className="font-medium">{attribute.label}</TableCell>
                  <TableCell>{attribute.value}{attribute.unit ? ` ${attribute.unit}` : ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section aria-labelledby="applications" className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <h2 id="applications" className="section-title">{labels.applications}</h2>
          <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
            {product.applications.map((item, index) => (
              <div className="min-h-32 bg-card p-6" key={item}>
                <span className="text-xs text-muted-foreground">0{index + 1}</span>
                <h3 className="mt-8 text-lg font-medium">{item}</h3>
              </div>
            ))}
          </div>
        </section>

        {product.faqs.length ? (
          <section aria-labelledby="faq" className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
            <h2 id="faq" className="section-title">{labels.faq}</h2>
            <Accordion>
              {product.faqs.map((faq, index) => (
                <AccordionItem value={`faq-${index}`} key={faq.question}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>
                    <p className="leading-7 text-muted-foreground">{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ) : null}
      </div>

      {recommendations.length ? (
        <section className="product-explore-section" aria-labelledby="continue-exploring">
          <div className="page-shell">
            <div className="product-explore-heading">
              <h2 id="continue-exploring">{labels.continueExploring}</h2>
              <p>{formatBrandName(product.brand)}</p>
            </div>
            <div className="product-explore-grid">
              {recommendations.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  locale={locale}
                  headingAs="h3"
                  imageSizes="(max-width: 767px) 50vw, (max-width: 1023px) 50vw, (max-width: 1712px) 25vw, 420px"
                  labels={{ details: labels.details, inquiry: labels.inquiry, model: labels.model }}
                />
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <Link className="product-explore-link" href="/products">
                {labels.products}
                <ArrowRightIcon className="size-4 shrink-0" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
