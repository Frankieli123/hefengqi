import { Link } from "@/i18n/navigation";

interface BrandItem {
  name: string;
  key: string;
  href: string;
}

interface BrandMarqueeProps {
  brands: readonly BrandItem[];
}

function BrandGroup({ brands, duplicate = false }: BrandMarqueeProps & { duplicate?: boolean }) {
  return (
    <div className="brand-marquee-group" data-marquee-group aria-hidden={duplicate || undefined}>
      {brands.map((brand) => (
        <Link
          key={brand.key}
          href={brand.href}
          tabIndex={duplicate ? -1 : undefined}
          className="brand-badge group/brand flex items-center justify-center px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 text-base sm:text-2xl lg:text-3xl font-extrabold tracking-[0.18em] sm:tracking-[0.24em]"
        >
          <span>{brand.name}</span>
        </Link>
      ))}
    </div>
  );
}

export function BrandMarquee({ brands }: BrandMarqueeProps) {
  return (
    <div className="brand-marquee-viewport marquee-mask w-full relative py-4 select-none">
      <div className="brand-marquee-track">
        <BrandGroup brands={brands} />
        <BrandGroup brands={brands} duplicate />
      </div>
    </div>
  );
}
