import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata, webPageSchema } from "@/lib/seo";
import type { Locale } from "@/types/domain";

type Props = { params: Promise<{ locale: string }> };

const copy: Record<Locale, readonly [string, string]> = {
  zh: [
    "使用条款",
    "本网站产品信息用于采购沟通，不构成公开报价、库存承诺或最终技术规格。正式规格、认证、交付范围和商业条件以双方确认的文件为准。未经授权不得复制私有资料或规避网站安全措施。"
  ],
  en: [
    "Terms of use",
    "Product information supports procurement discussions and is not a public quotation, inventory commitment, or final technical specification. Final specifications, certifications, scope, and commercial terms are governed by mutually confirmed documents. Private material may not be copied and security controls may not be bypassed."
  ],
  ru: [
    "Условия использования",
    "Информация предназначена для обсуждения закупок и не является публичной офертой, подтверждением наличия или окончательной спецификацией. Характеристики, сертификаты, объём поставки и коммерческие условия определяются согласованными документами. Запрещено копировать закрытые материалы и обходить меры безопасности."
  ],
  fr: [
    "Conditions d'utilisation",
    "Les informations sur les produits facilitent les échanges commerciaux et ne constituent ni un devis public, ni un engagement de stock, ni une spécification technique définitive. Les spécifications finales, certifications, périmètres de livraison et conditions commerciales sont régis par les documents contractuels mutuellement validés."
  ],
  de: [
    "Nutzungsbedingungen",
    "Die Produktinformationen dienen der Beschaffungskommunikation und stellen weder ein öffentliches Angebot noch eine Bestandszusage oder endgültige technische Spezifikation dar. Verbindliche Spezifikationen, Zertifizierungen, Lieferumfänge und Geschäftsbedingungen werden durch gegenseitig bestätigte Dokumente geregelt."
  ],
  es: [
    "Términos de uso",
    "La información de los productos respalda las negociaciones de compras y no constituye una cotización pública, compromiso de inventario ni especificación técnica definitiva. Las especificaciones finales, certificaciones, alcance de suministro y condiciones comerciales se rigen por los documentos formalmente confirmados entre las partes."
  ],
  ar: [
    "شروط الاستخدام",
    "تُستخدم معلومات المنتجات المعروضة في هذا الموقع لتسهيل المراسلات والمفاوضات الشرائية، ولا تشكل عرض أسعار ملزماً أو التزاماً فورياً بالمخزون أو مواصفات فنية نهائية. تخضع المواصفات النهائية والشهادات ونطاق التوريد والشروط التجارية للوثائق والاتفاقيات المعتمدة بين الطرفين."
  ]
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const content = copy[locale];
  return localizedMetadata(locale, "/terms", content[0], content[1]);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  const content = copy[locale];
  return (
    <main id="main-content" className="page-shell section-pad">
      <JsonLd data={webPageSchema(locale, "/terms", content[0], content[1])} />
      <article className="mx-auto flex max-w-3xl flex-col gap-8">
        <h1 className="section-title heading-underlined heading-underlined-left">{content[0]}</h1>
        <p className="text-lg leading-9 text-muted-foreground">{content[1]}</p>
        <p className="text-sm text-muted-foreground">
          {locale === "zh"
            ? "最后更新：2026-09-14。"
            : locale === "ru"
            ? "Последнее обновление: 2026-09-14."
            : locale === "ar"
            ? "آخر تحديث: 2026-09-14."
            : locale === "fr"
            ? "Dernière mise à jour : 2026-09-14."
            : locale === "de"
            ? "Letzte Aktualisierung: 2026-09-14."
            : locale === "es"
            ? "Última actualización: 2026-09-14."
            : "Last updated: 2026-09-14."}
        </p>
      </article>
    </main>
  );
}
