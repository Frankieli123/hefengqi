import { ArrowRightIcon } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { EditorialItem } from "@/types/domain";
import type { Locale } from "@/types/domain";
import { collectionPageSchema } from "@/lib/seo";

export function EditorialIndex({ locale, eyebrow, title, description, basePath, items, detailsLabel }: { locale: Locale; eyebrow: string; title: string; description: string; basePath: string; items: EditorialItem[]; detailsLabel: string }) {
  return <main id="main-content"><JsonLd data={collectionPageSchema(locale, basePath, title, description, items.map((item) => ({ name: item.title, path: `${basePath}/${item.slug}` })))} /><section className="bg-ink text-ink-foreground"><div className="page-shell py-16 md:py-24"><span className="eyebrow">{eyebrow}</span><h1 className="mt-6 max-w-4xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">{title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-ink-muted">{description}</p></div></section><section className="page-shell section-pad"><div className="flex flex-col border-y divide-y">{items.map((item, index) => <article key={item.id} className="grid gap-5 py-9 md:grid-cols-[6rem_1fr_auto] md:items-center"><span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><div className="flex max-w-3xl flex-col gap-3"><h2 className="text-2xl font-medium md:text-3xl">{item.title}</h2><p className="leading-7 text-muted-foreground">{item.summary}</p><time className="text-xs text-muted-foreground" dateTime={item.updatedAt}>{item.updatedAt}</time></div><Button variant="ghost" nativeButton={false} render={<Link locale={locale} href={`${basePath}/${item.slug}`} />} >{detailsLabel}<ArrowRightIcon data-icon="inline-end" /></Button></article>)}</div></section></main>;
}
