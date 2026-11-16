import { Link } from "@/i18n/navigation";
import type { Locale } from "@/types/domain";
import type { GuideLink } from "@/lib/guide-links";
const headings: Record<Locale, string> = {
 en: "Technical and buying guides", ru: "Технические руководства и выбор оборудования",
 fr: "Guides techniques et d’achat", de: "Technik- und Einkaufsratgeber",
 es: "Guías técnicas y de compra", ar: "أدلة فنية وإرشادات الشراء", zh: "技术与采购指南",
};
export function GuideLinks({locale, items}: {locale: Locale; items: GuideLink[]}) {
 if (!items.length) return null;
 return <section className="page-shell section-pad" aria-label={headings[locale]}>
  <h2 className="section-title mb-8">{headings[locale]}</h2>
  <div className="grid gap-6 md:grid-cols-2">{items.map(item => <article key={item.id} className="min-w-0 rounded-xl border p-6">
   <h3 className="text-lg font-semibold break-words"><Link locale={locale} href={`/news/${item.slug}`}>{item.title}</Link></h3>
   <p className="mt-3 leading-7 text-muted-foreground line-clamp-3">{item.summary}</p>
  </article>)}</div>
 </section>;
}
