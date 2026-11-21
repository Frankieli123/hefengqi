import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowRightIcon, MailIcon } from "lucide-react";
import { ProductVisual } from "@/components/product-visual";
import { formatBrandName } from "@/lib/brand";
import type { Locale, ProductImageView, ProductListView } from "@/types/domain";
import type { HomeProductCardView } from "@/types/home-products";

function CardImage({ image, sizes, priority = false }: { image: ProductImageView; sizes: string; priority?: boolean }) {
  const className = "size-full object-contain";
  if (!image.cardSrcSet) {
    return <Image src={image.src} alt={image.alt} width={image.width} height={image.height} unoptimized={image.src.endsWith(".webp")} sizes={sizes.replace(/^auto, /, "")} priority={priority} className={className} />;
  }
  return <picture className="block size-full">
    <source type="image/webp" srcSet={image.cardSrcSet} sizes={sizes} />
    <Image unoptimized loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} src={image.src} alt={image.alt} width={image.width} height={image.height} className={className} />
  </picture>;
}

/** Compact image-led card for homepage shelves; the whole card is one link. */
export function ProductPreviewCard({ product, locale }: { product: HomeProductCardView; locale: Locale }) {
  return <Link href={`/products/${product.slug}`} locale={locale}  className="product-catalog-card" data-umami-event="product-view">
    <div className="product-card-media">
      {product.image ? <div className="product-card-image aspect-square overflow-hidden bg-white">
        <CardImage image={product.image} sizes="auto, (max-width: 767px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, 200px" />
      </div> : <ProductVisual model={product.model} />}
    </div>
    <div className="product-card-copy">
      <span className="product-card-meta">{formatBrandName(product.brandDisplayName ?? product.brand)}</span>
      <h3 className="product-card-title" dir="auto" title={product.model}>{product.model}</h3>
    </div>
  </Link>;
}

export function ProductCard({
  product,
  locale,
  labels,
  headingAs: Heading = "h2",
  imageSizes = "(max-width: 767px) 50vw, (max-width: 1279px) 36vw, 24vw",
  priority = false
}: {
  product: ProductListView;
  locale: Locale;
  labels: { details: string; inquiry: string; model: string };
  headingAs?: "h2" | "h3";
  imageSizes?: string;
  priority?: boolean;
}) {
  const detailHref = `/products/${product.slug}`;

  return (
    <article className="product-catalog-card">
      <Link
        href={detailHref}
        locale={locale}
        className="product-card-media"
        data-umami-event="product-view"
        aria-label={`${labels.details}: ${product.name}`}
      >
        {product.image ? (
          <div className="product-card-image aspect-square overflow-hidden bg-white">
            <CardImage image={product.image} sizes={priority ? imageSizes.replace(/^auto, /, "") : imageSizes} priority={priority} />
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
          <Link href={detailHref} locale={locale}>{product.name}</Link>
        </Heading>
        <p className="product-card-description">{product.shortDescription}</p>
      </div>

      <div className="product-card-actions">
        <Link
          className="product-card-action"
          href={detailHref}
          locale={locale}
          data-umami-event="product-view"
          aria-label={`${labels.details}: ${product.name}`}
        >
          <ArrowRightIcon data-icon="inline-end" aria-hidden />
          <span>{labels.details}</span>
        </Link>
        <form action={`/${locale}/contact`} method="get" className="contents">
          <input type="hidden" name="productId" value={product.id} />
          <button type="submit" className="product-card-action cursor-pointer" data-umami-event="inquiry-click" aria-label={`${labels.inquiry}: ${product.name}`}>
            <MailIcon aria-hidden />
            <span>{labels.inquiry}</span>
          </button>
        </form>
      </div>
    </article>
  );
}
