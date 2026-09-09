import Image from "next/image";
import { Link } from "@/i18n/navigation";

function BrandMarkContent() {
  return <>
    <Image
      aria-hidden
      className="brand-mark-symbol size-9 shrink-0 object-contain"
      src="/brand/hefengqi-mark.png"
      alt=""
      width={36}
      height={36}
    />
    <span className="brand-mark-word font-heading text-base font-semibold tracking-[0.16em]" translate="no">HEFENGQI</span>
  </>;
}

const className = "brand-mark inline-flex items-center gap-2.5";

export function BrandMark() {
  return (
    <Link href="/" className={className} aria-label="HEFENGQI">
      <BrandMarkContent />
    </Link>
  );
}

export function AdminBrandMark() {
  return <a href="/en" className={className} aria-label="HEFENGQI"><BrandMarkContent /></a>;
}
