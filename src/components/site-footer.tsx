import { getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/brand-mark";
import { Link } from "@/i18n/navigation";
import { Separator } from "@/components/ui/separator";

export async function SiteFooter() {
  const t = await getTranslations("common");
  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="page-shell grid gap-12 py-14 md:grid-cols-[1.6fr_1fr_1fr]">
        <div className="flex max-w-md flex-col gap-5"><BrandMark /><p className="text-sm leading-7 text-ink-muted">Communications · Energy · Integration</p></div>
        <nav className="flex flex-col gap-3 text-sm" aria-label="Footer products"><strong>{t("products")}</strong><Link href="/products">{t("products")}</Link><Link href="/solutions">{t("solutions")}</Link><Link href="/industries">{t("industries")}</Link></nav>
        <nav className="flex flex-col gap-3 text-sm" aria-label="Footer company"><strong>{t("about")}</strong><Link href="/contact">{t("contact")}</Link><Link href="/privacy">{t("privacy")}</Link><Link href="/terms">{t("terms")}</Link></nav>
      </div>
      <div className="page-shell"><Separator className="bg-ink-border" /><div className="flex flex-col justify-between gap-3 py-6 text-xs text-ink-muted sm:flex-row"><span>© {new Date().getUTCFullYear()} HEFENGQI. {t("allRights")}</span><span>ICP information configured at launch</span></div></div>
    </footer>
  );
}
