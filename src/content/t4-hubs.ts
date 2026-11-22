import type { Locale } from "@/types/domain";

// Bounded editorial copy for the four audited category paths and three hubs.
// No model equivalence, compatibility or performance claims are introduced.
const descriptions: Record<Locale, readonly [string, string, string, string]> = {
  en: ["Explore DC power systems and rectifiers for telecom equipment. Compare the listed models and use each product record to prepare your selection or inquiry.", "Browse uninterruptible power supplies for equipment backup power. Review the available UPS models and their published product information before making an inquiry.", "Find indoor telecom power systems for communications rooms and equipment cabinets. Compare the catalog entries and review individual models for your project.", "Browse SFP optical transceivers for communications links. Compare the listed modules and check each product record for the details relevant to your selection."],
  zh: ["浏览面向通信设备的直流电源系统与整流产品。比较目录中的型号，并结合各产品已有资料进行选型或询价。", "浏览用于设备备用供电的不间断电源。查看现有 UPS 型号及产品资料，为选型和询价做好准备。", "查找用于通信机房和设备机柜的室内通信电源系统。比较目录条目，并查看具体型号的已有产品信息。", "浏览用于通信链路的 SFP 光模块。比较目录中的模块，并查看各产品资料中与选型相关的信息。"],
  ru: ["Системы питания постоянного тока и выпрямители для телекоммуникационного оборудования. Сравните модели в каталоге и изучите сведения о продукции перед выбором или запросом.", "Источники бесперебойного питания для резервного электроснабжения оборудования. Изучите доступные модели ИБП и опубликованные данные перед отправкой запроса.", "Системы питания для телекоммуникационных помещений и шкафов внутри зданий. Сравните позиции каталога и изучите отдельные модели для вашего проекта.", "Оптические модули SFP для линий связи. Сравните модули в каталоге и проверьте сведения о каждой модели перед выбором."],
  fr: ["Découvrez les systèmes d’alimentation CC et les redresseurs pour équipements télécoms. Comparez les modèles du catalogue et consultez leurs fiches pour préparer votre choix ou votre demande.", "Parcourez les onduleurs destinés à l’alimentation de secours des équipements. Consultez les modèles UPS et leurs informations produit avant de faire une demande.", "Trouvez des systèmes d’alimentation télécoms d’intérieur pour locaux techniques et armoires. Comparez les références du catalogue et consultez les modèles adaptés à votre projet.", "Parcourez les émetteurs-récepteurs optiques SFP pour les liaisons de communication. Comparez les modules et consultez chaque fiche pour préparer votre sélection."],
  de: ["Entdecken Sie Gleichstromversorgungssysteme und Gleichrichter für Telekommunikationsgeräte. Vergleichen Sie die Katalogmodelle und lesen Sie die Produktangaben für Ihre Auswahl oder Anfrage.", "Durchsuchen Sie unterbrechungsfreie Stromversorgungen zur Notstromversorgung von Geräten. Prüfen Sie die verfügbaren USV-Modelle und deren Produktinformationen vor Ihrer Anfrage.", "Finden Sie Telekommunikations-Stromversorgungssysteme für Innenräume und Geräteschränke. Vergleichen Sie die Katalogeinträge und prüfen Sie einzelne Modelle für Ihr Projekt.", "Entdecken Sie optische SFP-Transceiver für Kommunikationsverbindungen. Vergleichen Sie die Module und prüfen Sie die jeweiligen Produktangaben vor Ihrer Auswahl."],
  es: ["Explore sistemas de alimentación de CC y rectificadores para equipos de telecomunicaciones. Compare los modelos del catálogo y consulte sus fichas para preparar su selección o consulta.", "Consulte sistemas de alimentación ininterrumpida para el respaldo eléctrico de equipos. Revise los modelos UPS disponibles y sus fichas antes de realizar una consulta.", "Encuentre sistemas de alimentación de telecomunicaciones para salas técnicas y armarios de interior. Compare las referencias del catálogo y revise cada modelo para su proyecto.", "Explore transceptores ópticos SFP para enlaces de comunicaciones. Compare los módulos del catálogo y consulte cada ficha para obtener los datos necesarios para su selección."],
  ar: ["استعرض أنظمة الطاقة بالتيار المستمر والمقومات لمعدات الاتصالات. قارن الطرازات المدرجة وراجع بيانات كل منتج للتحضير للاختيار أو الاستفسار.", "تصفح وحدات إمداد الطاقة غير المنقطعة لتوفير طاقة احتياطية للمعدات. راجع طرازات UPS المتاحة ومعلوماتها المنشورة قبل إرسال استفسارك.", "اعثر على أنظمة طاقة الاتصالات الداخلية لغرف الاتصالات وخزائن المعدات. قارن عناصر الكتالوج وراجع تفاصيل كل طراز لمشروعك.", "تصفح وحدات الإرسال والاستقبال الضوئية SFP لوصلات الاتصالات. قارن الوحدات المدرجة وراجع بيانات كل منتج لتحديد ما يناسب اختيارك."]
};
export const auditedCategoryPaths = ["power/dc-power-systems", "power/ups", "power/indoor-power-systems", "optical-communications/sfp-modules"] as const;
export function auditedCategoryDescription(locale: Locale, path: string) {
  // Use the exact published translated paths; never create English-path aliases.
  const translated = ["fr", "de", "es", "ar"].includes(locale);
  const paths = translated ? [`power-${locale}/dc-power-systems-${locale}`, `power-${locale}/battery-${locale}`, `power-${locale}/indoor-power-systems-${locale}`, `optical-communications-${locale}/sfp-modules-${locale}`] : [...auditedCategoryPaths];
  const index = paths.indexOf(path);
  return index < 0 ? undefined : descriptions[locale][index];
}
export const hubTitles: Record<Locale, readonly [string, string, string]> = {
  en: ["Power & Telecom Equipment Catalog", "Power, Cooling & Telecom Solutions", "Equipment Support & Troubleshooting"],
  zh: ["电源与通信设备目录", "供电、制冷与通信解决方案", "设备支持与故障排查"],
  ru: ["Каталог оборудования питания и связи", "Решения для питания, охлаждения и связи", "Поддержка оборудования и устранение неисправностей"],
  fr: ["Catalogue d’équipements d’alimentation et télécoms", "Solutions d’alimentation, de refroidissement et de télécommunications", "Assistance et dépannage des équipements"],
  de: ["Katalog für Stromversorgungs- und Telekommunikationsgeräte", "Lösungen für Stromversorgung, Kühlung und Telekommunikation", "Gerätesupport und Fehlerbehebung"],
  es: ["Catálogo de equipos de energía y telecomunicaciones", "Soluciones de energía, refrigeración y telecomunicaciones", "Soporte y solución de problemas de equipos"],
  ar: ["كتالوج معدات الطاقة والاتصالات", "حلول الطاقة والتبريد والاتصالات", "دعم المعدات واستكشاف الأعطال وإصلاحها"]
};
export const emptyCasesCopy: Record<Locale, string> = {
  en: "No case studies are currently published. Explore the product catalog or solutions for existing equipment information.",
  zh: "目前尚未发布案例。您可以浏览产品目录或解决方案，了解现有设备信息。",
  ru: "Опубликованных проектов пока нет. Сведения об оборудовании доступны в каталоге продукции и разделе решений.",
  fr: "Aucune étude de cas n’est publiée pour le moment. Consultez le catalogue de produits ou les solutions pour découvrir les équipements.",
  de: "Derzeit sind keine Fallstudien veröffentlicht. Informationen zu vorhandenen Geräten finden Sie im Produktkatalog oder bei den Lösungen.",
  es: "Actualmente no hay casos publicados. Consulte el catálogo de productos o las soluciones para conocer los equipos disponibles.",
  ar: "لا توجد دراسات حالة منشورة حاليًا. تصفح كتالوج المنتجات أو الحلول للاطلاع على معلومات المعدات المتاحة."
};
