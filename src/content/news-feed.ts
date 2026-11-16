import type { Locale, NewsCategory } from "@/types/domain";

type NewsFeedCopy = {
  home: string;
  news: string;
  clear: string;
  latest: string;
  order: string;
  results: string;
  noResults: string;
  guideTitle: string;
  guideDescription: string;
  categoryDescriptions: Record<NewsCategory, string>;
  supportTitle: string;
  supportDescription: string;
  supportLink: string;
};

export const newsFeedCopy: Record<Locale, NewsFeedCopy> = {
  zh: {
    home: "首页", news: "新闻动态",
    clear: "清除筛选",
    latest: "最新文章", order: "按发布时间排序", results: "{count} 篇文章",
    noResults: "没有找到相关文章",
    guideTitle: "栏目导读", guideDescription: "从行业观察到设备应用，按阅读需要查找内容。",
    categoryDescriptions: {
      INDUSTRY_INSIGHTS: "了解通信、能源与数据中心的技术变化。",
      BUYING_GUIDE: "梳理参数、适用条件与设备选择要点。",
      TUTORIAL_GUIDE: "查阅接口、配置与日常维护的实践参考。",
    },
    supportTitle: "需要定制解决方案？", supportDescription: "我们的工程师免费为您确定合适的系统配置。", supportLink: "联系我们",
  },
  en: {
    home: "Home", news: "News",
    clear: "Clear filters",
    latest: "Latest articles", order: "Newest published first", results: "Articles: {count}",
    noResults: "No matching articles",
    guideTitle: "Explore the topics", guideDescription: "Find the right perspective, from industry context to equipment use.",
    categoryDescriptions: {
      INDUSTRY_INSIGHTS: "Technology developments across communications, energy and data centers.",
      BUYING_GUIDE: "Specifications, application conditions and equipment selection.",
      TUTORIAL_GUIDE: "Practical references for interfaces, configuration and routine maintenance.",
    },
    supportTitle: "Need a tailored solution?", supportDescription: "Our engineers will help you identify a suitable system configuration at no charge.", supportLink: "Contact us",
  },
  ru: {
    home: "Главная", news: "Новости",
    clear: "Сбросить фильтры",
    latest: "Последние материалы", order: "Сначала новые публикации", results: "Материалов: {count}",
    noResults: "Материалы не найдены",
    guideTitle: "Навигация по темам", guideDescription: "От отраслевого контекста до применения оборудования — выберите нужную тему.",
    categoryDescriptions: {
      INDUSTRY_INSIGHTS: "Развитие технологий связи, энергетики и центров обработки данных.",
      BUYING_GUIDE: "Характеристики, условия применения и критерии выбора оборудования.",
      TUTORIAL_GUIDE: "Практические материалы об интерфейсах, настройке и обслуживании.",
    },
    supportTitle: "Нужно индивидуальное решение?", supportDescription: "Наши инженеры бесплатно помогут подобрать подходящую конфигурацию системы.", supportLink: "Связаться с нами",
  },
  fr: {
    home: "Accueil", news: "Actualités", clear: "Effacer les filtres", latest: "Derniers articles", order: "Trier par date", results: "{count} articles",
    noResults: "Aucun article trouvé", guideTitle: "Explorer les sujets", guideDescription: "Trouvez le bon angle, du contexte sectoriel à l'utilisation des équipements.",
    categoryDescriptions: { INDUSTRY_INSIGHTS: "Évolutions technologiques dans les télécommunications, l'énergie et les centres de données.", BUYING_GUIDE: "Spécifications, conditions d'application et critères de sélection.", TUTORIAL_GUIDE: "Références pratiques pour les interfaces, la configuration et la maintenance." },
    supportTitle: "Besoin de documentation technique ?", supportDescription: "Téléchargez des manuels officiels et des spécifications.", supportLink: "Voir le support"
  },
  de: {
    home: "Startseite", news: "Nachrichten", clear: "Filter löschen", latest: "Neueste Artikel", order: "Nach Datum sortieren", results: "{count} Artikel",
    noResults: "Keine Artikel gefunden", guideTitle: "Themen entdecken", guideDescription: "Finden Sie die passende Perspektive – vom Branchenkontext bis zur Gerätenutzung.",
    categoryDescriptions: { INDUSTRY_INSIGHTS: "Technologische Entwicklungen in Kommunikation, Energie und Rechenzentren.", BUYING_GUIDE: "Spezifikationen, Einsatzbedingungen und Auswahlkriterien.", TUTORIAL_GUIDE: "Praktische Hinweise zu Schnittstellen, Konfiguration und Wartung." },
    supportTitle: "Technische Dokumentation benötigt?", supportDescription: "Offizielle Handbücher und Spezifikationen herunterladen.", supportLink: "Support anzeigen"
  },
  es: {
    home: "Inicio", news: "Noticias", clear: "Borrar filtros", latest: "Últimos artículos", order: "Ordenar por fecha", results: "{count} artículos",
    noResults: "No se encontraron artículos", guideTitle: "Explorar temas", guideDescription: "Encuentre la perspectiva adecuada, desde el contexto del sector hasta el uso del equipo.",
    categoryDescriptions: { INDUSTRY_INSIGHTS: "Evolución tecnológica en comunicaciones, energía y centros de datos.", BUYING_GUIDE: "Especificaciones, condiciones de aplicación y criterios de selección.", TUTORIAL_GUIDE: "Referencias prácticas para interfaces, configuración y mantenimiento." },
    supportTitle: "¿Necesita documentación técnica?", supportDescription: "Descargue manuales oficiales y especificaciones.", supportLink: "Ver soporte"
  },
  ar: {
    home: "الرئيسية", news: "الأخبار", clear: "مسح التصفية", latest: "أحدث المقالات", order: "ترتيب حسب التاريخ", results: "{count} مقال",
    noResults: "لم يتم العثور على مقالات", guideTitle: "استكشاف الموضوعات", guideDescription: "اعثر على المنظور المناسب، من سياق القطاع إلى استخدام المعدات.",
    categoryDescriptions: { INDUSTRY_INSIGHTS: "التطورات التقنية في الاتصالات والطاقة ومراكز البيانات.", BUYING_GUIDE: "المواصفات وظروف التطبيق ومعايير اختيار المعدات.", TUTORIAL_GUIDE: "مراجع عملية للواجهات والتهيئة والصيانة." },
    supportTitle: "هل تحتاج إلى وثائق تقنية؟", supportDescription: "قم بتنزيل الكتيبات الرسمية والمواصفات الهندسية.", supportLink: "عرض الدعم الفني"
  },
};
