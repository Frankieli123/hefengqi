import Image from "next/image";
import NextLink from "next/link";
import { ViewTransition } from "react";
import { CalendarIcon, CheckIcon, GitCompareArrowsIcon, MailIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductVisual } from "@/components/product-visual";
import type { Locale, ProductView } from "@/types/domain";

type Labels = { home: string; products: string; inquiry: string; compare: string; model: string; keySpecs: string; what: string; problem: string; who: string; advantages: string; specs: string; applications: string; faq: string; related: string; updated: string; source: string; noPrice: string };

export function ProductDetail({ product, locale, labels }: { product: ProductView; locale: Locale; labels: Labels }) {
  return (
    <>
      <div className="page-shell py-5"><Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href={`/${locale}`}>{labels.home}</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbLink href={`/${locale}/products`}>{labels.products}</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{product.name}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb></div>
      <section className="page-shell grid gap-10 pb-16 pt-4 lg:grid-cols-[1fr_1fr] lg:items-center">
        <ViewTransition name={`product-image-${product.id}`} share="product-morph">
          {product.image ? <div className="aspect-4/3 overflow-hidden rounded-lg bg-muted"><Image src={product.image.src} alt={product.image.alt} width={product.image.width} height={product.image.height} sizes="(max-width: 1024px) 100vw, 50vw" className="size-full object-contain" priority /></div> : <ProductVisual model={product.model} className="rounded-lg" />}
        </ViewTransition>
        <div className="flex flex-col items-start gap-6"><div className="flex flex-wrap gap-2"><Badge variant="secondary">{product.brand}</Badge><Badge variant="outline">{labels.model}: {product.model}</Badge></div><h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl">{product.name}</h1><p className="text-lg leading-8 text-muted-foreground">{product.directDefinition}</p><p className="text-sm text-muted-foreground">{labels.noPrice}</p><div className="flex flex-wrap gap-3"><Button size="lg" nativeButton={false} render={<NextLink href={`/${locale}/contact?productId=${product.id}`} />}><MailIcon data-icon="inline-start" />{labels.inquiry}</Button><Button size="lg" variant="outline" nativeButton={false} render={<NextLink href={`/${locale}/products/compare?ids=${product.id}`} />}><GitCompareArrowsIcon data-icon="inline-start" />{labels.compare}</Button></div></div>
      </section>
      <section className="bg-ink text-ink-foreground"><div className="page-shell grid gap-px bg-ink-border py-px md:grid-cols-3">{product.attributes.slice(0, 6).map((attribute) => <div className="flex min-h-32 flex-col justify-end gap-3 bg-ink p-6" key={attribute.key}><dt className="text-xs uppercase tracking-wider text-ink-muted">{attribute.label}</dt><dd className="text-xl font-medium">{attribute.value}{attribute.unit ? ` ${attribute.unit}` : ""}</dd></div>)}</div></section>
      <div className="page-shell section-pad flex flex-col gap-20">
        <section aria-labelledby="product-overview" className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]"><h2 id="product-overview" className="section-title">{labels.what}</h2><div className="flex flex-col gap-10 text-lg leading-8"><div><h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">{labels.what}</h3><p>{product.whatItIs}</p></div><div><h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">{labels.problem}</h3><p>{product.problemSolved}</p></div><div><h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">{labels.who}</h3><p>{product.suitableFor}</p></div></div></section>
        <section aria-labelledby="advantages" className="grid gap-10 border-y py-12 lg:grid-cols-[.75fr_1.25fr]"><h2 id="advantages" className="section-title">{labels.advantages}</h2><ul className="grid gap-4 sm:grid-cols-2">{product.advantages.map((item) => <li className="flex items-start gap-3 text-base leading-7" key={item}><span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"><CheckIcon /></span>{item}</li>)}</ul></section>
        <section aria-labelledby="specifications" className="flex flex-col gap-8"><h2 id="specifications" className="section-title">{labels.specs}</h2><Table><TableHeader><TableRow><TableHead>{labels.keySpecs}</TableHead><TableHead>Value</TableHead></TableRow></TableHeader><TableBody>{product.attributes.map((attribute) => <TableRow key={attribute.key}><TableCell className="font-medium">{attribute.label}</TableCell><TableCell>{attribute.value}{attribute.unit ? ` ${attribute.unit}` : ""}</TableCell></TableRow>)}</TableBody></Table></section>
        <section aria-labelledby="applications" className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]"><h2 id="applications" className="section-title">{labels.applications}</h2><div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">{product.applications.map((item, index) => <div className="min-h-32 bg-card p-6" key={item}><span className="text-xs text-muted-foreground">0{index + 1}</span><h3 className="mt-8 text-lg font-medium">{item}</h3></div>)}</div></section>
        {product.faqs.length ? <section aria-labelledby="faq" className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]"><h2 id="faq" className="section-title">{labels.faq}</h2><Accordion>{product.faqs.map((faq, index) => <AccordionItem value={`faq-${index}`} key={faq.question}><AccordionTrigger>{faq.question}</AccordionTrigger><AccordionContent><p className="leading-7 text-muted-foreground">{faq.answer}</p></AccordionContent></AccordionItem>)}</Accordion></section> : null}
        <footer className="flex flex-col justify-between gap-4 border-t pt-6 text-sm text-muted-foreground sm:flex-row"><span className="flex items-center gap-2"><CalendarIcon />{labels.updated}: <time dateTime={product.updatedAt}>{product.updatedAt.slice(0, 10)}</time></span>{product.sourceNote ? <span>{labels.source}: {product.sourceNote}</span> : null}</footer>
      </div>
    </>
  );
}
