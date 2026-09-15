import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowRightIcon, MailIcon } from "lucide-react";
import { ProductVisual } from "@/components/product-visual";
import { formatBrandName } from "@/lib/brand";
import type { Locale, ProductView } from "@/types/domain";

export function ProductCard({
  product,
  locale,
  labels,
  headingAs: Heading = "h2",
  imageSizes = "(max-width: 767px) 50vw, (max-width: 1279px) 36vw, 24vw"
}: {
  product: ProductView;
  locale: Locale;
  labels: { details: string; inquiry: string; model: string };
  headingAs?: "h2" | "h3";
  imageSizes?: string;
}) {
  const detailHref = `/products/${product.slug}`;

  return (
    <article className="product-catalog-card">
      <Link
        href={detailHref}
        locale={locale}
        prefetch
        className="product-card-media"
        data-umami-event="product-view"
        aria-label={`${labels.details}: ${product.name}`}
      >
        {product.image ? (
          <div className="product-card-image aspect-square overflow-hidden bg-white">
            <Image
              src={product.image.src}
              alt={product.image.alt}
              width={product.image.width}
              height={product.image.height}
              sizes={imageSizes}
              className="size-full object-contain"
            />
          </div>
        ) : (
          <ProductVisual model={product.model} />
        )}
      </Link>

      <div className="product-card-copy">
        <div className="product-card-meta">
          <span>{formatBrandName(product.brandDisplayName ?? product.brand)}</span>
          <span>{labels.model}: {product.model}</span>
        </div>
        <Heading className="product-card-title">
          <Link href={detailHref} locale={locale} prefetch>{product.name}</Link>
        </Heading>
        <p className="product-card-description">{product.shortDescription}</p>
      </div>

      <div className="product-card-actions">
        <Link
          className="product-card-action"
          href={detailHref}
          locale={locale}
          prefetch
          data-umami-event="product-view"
          aria-label={`${labels.details}: ${product.name}`}
        >
          <ArrowRightIcon data-icon="inline-end" aria-hidden />
          <span>{labels.details}</span>
        </Link>
        <Link
          className="product-card-action"
          href={`/contact?productId=${product.id}`}
          locale={locale}
          data-umami-event="inquiry-click"
          aria-label={`${labels.inquiry}: ${product.name}`}
        >
          <MailIcon aria-hidden />
          <span>{labels.inquiry}</span>
        </Link>
      </div>
    </article>
  );
}
