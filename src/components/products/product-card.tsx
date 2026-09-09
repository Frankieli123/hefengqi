import { ViewTransition } from "react";
import NextLink from "next/link";
import Image from "next/image";
import { ArrowRightIcon, GitCompareArrowsIcon, MailIcon } from "lucide-react";
import { ProductVisual } from "@/components/product-visual";
import type { Locale, ProductView } from "@/types/domain";
import { cn } from "@/lib/utils";

export function ProductCard({ product, locale, compareHref, selected, compareDisabled, labels }: { product: ProductView; locale: Locale; compareHref: string; selected: boolean; compareDisabled: boolean; labels: { details: string; inquiry: string; compare: string; model: string } }) {
  const detailHref = `/${locale}/products/${product.slug}`;
  return (
    <ViewTransition key={product.id}>
      <article className="product-catalog-card">
        <NextLink href={detailHref} prefetch transitionTypes={["nav-forward"]} className="product-card-media" data-umami-event="product-view" aria-label={`${labels.details}: ${product.name}`}>
          <ViewTransition name={`product-image-${product.id}`} share="product-morph" default="none">
            {product.image ? (
              <div className="product-card-image aspect-4/3 overflow-hidden bg-muted">
                <Image src={product.image.src} alt={product.image.alt} width={product.image.width} height={product.image.height} sizes="(max-width: 767px) 50vw, (max-width: 1279px) 36vw, 24vw" className="size-full object-contain" />
              </div>
            ) : <ProductVisual model={product.model} />}
          </ViewTransition>
        </NextLink>

        <div className="product-card-copy">
          <div className="product-card-meta"><span>{product.brand}</span><span>{labels.model}: {product.model}</span></div>
          <h2 className="product-card-title">
            <NextLink href={detailHref} prefetch transitionTypes={["nav-forward"]}>{product.name}</NextLink>
          </h2>
          <p className="product-card-description">{product.shortDescription}</p>
          <dl className="product-card-specs">
            {product.attributes.slice(0, 2).map((item) => (
              <div key={item.key}><dt>{item.label}</dt><dd>{item.value}{item.unit ? ` ${item.unit}` : ""}</dd></div>
            ))}
          </dl>
        </div>

        <div className="product-card-actions">
          <NextLink className="product-card-action" href={detailHref} prefetch transitionTypes={["nav-forward"]} data-umami-event="product-view" aria-label={`${labels.details}: ${product.name}`}>
            <ArrowRightIcon data-icon="inline-end" aria-hidden /><span>{labels.details}</span>
          </NextLink>
          <NextLink className="product-card-action" href={`/${locale}/contact?productId=${product.id}`} data-umami-event="inquiry-click" aria-label={`${labels.inquiry}: ${product.name}`}>
            <MailIcon aria-hidden /><span>{labels.inquiry}</span>
          </NextLink>
          {compareDisabled && !selected ? (
            <span className="product-card-action is-disabled" aria-disabled="true" title={labels.compare}><GitCompareArrowsIcon aria-hidden /><span>{labels.compare}</span></span>
          ) : (
            <NextLink className={cn("product-card-action", selected && "is-selected")} href={compareHref} scroll={false} data-umami-event="compare-add" aria-label={`${labels.compare}: ${product.name}`}>
              <GitCompareArrowsIcon aria-hidden /><span>{labels.compare}</span>
            </NextLink>
          )}
        </div>
      </article>
    </ViewTransition>
  );
}
