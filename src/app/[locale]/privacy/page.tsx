import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata, webPageSchema } from "@/lib/seo";
import type { Locale } from "@/types/domain";

type Props = { params: Promise<{ locale: string }> };

const copy: Record<Locale, readonly [string, string]> = {
  zh: [
    "隐私政策",
    "我们只收集处理询价所需的姓名、联系方式、国家或地区、感兴趣的产品分类和需求信息。询价信息默认保留 24 个月，仅供授权销售及管理员处理。您可以联系我们申请访问、更正或删除。网站统计不采集表单内容或联系方式。"
  ],
  en: [
    "Privacy policy",
    "We collect only the name, contact details, country or region, product category of interest, and requirements needed to process an inquiry. Inquiry data is retained for 24 months by default and is available only to authorized sales staff and administrators. You may request access, correction, or deletion. Website analytics do not collect form content or contact details."
  ],
  ru: [
    "Политика конфиденциальности",
    "Мы собираем только имя, контактные данные, страну или регион, интересующую категорию товара и требования, необходимые для обработки запроса. По умолчанию данные хранятся 24 месяца и доступны только уполномоченным сотрудникам. Можно запросить доступ, исправление или удаление. Аналитика не собирает содержимое форм и контакты."
  ],
  fr: [
    "Politique de confidentialité",
    "Nous ne collectons que le nom, les coordonnées, le pays ou la région, la catégorie de produit d'intérêt et les besoins nécessaires au traitement d'une demande. Les données de demande sont conservées par défaut pendant 24 mois et ne sont accessibles qu'au personnel commercial et aux administrateurs autorisés. Vous pouvez demander l'accès, la rectification ou la suppression de vos données."
  ],
  de: [
    "Datenschutzrichtlinie",
    "Wir erfassen ausschließlich den Namen, Kontaktdaten, das Land oder die Region, die gewünschte Produktkategorie und die Anforderungen, die zur Bearbeitung einer Anfrage erforderlich sind. Anfragedaten werden standardmäßig 24 Monate aufbewahrt und sind nur autorisierten Vertriebsmitarbeitern und Administratoren zugänglich. Sie können Auskunft, Berichtigung oder Löschung verlangen."
  ],
  es: [
    "Política de privacidad",
    "Solo recopilamos el nombre, los datos de contacto, el país o región, la categoría de producto de interés y los requisitos necesarios para procesar una solicitud de cotización. Los datos de las solicitudes se conservan durante 24 meses por defecto y están disponibles únicamente para el personal de ventas y administradores autorizados. Puede solicitar el acceso, rectificación o eliminación."
  ],
  ar: [
    "سياسة الخصوصية",
    "نجمع فقط الاسم ومعلومات الاتصال والدولة أو المنطقة وفئة المنتجات المطلوبة وتفاصيل الاحتياجات اللازمة لمعالجة طلب عرض الأسعار. يتم الاحتفاظ ببيانات الطلبات لمدة 24 شهراً كإجراء افتراضي وتتاح فقط لمسؤولي المبيعات والإدارة المعتمدين. يحق لك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها."
  ]
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const content = copy[locale];
  return localizedMetadata(locale, "/privacy", content[0], content[1]);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  const content = copy[locale];
  return (
    <main id="main-content" className="page-shell section-pad">
      <JsonLd data={webPageSchema(locale, "/privacy", content[0], content[1])} />
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
