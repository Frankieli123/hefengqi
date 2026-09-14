import type { Locale, ProductImageView } from "@/types/domain";

type IndustryVisual = Omit<ProductImageView, "alt"> & {
  objectPosition?: string;
};

export type BrandSolutionCard = {
  key: string;
  brand: string;
  title: string;
  summary: string;
  capabilities: string[];
  image: ProductImageView;
  objectPosition?: string;
  productHref: string;
  actionLabel: string;
  sourceUrl: string;
};

type LandingCopy = {
  eyebrow: string;
  heroAlt: string;
  navLabel: string;
  nav: { method: string; industries: string; solutions: string };
  methodTitle: string;
  methodDescription: string;
  methodItems: Array<{ title: string; description: string }>;
  industriesTitle: string;
  industriesDescription: string;
  industryAction: string;
  solutionsTitle: string;
  solutionsDescription: string;
  solutionAction: string;
  sourceAction: string;
  solutionsNote: string;
  ctaTitle: string;
  ctaDescription: string;
  ctaAction: string;
};

export const industryLandingCopy: Record<string, LandingCopy> = {
  zh: {
    eyebrow: "行业与场景",
    heroAlt: "数据中心、能源与通信基础设施场景",
    navLabel: "行业应用页内导航",
    nav: { method: "方案方法", industries: "行业场景", solutions: "更多行业解决方案" },
    methodTitle: "从项目需求到可落地方案",
    methodDescription: "结合负载规模、供电条件、部署环境与运维要求，系统梳理关键供电、热管理和通信基础设施，形成便于选型、询价与交付复核的设备方案。",
    methodItems: [
      { title: "连续供电", description: "核对输入条件、负载性质、容量、冗余、备电时间和维护边界。" },
      { title: "热管理", description: "结合热负荷、气流组织、环境条件、安装空间和扩容计划选择制冷方式。" },
      { title: "通信与运维", description: "统一整理机柜、PDU、KVM、光模块、监控接口和多供应商交付边界。" },
    ],
    industriesTitle: "行业场景",
    industriesDescription: "先识别现场目标与限制，再进入对应行业查看设备组合、选型重点和复核边界。",
    industryAction: "查看行业方案",
    solutionsTitle: "更多行业解决方案",
    solutionsDescription: "来自品牌合作伙伴——VERTIV、Huawei、Delta、KSTAR、ZTE 的官方方案组合，按关键供电、热管理、站点能源与数据中心基础设施整理。",
    solutionAction: "查看相关产品",
    sourceAction: "品牌官方资料",
    solutionsNote: "方案方向依据各品牌公开资料整理；具体品牌授权、可供应型号和项目配置，以合同、制造商最新资料及项目复核结果为准。",
    ctaTitle: "需要按项目条件组合设备？",
    ctaDescription: "提交负载、备电、环境与安装条件，我们将按可核验的型号资料整理初步清单。",
    ctaAction: "提交项目需求",
  },
  en: {
    eyebrow: "Industries and environments",
    heroAlt: "Data center, energy, and communications infrastructure",
    navLabel: "On-page industry navigation",
    nav: { method: "Approach", industries: "Industry environments", solutions: "More industry solutions" },
    methodTitle: "From project requirements to a practical solution",
    methodDescription: "We combine load scale, power conditions, deployment environment, and operating requirements to define critical power, thermal, and communications infrastructure for selection, quotation, and delivery review.",
    methodItems: [
      { title: "Continuous power", description: "Confirm input, load behavior, capacity, redundancy, runtime, and maintenance boundaries." },
      { title: "Thermal management", description: "Select cooling around heat load, airflow, ambient conditions, space, and expansion plans." },
      { title: "Communications and operations", description: "Coordinate racks, PDU, KVM, optical modules, monitoring interfaces, and multi-vendor delivery boundaries." },
    ],
    industriesTitle: "Industry environments",
    industriesDescription: "Identify the operating objective and site limits first, then review the relevant equipment scope and verification points.",
    industryAction: "Explore the industry solution",
    solutionsTitle: "More industry solutions",
    solutionsDescription: "Official solution portfolios from partner brands VERTIV, Huawei, Delta, KSTAR, and ZTE, organized around critical power, thermal management, site energy, and data center infrastructure.",
    solutionAction: "View related products",
    sourceAction: "Official brand source",
    solutionsNote: "Solution directions are summarized from public brand sources. Brand authorization, available models, and project configurations remain subject to contracts, current manufacturer information, and project review.",
    ctaTitle: "Need an equipment package for your project conditions?",
    ctaDescription: "Share the load, runtime, environmental, and installation requirements so we can prepare an initial model-based shortlist.",
    ctaAction: "Submit project requirements",
  },
  ru: {
    eyebrow: "Отрасли и условия применения",
    heroAlt: "Инфраструктура центров обработки данных, энергетики и связи",
    navLabel: "Навигация по отраслевым решениям",
    nav: { method: "Методика", industries: "Отраслевые сценарии", solutions: "Другие отраслевые решения" },
    methodTitle: "От требований проекта к реализуемому решению",
    methodDescription: "Мы учитываем нагрузку, параметры питания, условия размещения и эксплуатации, чтобы определить инфраструктуру электропитания, охлаждения и связи для подбора, расчёта предложения и проверки поставки.",
    methodItems: [
      { title: "Непрерывное питание", description: "Проверяются ввод, характер нагрузки, мощность, резервирование, автономность и границы обслуживания." },
      { title: "Тепловая инфраструктура", description: "Охлаждение выбирается по тепловой нагрузке, воздушным потокам, среде, пространству и плану расширения." },
      { title: "Связь и эксплуатация", description: "Согласуются стойки, PDU, KVM, оптические модули, мониторинг и границы поставки разных производителей." },
    ],
    industriesTitle: "Отраслевые сценарии",
    industriesDescription: "Сначала определяются цели и ограничения площадки, затем — состав оборудования, критерии выбора и точки проверки.",
    industryAction: "Открыть отраслевое решение",
    solutionsTitle: "Другие отраслевые решения",
    solutionsDescription: "Официальные портфели решений брендов-партнёров VERTIV, Huawei, Delta, KSTAR и ZTE для критического питания, охлаждения, энергии площадок и инфраструктуры ЦОД.",
    solutionAction: "Связанные продукты",
    sourceAction: "Официальный источник",
    solutionsNote: "Направления решений составлены по открытым материалам брендов. Авторизация, доступность моделей и конфигурация проекта подтверждаются договором, актуальными данными производителя и проверкой проекта.",
    ctaTitle: "Нужен комплект оборудования под условия проекта?",
    ctaDescription: "Сообщите нагрузку, автономность, условия среды и монтажа — мы подготовим первоначальный перечень конкретных моделей.",
    ctaAction: "Отправить требования",
  },
};

export const industryHeroVisual: IndustryVisual = {
  src: "/images/industries/generated-v1/industry-hero.webp",
  width: 1916,
  height: 821,
  objectPosition: "64% 50%",
};

const industryVisuals: Record<string, IndustryVisual> = {
  "data-centers": {
    src: "/images/industries/generated-v1/industry-data-centers.webp",
    width: 1536,
    height: 1024,
    objectPosition: "50% 50%",
  },
  "telecom-5g": {
    src: "/images/industries/generated-v1/industry-telecom-5g.webp",
    width: 1536,
    height: 1024,
    objectPosition: "58% 50%",
  },
  healthcare: {
    src: "/images/industries/generated-v1/industry-healthcare.webp",
    width: 1536,
    height: 1024,
    objectPosition: "50% 50%",
  },
  "industrial-manufacturing": {
    src: "/images/industries/generated-v1/industry-manufacturing.webp",
    width: 1536,
    height: 1024,
    objectPosition: "56% 50%",
  },
};

export function getIndustryVisual(key: string, alt: string): ProductImageView & { objectPosition?: string } {
  const visual = industryVisuals[key] ?? industryHeroVisual;
  return { ...visual, alt };
}

const brandAssets = {
  vertiv: {
    key: "vertiv",
    brand: "VERTIV",
    image: { src: "/images/industries/generated-v1/brand-vertiv-context.webp", width: 1536, height: 1024 },
    objectPosition: "50% 50%",
    productHref: "/products?q=VERTIV",
    sourceUrl: "https://www.vertiv.com/en-us/solutions/",
  },
  huawei: {
    key: "huawei",
    brand: "Huawei",
    image: { src: "/images/industries/generated-v1/brand-huawei-context.webp", width: 1536, height: 1024 },
    objectPosition: "50% 50%",
    productHref: "/products?q=Huawei",
    sourceUrl: "https://digitalpower.huawei.com/en/data-center-facility",
  },
  delta: {
    key: "delta",
    brand: "Delta",
    image: { src: "/images/industries/generated-v1/brand-delta-context.webp", width: 1536, height: 1024 },
    objectPosition: "50% 50%",
    productHref: "/products?q=Delta",
    sourceUrl: "https://www.deltapowersolutions.com/en/mcis/data-center-solutions.php",
  },
  kstar: {
    key: "kstar",
    brand: "KSTAR",
    image: { src: "/images/industries/generated-v1/brand-kstar-context.webp", width: 1536, height: 1024 },
    objectPosition: "50% 50%",
    productHref: "/contact",
    sourceUrl: "https://www.kstar.com/solution.html",
  },
  zte: {
    key: "zte",
    brand: "ZTE",
    image: { src: "/images/industries/generated-v1/brand-zte-context.webp", width: 1536, height: 1024 },
    objectPosition: "58% 50%",
    productHref: "/products?q=ZTE",
    sourceUrl: "https://www.zte.com.cn/global/solutions_latest/smart_energy.html",
  },
} as const;

const brandCopy: Record<string, Record<keyof typeof brandAssets, { title: string; summary: string; capabilities: string[]; imageAlt: string }>> = {
  zh: {
    vertiv: { title: "关键供电与热管理基础设施", summary: "覆盖 UPS、直流电源、配电、精密制冷、机柜与集成基础设施等方向，适用于数据中心、边缘节点和通信设施。", capabilities: ["UPS 与直流电源", "精密及液冷方向", "机柜与集成设施"], imageAlt: "关键设施使用的精密制冷设备" },
    huawei: { title: "数据中心能源与站点能源", summary: "围绕关键供配电、智能制冷、模块化数据中心与通信站点能源组织设备方案，并按项目边界核对具体型号。", capabilities: ["关键供配电", "智能制冷", "站点能源"], imageAlt: "数据中心直流供电与配电机柜" },
    delta: { title: "InfraSuite 数据中心基础设施", summary: "将 UPS、配电、精密制冷、机柜和基础设施管理纳入统一数据中心架构，覆盖从设备间到模块化部署的需求。", capabilities: ["UPS 与配电", "精密制冷", "基础设施管理"], imageAlt: "用于数据中心关键供电的 UPS 设备" },
    kstar: { title: "UPS 与模块化数据中心", summary: "面向关键负载保护、精密制冷和模块化机房建设，按容量、空间、部署周期及运维条件整理设备组合。", capabilities: ["UPS 系统", "精密制冷", "模块化数据中心"], imageAlt: "用于机柜和机房散热的制冷设备" },
    zte: { title: "智能能源与通信基础设施", summary: "面向通信站点与网络设施，协调直流供电、站点能源、监控和环境配套，形成可扩展的基础设施清单。", capabilities: ["通信电源", "站点能源", "能源管理"], imageAlt: "通信机房内的供电与能源基础设施" },
  },
  en: {
    vertiv: { title: "Critical power and thermal infrastructure", summary: "UPS, DC power, distribution, precision cooling, racks, and integrated infrastructure for data centers, edge nodes, and communications facilities.", capabilities: ["UPS and DC power", "Precision and liquid cooling", "Racks and integrated systems"], imageAlt: "Precision cooling equipment for critical infrastructure" },
    huawei: { title: "Data center and site energy", summary: "Critical power, smart cooling, modular data centers, and telecom site energy organized around project boundaries and exact model verification.", capabilities: ["Critical power", "Smart cooling", "Site energy"], imageAlt: "DC power and distribution cabinet for data center infrastructure" },
    delta: { title: "InfraSuite data center infrastructure", summary: "UPS, distribution, precision cooling, racks, and infrastructure management coordinated from equipment rooms to modular deployments.", capabilities: ["UPS and distribution", "Precision cooling", "Infrastructure management"], imageAlt: "UPS equipment for critical data center power" },
    kstar: { title: "UPS and modular data centers", summary: "Equipment combinations for critical-load protection, precision cooling, and modular facility deployment based on capacity, space, schedule, and operations.", capabilities: ["UPS systems", "Precision cooling", "Modular data centers"], imageAlt: "Cooling equipment for cabinets and equipment rooms" },
    zte: { title: "Intelligent energy and telecom infrastructure", summary: "DC power, site energy, monitoring, and environmental support coordinated for scalable telecommunications and network infrastructure.", capabilities: ["Telecom power", "Site energy", "Energy management"], imageAlt: "Power and energy infrastructure inside a telecommunications facility" },
  },
  ru: {
    vertiv: { title: "Критическое питание и охлаждение", summary: "ИБП, DC-питание, распределение, прецизионное охлаждение, стойки и интегрированная инфраструктура для ЦОД, периферийных узлов и связи.", capabilities: ["ИБП и DC-питание", "Прецизионное и жидкостное охлаждение", "Стойки и интеграция"], imageAlt: "Прецизионное охлаждение критической инфраструктуры" },
    huawei: { title: "Энергия ЦОД и телекоммуникационных площадок", summary: "Критическое питание, интеллектуальное охлаждение, модульные ЦОД и энергия площадок с проверкой границ проекта и конкретных моделей.", capabilities: ["Критическое питание", "Интеллектуальное охлаждение", "Энергия площадок"], imageAlt: "Шкаф постоянного тока и распределения для инфраструктуры ЦОД" },
    delta: { title: "Инфраструктура ЦОД InfraSuite", summary: "ИБП, распределение, прецизионное охлаждение, стойки и управление инфраструктурой — от аппаратных до модульных объектов.", capabilities: ["ИБП и распределение", "Прецизионное охлаждение", "Управление инфраструктурой"], imageAlt: "Оборудование ИБП для критического питания ЦОД" },
    kstar: { title: "ИБП и модульные центры обработки данных", summary: "Комплектация защиты нагрузки, прецизионного охлаждения и модульных объектов по мощности, пространству, срокам и условиям эксплуатации.", capabilities: ["Системы ИБП", "Прецизионное охлаждение", "Модульные ЦОД"], imageAlt: "Охлаждение шкафов и аппаратных помещений" },
    zte: { title: "Интеллектуальная энергия и инфраструктура связи", summary: "DC-питание, энергия площадки, мониторинг и климатическая поддержка для масштабируемой телекоммуникационной и сетевой инфраструктуры.", capabilities: ["Питание связи", "Энергия площадок", "Управление энергией"], imageAlt: "Энергетическая инфраструктура телекоммуникационного объекта" },
  },  fr: {
    "vertiv": {
        "title": "Infrastructure thermique et d'alimentation critique",
        "summary": "ASI, alimentation CC, distribution, refroidissement de précision, baies et infrastructures intégrées pour datacenters, nœuds edge et installations télécoms.",
        "capabilities": [
            "ASI et alimentation CC",
            "Refroidissement de précision et liquide",
            "Baies et systèmes intégrés"
        ],
        "imageAlt": "Équipement de refroidissement de précision pour infrastructure critique"
    },
    "huawei": {
        "title": "Datacenter et énergie de site",
        "summary": "Alimentation critique, refroidissement intelligent, datacenters modulaires et énergie de site télécom structurés selon les exigences du projet et la vérification exacte des modèles.",
        "capabilities": [
            "Alimentation critique",
            "Refroidissement intelligent",
            "Énergie de site"
        ],
        "imageAlt": "Armoire d'alimentation CC et de distribution pour infrastructure de datacenter"
    },
    "delta": {
        "title": "Infrastructure de datacenter InfraSuite",
        "summary": "ASI, distribution, refroidissement de précision, baies et gestion d'infrastructure, coordonnés des salles techniques aux déploiements modulaires.",
        "capabilities": [
            "ASI et distribution",
            "Refroidissement de précision",
            "Gestion d'infrastructure"
        ],
        "imageAlt": "Équipement ASI pour alimentation critique de datacenter"
    },
    "kstar": {
        "title": "ASI et datacenters modulaires",
        "summary": "Ensembles d'équipements pour la protection des charges critiques, le refroidissement de précision et le déploiement modulaire basés sur la capacité, l'espace, les délais et l'exploitation.",
        "capabilities": [
            "Systèmes ASI",
            "Refroidissement de précision",
            "Datacenters modulaires"
        ],
        "imageAlt": "Équipement de refroidissement pour baies et salles techniques"
    },
    "zte": {
        "title": "Énergie intelligente et infrastructure télécom",
        "summary": "Alimentation CC, énergie de site, supervision et support environnemental coordonnés pour des infrastructures de réseaux et télécommunications évolutives.",
        "capabilities": [
            "Alimentation télécom",
            "Énergie de site",
            "Gestion de l'énergie"
        ],
        "imageAlt": "Infrastructure électrique et énergétique au sein d'un site de télécommunications"
    }
},
  de: {
    "vertiv": {
        "title": "Kritische Stromversorgungs- und thermische Infrastruktur",
        "summary": "USV, Gleichstromversorgung, Energieverteilung, Präzisionskühlung, Racks und integrierte Infrastruktur für Rechenzentren, Edge-Knoten und Telekommunikationseinrichtungen.",
        "capabilities": [
            "USV- und Gleichstromsysteme",
            "Präzisions- und Flüssigkeitskühlung",
            "Racks und integrierte Systeme"
        ],
        "imageAlt": "Präzisionskühlungsausrüstung für kritische Infrastrukturen"
    },
    "huawei": {
        "title": "Rechenzentrums- und Standortenergie",
        "summary": "Kritische Stromversorgung, intelligente Kühlung, modulare Rechenzentren und Telekommunikations-Standortenergie, strukturiert nach Projektgrenzen und exakter Modellvalidierung.",
        "capabilities": [
            "Kritische Stromversorgung",
            "Intelligente Kühlung",
            "Standortenergie"
        ],
        "imageAlt": "Gleichstromversorgungs- und Verteilerschrank für Rechenzentrumsinfrastruktur"
    },
    "delta": {
        "title": "InfraSuite Rechenzentrumsinfrastruktur",
        "summary": "USV, Energieverteilung, Präzisionskühlung, Racks und Infrastrukturmanagement, koordiniert von Technikräumen bis zu modularen Installationen.",
        "capabilities": [
            "USV und Energieverteilung",
            "Präzisionskühlung",
            "Infrastrukturmanagement"
        ],
        "imageAlt": "USV-Anlagen für kritische Rechenzentrums-Stromversorgung"
    },
    "kstar": {
        "title": "USV und modulare Rechenzentren",
        "summary": "Gerätekombinationen für den Schutz kritischer Lasten, Präzisionskühlung und modulare Standortbereitstellung basierend auf Kapazität, Platzangebot, Zeitplan und Betriebsanforderungen.",
        "capabilities": [
            "USV-Systeme",
            "Präzisionskühlung",
            "Modulare Rechenzentren"
        ],
        "imageAlt": "Kühlungsausrüstung für Schaltschränke und Technikräume"
    },
    "zte": {
        "title": "Intelligente Energie- und Telekommunikationsinfrastruktur",
        "summary": "Gleichstromsysteme, Standortenergie, Überwachung und Umweltkontrolle, abgestimmt auf skalierbare Telekommunikations- und Netzwerkinfrastrukturen.",
        "capabilities": [
            "Telekom-Stromversorgung",
            "Standortenergie",
            "Energiemanagement"
        ],
        "imageAlt": "Strom- und Energieinfrastruktur in einer Telekommunikationsanlage"
    }
},
  es: {
    "vertiv": {
        "title": "Infraestructura térmica y de energía crítica",
        "summary": "UPS, energía CC, distribución, climatización de precisión, racks e infraestructura integrada para centros de datos, nodos perimetrales e instalaciones de telecomunicaciones.",
        "capabilities": [
            "UPS y energía CC",
            "Climatización de precisión y líquida",
            "Racks y sistemas integrados"
        ],
        "imageAlt": "Equipos de climatización de precisión para infraestructura crítica"
    },
    "huawei": {
        "title": "Energía para centros de datos e instalaciones",
        "summary": "Energía crítica, refrigeración inteligente, centros de datos modulares y energía para emplazamientos de telecomunicaciones, alineados con el alcance del proyecto y la verificación exacta de modelos.",
        "capabilities": [
            "Energía crítica",
            "Refrigeración inteligente",
            "Energía para emplazamientos"
        ],
        "imageAlt": "Gabinete de distribución y energía CC para infraestructura de centros de datos"
    },
    "delta": {
        "title": "Infraestructura para centros de datos InfraSuite",
        "summary": "UPS, distribución, refrigeración de precisión, racks y gestión de infraestructura coordinados desde salas de equipos hasta despliegues modulares.",
        "capabilities": [
            "UPS y distribución",
            "Refrigeración de precisión",
            "Gestión de infraestructura"
        ],
        "imageAlt": "Equipos UPS para alimentación crítica en centros de datos"
    },
    "kstar": {
        "title": "UPS y centros de datos modulares",
        "summary": "Combinaciones de equipos para protección de cargas críticas, refrigeración de precisión y despliegue modular de instalaciones según capacidad, espacio, plazos y operación.",
        "capabilities": [
            "Sistemas UPS",
            "Refrigeración de precisión",
            "Centros de datos modulares"
        ],
        "imageAlt": "Equipos de refrigeración para gabinetes y salas técnicas"
    },
    "zte": {
        "title": "Energía inteligente e infraestructura de telecomunicaciones",
        "summary": "Energía CC, energía para emplazamientos, monitorización y soporte ambiental coordinados para infraestructuras de red y telecomunicaciones escalables.",
        "capabilities": [
            "Energía para telecomunicaciones",
            "Energía para emplazamientos",
            "Gestión energética"
        ],
        "imageAlt": "Infraestructura eléctrica y energética en instalaciones de telecomunicaciones"
    }
},
  ar: {
    "vertiv": {
        "title": "البنية التحتية للطاقة الحرجة والحلول الحرارية",
        "summary": "أنظمة UPS، طاقة التيار المستمر (DC)، التوزيع الكهربائي، التبريد الدقيق، الخزائن (Racks)، والبنية التحتية المتكاملة لمراكز البيانات، ونقاط الحوسبة الطرفية (Edge)، ومرافق الاتصالات.",
        "capabilities": [
            "أنظمة UPS وطاقة التيار المستمر (DC)",
            "التبريد الدقيق والتبريد السائل",
            "الخزائن والأنظمة المتكاملة"
        ],
        "imageAlt": "معدات التبريد الدقيق للبنية التحتية الحيوية"
    },
    "huawei": {
        "title": "طاقة مراكز البيانات ومواقع الاتصالات",
        "summary": "الطاقة الحرجة، التبريد الذكي، مراكز البيانات المعيارية، وطاقة مواقع الاتصالات المنظمة وفقاً لحدود المشروع والتحقق الدقيق من الطرازات.",
        "capabilities": [
            "الطاقة الحرجة",
            "التبريد الذكي",
            "طاقة المواقع"
        ],
        "imageAlt": "خزانة طاقة التيار المستمر (DC) والتوزيع الكهربائي للبنية التحتية لمراكز البيانات"
    },
    "delta": {
        "title": "البنية التحتية لمراكز البيانات InfraSuite",
        "summary": "أنظمة UPS، التوزيع الكهربائي، التبريد الدقيق، الخزائن، وإدارة البنية التحتية بتنسيق متكامل من غرف المعدات إلى عمليات النشر المعيارية.",
        "capabilities": [
            "أنظمة UPS والتوزيع الكهربائي",
            "التبريد الدقيق",
            "إدارة البنية التحتية"
        ],
        "imageAlt": "معدات UPS لتغذية الطاقة الحرجة في مراكز البيانات"
    },
    "kstar": {
        "title": "أنظمة UPS ومراكز البيانات المعيارية",
        "summary": "توليفات معدات لحماية الأحمال الحرجة، والتبريد الدقيق، ونشر المرافق المعيارية استناداً إلى السعة والمساحة والجدول الزمني والعمليات التشغيلية.",
        "capabilities": [
            "أنظمة UPS",
            "التبريد الدقيق",
            "مراكز البيانات المعيارية"
        ],
        "imageAlt": "معدات تبريد للخزائن وغرف المعدات"
    },
    "zte": {
        "title": "الطاقة الذكية وبنية الاتصالات التحتية",
        "summary": "طاقة التيار المستمر (DC)، طاقة المواقع، المراقبة، والدعم البيئي المنسق لبنى الاتصالات والشبكات القابلة للتوسع.",
        "capabilities": [
            "طاقة الاتصالات",
            "طاقة المواقع",
            "إدارة الطاقة"
        ],
        "imageAlt": "البنية التحتية للطاقة والكهرباء داخل منشأة اتصالات"
    }
},

};

// 7 语全量本土化赋值
industryLandingCopy.fr = {
  "eyebrow": "Secteurs et environnements",
  "heroAlt": "Infrastructure de datacenter, d'énergie et de télécommunications",
  "navLabel": "Navigation de page sectorielle",
  "nav": {
    "method": "Méthodologie",
    "industries": "Environnements sectoriels",
    "solutions": "Autres solutions sectorielles"
  },
  "methodTitle": "Des exigences du projet à une solution opérationnelle",
  "methodDescription": "Nous associons charge utile, conditions électriques, environnement d'installation et contraintes d'exploitation pour définir les infrastructures critiques d'alimentation, thermiques et de télécommunications en vue de la sélection, du chiffrage et de la validation de livraison.",
  "methodItems": [
    {
      "title": "Alimentation continue",
      "description": "Valider l'entrée réseau, le comportement de la charge, la capacité, la redondance, l'autonomie et les limites de maintenance."
    },
    {
      "title": "Gestion thermique",
      "description": "Sélectionner le refroidissement selon la charge thermique, le flux d'air, les conditions ambiantes, l'encombrement et les perspectives d'extension."
    },
    {
      "title": "Télécommunications et exploitation",
      "description": "Coordonner les baies, PDU, KVM, modules optiques, interfaces de supervision et périmètres de fourniture multimarques."
    }
  ],
  "industriesTitle": "Environnements sectoriels",
  "industriesDescription": "Définissez d'abord les objectifs d'exploitation et les contraintes du site, puis validez le périmètre matériel et les points de conformité.",
  "industryAction": "Découvrir la solution sectorielle",
  "solutionsTitle": "Autres solutions sectorielles",
  "solutionsDescription": "Portefeuilles officiels de solutions partenaires (VERTIV, Huawei, Delta, KSTAR, ZTE) articulés autour de l'alimentation critique, du refroidissement, de l'énergie de site et des datacenters.",
  "solutionAction": "Consulter les produits associés",
  "sourceAction": "Source officielle de la marque",
  "solutionsNote": "Les orientations de solutions sont synthétisées d'après les documentations publiques des constructeurs. Les autorisations de distribution, modèles disponibles et configurations restent soumis aux accords contractuels, données fabricants et études de projet.",
  "ctaTitle": "Besoin d'une configuration matérielle adaptée à votre projet ?",
  "ctaDescription": "Transmettez-nous vos critères de puissance, autonomie, environnement et implantation pour recevoir une présélection technique détaillée.",
  "ctaAction": "Soumettre les spécifications du projet"
};
brandCopy.fr = {
  "vertiv": {
    "title": "Infrastructure thermique et d'alimentation critique",
    "summary": "ASI, alimentation CC, distribution, refroidissement de précision, baies et infrastructures intégrées pour datacenters, nœuds edge et installations télécoms.",
    "capabilities": [
      "ASI et alimentation CC",
      "Refroidissement de précision et liquide",
      "Baies et systèmes intégrés"
    ],
    "imageAlt": "Équipement de refroidissement de précision pour infrastructure critique"
  },
  "huawei": {
    "title": "Datacenter et énergie de site",
    "summary": "Alimentation critique, refroidissement intelligent, datacenters modulaires et énergie de site télécom structurés selon les exigences du projet et la vérification exacte des modèles.",
    "capabilities": [
      "Alimentation critique",
      "Refroidissement intelligent",
      "Énergie de site"
    ],
    "imageAlt": "Armoire d'alimentation CC et de distribution pour infrastructure de datacenter"
  },
  "delta": {
    "title": "Infrastructure de datacenter InfraSuite",
    "summary": "ASI, distribution, refroidissement de précision, baies et gestion d'infrastructure, coordonnés des salles techniques aux déploiements modulaires.",
    "capabilities": [
      "ASI et distribution",
      "Refroidissement de précision",
      "Gestion d'infrastructure"
    ],
    "imageAlt": "Équipement ASI pour alimentation critique de datacenter"
  },
  "kstar": {
    "title": "ASI et datacenters modulaires",
    "summary": "Ensembles d'équipements pour la protection des charges critiques, le refroidissement de précision et le déploiement modulaire basés sur la capacité, l'espace, les délais et l'exploitation.",
    "capabilities": [
      "Systèmes ASI",
      "Refroidissement de précision",
      "Datacenters modulaires"
    ],
    "imageAlt": "Équipement de refroidissement pour baies et salles techniques"
  },
  "zte": {
    "title": "Énergie intelligente et infrastructure télécom",
    "summary": "Alimentation CC, énergie de site, supervision et support environnemental coordonnés pour des infrastructures de réseaux et télécommunications évolutives.",
    "capabilities": [
      "Alimentation télécom",
      "Énergie de site",
      "Gestion de l'énergie"
    ],
    "imageAlt": "Infrastructure électrique et énergétique au sein d'un site de télécommunications"
  }
};
industryLandingCopy.de = {
  "eyebrow": "Branchen und Einsatzbereiche",
  "heroAlt": "Rechenzentrums-, Energie- und Kommunikationsinfrastruktur",
  "navLabel": "Seiteninterne Branchennavigation",
  "nav": {
    "method": "Vorgehensweise",
    "industries": "Branchenumgebungen",
    "solutions": "Weitere Branchenlösungen"
  },
  "methodTitle": "Von Projektanforderungen zu einer praxisgerechten Lösung",
  "methodDescription": "Wir analysieren Lastprofil, Netzbedingungen, Einsatzumgebung und Betriebsanforderungen, um kritische Stromversorgungs-, Klima- und Kommunikationsinfrastrukturen für Auswahl, Angebotserstellung und Lieferprüfung präzise zu definieren.",
  "methodItems": [
    {
      "title": "Unterbrechungsfreie Stromversorgung",
      "description": "Eingangsparameter, Lastverhalten, Kapazität, Redundanz, Autonomiezeit und Wartungsgrenzen verifizieren."
    },
    {
      "title": "Thermomanagement",
      "description": "Auslegung der Kühlung nach Wärmelast, Luftführung, Umgebungsbedingungen, Platzverhältnissen und Erweiterungsplänen."
    },
    {
      "title": "Kommunikation und Betrieb",
      "description": "Koordination von Racks, PDU, KVM, optischen Modulen, Monitoringschnittstellen und herstellerübergreifenden Liefergrenzen."
    }
  ],
  "industriesTitle": "Branchenumgebungen",
  "industriesDescription": "Definieren Sie zuerst Betriebsziele und Standortrestriktionen, um anschließend den relevanten Geräteumfang und Prüfpunkte festzulegen.",
  "industryAction": "Branchenlösung entdecken",
  "solutionsTitle": "Weitere Branchenlösungen",
  "solutionsDescription": "Offizielle Lösungsportfolios der Partnerhersteller VERTIV, Huawei, Delta, KSTAR und ZTE – gegliedert nach kritischer Stromversorgung, Thermomanagement, Standortenergie und Rechenzentrumsinfrastruktur.",
  "solutionAction": "Zugehörige Produkte anzeigen",
  "sourceAction": "Offizielle Herstellerquelle",
  "solutionsNote": "Lösungsübersichten basieren auf öffentlich zugänglichen Herstellerangaben. Markenautorisierungen, Modellverfügbarkeiten und Projektkonfigurationen unterliegen vertraglichen Vereinbarungen, aktuellen Herstellerdaten und individueller Projektprüfung.",
  "ctaTitle": "Benötigen Sie ein maßgeschneidertes Gerätepaket für Ihr Projekt?",
  "ctaDescription": "Teilen Sie uns Lastanforderungen, Überbrückungszeit sowie Umgebungs- und Installationsbedingungen mit, damit wir eine modellbasierte Vorauswahl erstellen können.",
  "ctaAction": "Projektanforderungen einreichen"
};
brandCopy.de = {
  "vertiv": {
    "title": "Kritische Stromversorgungs- und thermische Infrastruktur",
    "summary": "USV, Gleichstromversorgung, Energieverteilung, Präzisionskühlung, Racks und integrierte Infrastruktur für Rechenzentren, Edge-Knoten und Telekommunikationseinrichtungen.",
    "capabilities": [
      "USV- und Gleichstromsysteme",
      "Präzisions- und Flüssigkeitskühlung",
      "Racks und integrierte Systeme"
    ],
    "imageAlt": "Präzisionskühlungsausrüstung für kritische Infrastrukturen"
  },
  "huawei": {
    "title": "Rechenzentrums- und Standortenergie",
    "summary": "Kritische Stromversorgung, intelligente Kühlung, modulare Rechenzentren und Telekommunikations-Standortenergie, strukturiert nach Projektgrenzen und exakter Modellvalidierung.",
    "capabilities": [
      "Kritische Stromversorgung",
      "Intelligente Kühlung",
      "Standortenergie"
    ],
    "imageAlt": "Gleichstromversorgungs- und Verteilerschrank für Rechenzentrumsinfrastruktur"
  },
  "delta": {
    "title": "InfraSuite Rechenzentrumsinfrastruktur",
    "summary": "USV, Energieverteilung, Präzisionskühlung, Racks und Infrastrukturmanagement, koordiniert von Technikräumen bis zu modularen Installationen.",
    "capabilities": [
      "USV und Energieverteilung",
      "Präzisionskühlung",
      "Infrastrukturmanagement"
    ],
    "imageAlt": "USV-Anlagen für kritische Rechenzentrums-Stromversorgung"
  },
  "kstar": {
    "title": "USV und modulare Rechenzentren",
    "summary": "Gerätekombinationen für den Schutz kritischer Lasten, Präzisionskühlung und modulare Standortbereitstellung basierend auf Kapazität, Platzangebot, Zeitplan und Betriebsanforderungen.",
    "capabilities": [
      "USV-Systeme",
      "Präzisionskühlung",
      "Modulare Rechenzentren"
    ],
    "imageAlt": "Kühlungsausrüstung für Schaltschränke und Technikräume"
  },
  "zte": {
    "title": "Intelligente Energie- und Telekommunikationsinfrastruktur",
    "summary": "Gleichstromsysteme, Standortenergie, Überwachung und Umweltkontrolle, abgestimmt auf skalierbare Telekommunikations- und Netzwerkinfrastrukturen.",
    "capabilities": [
      "Telekom-Stromversorgung",
      "Standortenergie",
      "Energiemanagement"
    ],
    "imageAlt": "Strom- und Energieinfrastruktur in einer Telekommunikationsanlage"
  }
};
industryLandingCopy.es = {
  "eyebrow": "Industrias y entornos",
  "heroAlt": "Infraestructura de centro de datos, energía y telecomunicaciones",
  "navLabel": "Navegación interna de industrias",
  "nav": {
    "method": "Metodología",
    "industries": "Entornos industriales",
    "solutions": "Más soluciones industriales"
  },
  "methodTitle": "De los requisitos del proyecto a una solución práctica",
  "methodDescription": "Combinamos escala de carga, condiciones eléctricas, entorno de instalación y requerimientos operativos para definir la infraestructura crítica de energía, climatización y comunicaciones para su selección, cotización y verificación de entrega.",
  "methodItems": [
    {
      "title": "Energía ininterrumpida",
      "description": "Verificación de entrada eléctrica, comportamiento de la carga, capacidad, redundancia, autonomía y límites de mantenimiento."
    },
    {
      "title": "Gestión térmica",
      "description": "Selección del sistema de refrigeración en función de la carga térmica, flujo de aire, condiciones ambientales, espacio y planes de ampliación."
    },
    {
      "title": "Comunicaciones y operaciones",
      "description": "Coordinación de racks, PDU, KVM, módulos ópticos, interfaces de monitorización y límites de suministro multimarca."
    }
  ],
  "industriesTitle": "Entornos industriales",
  "industriesDescription": "Defina primero los objetivos operativos y las limitaciones del emplazamiento, luego evalúe el alcance del equipamiento y los puntos de validación.",
  "industryAction": "Explorar la solución industrial",
  "solutionsTitle": "Más soluciones industriales",
  "solutionsDescription": "Portafolios oficiales de soluciones de marcas asociadas (VERTIV, Huawei, Delta, KSTAR y ZTE), organizados por energía crítica, gestión térmica, energía para emplazamientos e infraestructura de centros de datos.",
  "solutionAction": "Ver productos relacionados",
  "sourceAction": "Fuente oficial de la marca",
  "solutionsNote": "Las directrices de soluciones se resumen a partir de fuentes públicas del fabricante. Las autorizaciones de marca, los modelos disponibles y las configuraciones de proyecto están sujetos a contratos, datos vigentes del fabricante y revisión del proyecto.",
  "ctaTitle": "¿Necesita un paquete de equipamiento adaptado a su proyecto?",
  "ctaDescription": "Comparta los requisitos de carga, autonomía, entorno e instalación para preparar una preselección técnica basada en modelos precisos.",
  "ctaAction": "Enviar requisitos del proyecto"
};
brandCopy.es = {
  "vertiv": {
    "title": "Infraestructura térmica y de energía crítica",
    "summary": "UPS, energía CC, distribución, climatización de precisión, racks e infraestructura integrada para centros de datos, nodos perimetrales e instalaciones de telecomunicaciones.",
    "capabilities": [
      "UPS y energía CC",
      "Climatización de precisión y líquida",
      "Racks y sistemas integrados"
    ],
    "imageAlt": "Equipos de climatización de precisión para infraestructura crítica"
  },
  "huawei": {
    "title": "Energía para centros de datos e instalaciones",
    "summary": "Energía crítica, refrigeración inteligente, centros de datos modulares y energía para emplazamientos de telecomunicaciones, alineados con el alcance del proyecto y la verificación exacta de modelos.",
    "capabilities": [
      "Energía crítica",
      "Refrigeración inteligente",
      "Energía para emplazamientos"
    ],
    "imageAlt": "Gabinete de distribución y energía CC para infraestructura de centros de datos"
  },
  "delta": {
    "title": "Infraestructura para centros de datos InfraSuite",
    "summary": "UPS, distribución, refrigeración de precisión, racks y gestión de infraestructura coordinados desde salas de equipos hasta despliegues modulares.",
    "capabilities": [
      "UPS y distribución",
      "Refrigeración de precisión",
      "Gestión de infraestructura"
    ],
    "imageAlt": "Equipos UPS para alimentación crítica en centros de datos"
  },
  "kstar": {
    "title": "UPS y centros de datos modulares",
    "summary": "Combinaciones de equipos para protección de cargas críticas, refrigeración de precisión y despliegue modular de instalaciones según capacidad, espacio, plazos y operación.",
    "capabilities": [
      "Sistemas UPS",
      "Refrigeración de precisión",
      "Centros de datos modulares"
    ],
    "imageAlt": "Equipos de refrigeración para gabinetes y salas técnicas"
  },
  "zte": {
    "title": "Energía inteligente e infraestructura de telecomunicaciones",
    "summary": "Energía CC, energía para emplazamientos, monitorización y soporte ambiental coordinados para infraestructuras de red y telecomunicaciones escalables.",
    "capabilities": [
      "Energía para telecomunicaciones",
      "Energía para emplazamientos",
      "Gestión energética"
    ],
    "imageAlt": "Infraestructura eléctrica y energética en instalaciones de telecomunicaciones"
  }
};
industryLandingCopy.ar = {
  "eyebrow": "القطاعات وبيئات العمل",
  "heroAlt": "البنية التحتية لمراكز البيانات والطاقة والاتصالات",
  "navLabel": "التنقل داخل صفحة القطاعات",
  "nav": {
    "method": "المنهجية",
    "industries": "بيئات القطاعات",
    "solutions": "المزيد من الحلول الصناعية"
  },
  "methodTitle": "من متطلبات المشروع إلى حل عملي متكامل",
  "methodDescription": "نجمع بين حجم الحمل، وظروف الطاقة، وبيئة التركيب، والمتطلبات التشغيلية لتحديد البنية التحتية الحرجة للطاقة والأنظمة الحرارية والاتصالات من أجل الاختيار والتسعير ومراجعة التوريد.",
  "methodItems": [
    {
      "title": "الطاقة المتواصلة",
      "description": "التحقق من مدخلات الطاقة، وسلوك الحمل، والسعة، ومستوى التكرار (Redundancy)، وزمن التشغيل الاحتياطي، ونطاق الصيانة."
    },
    {
      "title": "الإدارة الحرارية",
      "description": "اختيار أنظمة التبريد المناسبة للحمل الحراري، وتوزيع تدفق الهواء، والظروف المحيطة، والمساحة المتاحة، وخطط التوسع."
    },
    {
      "title": "الاتصالات والعمليات التشغيلية",
      "description": "تنسيق الخزائن، ووحدات توزيع الطاقة (PDU)، ومفاتيح KVM، والوحدات البصرية، وواجهات المراقبة، وحدود التوريد متعددة الموردين."
    }
  ],
  "industriesTitle": "بيئات القطاعات",
  "industriesDescription": "حدد الهدف التشغيلي ومحددات الموقع أولاً، ثم راجع نطاق المعدات المناسب ونقاط التحقق الفنية.",
  "industryAction": "استكشف الحل الخاص بالقطاع",
  "solutionsTitle": "المزيد من الحلول الصناعية",
  "solutionsDescription": "محافظ الحلول المعتمدة من العلامات التجارية الشريكة VERTIV وHuawei وDelta وKSTAR وZTE، والمصممة حول الطاقة الحرجة، والإدارة الحرارية، وطاقة المواقع، وبنية مراكز البيانات.",
  "solutionAction": "عرض المنتجات ذات الصلة",
  "sourceAction": "المصدر الرسمي للعلامة التجارية",
  "solutionsNote": "تم تلخيص اتجاهات الحلول من المصادر العامة للعلامات التجارية. وتخضع اعتمادات العلامات التجارية والموديلات المتاحة وتكوينات المشاريع للعقود وبيانات المصنع الحالية والدراسة الفنية للمشروع.",
  "ctaTitle": "هل تحتاج إلى حزمة معدات مخصصة لظروف مشروعك؟",
  "ctaDescription": "شاركنا متطلبات الحمل وزمن التشغيل الاحتياطي والظروف البيئية والتركيب لنعد لك قائمة أولية بالموديلات المناسبة.",
  "ctaAction": "إرسال متطلبات المشروع"
};
brandCopy.ar = {
  "vertiv": {
    "title": "البنية التحتية للطاقة الحرجة والحلول الحرارية",
    "summary": "أنظمة UPS، طاقة التيار المستمر (DC)، التوزيع الكهربائي، التبريد الدقيق، الخزائن (Racks)، والبنية التحتية المتكاملة لمراكز البيانات، ونقاط الحوسبة الطرفية (Edge)، ومرافق الاتصالات.",
    "capabilities": [
      "أنظمة UPS وطاقة التيار المستمر (DC)",
      "التبريد الدقيق والتبريد السائل",
      "الخزائن والأنظمة المتكاملة"
    ],
    "imageAlt": "معدات التبريد الدقيق للبنية التحتية الحيوية"
  },
  "huawei": {
    "title": "طاقة مراكز البيانات ومواقع الاتصالات",
    "summary": "الطاقة الحرجة، التبريد الذكي، مراكز البيانات المعيارية، وطاقة مواقع الاتصالات المنظمة وفقاً لحدود المشروع والتحقق الدقيق من الطرازات.",
    "capabilities": [
      "الطاقة الحرجة",
      "التبريد الذكي",
      "طاقة المواقع"
    ],
    "imageAlt": "خزانة طاقة التيار المستمر (DC) والتوزيع الكهربائي للبنية التحتية لمراكز البيانات"
  },
  "delta": {
    "title": "البنية التحتية لمراكز البيانات InfraSuite",
    "summary": "أنظمة UPS، التوزيع الكهربائي، التبريد الدقيق، الخزائن، وإدارة البنية التحتية بتنسيق متكامل من غرف المعدات إلى عمليات النشر المعيارية.",
    "capabilities": [
      "أنظمة UPS والتوزيع الكهربائي",
      "التبريد الدقيق",
      "إدارة البنية التحتية"
    ],
    "imageAlt": "معدات UPS لتغذية الطاقة الحرجة في مراكز البيانات"
  },
  "kstar": {
    "title": "أنظمة UPS ومراكز البيانات المعيارية",
    "summary": "توليفات معدات لحماية الأحمال الحرجة، والتبريد الدقيق، ونشر المرافق المعيارية استناداً إلى السعة والمساحة والجدول الزمني والعمليات التشغيلية.",
    "capabilities": [
      "أنظمة UPS",
      "التبريد الدقيق",
      "مراكز البيانات المعيارية"
    ],
    "imageAlt": "معدات تبريد للخزائن وغرف المعدات"
  },
  "zte": {
    "title": "الطاقة الذكية وبنية الاتصالات التحتية",
    "summary": "طاقة التيار المستمر (DC)، طاقة المواقع، المراقبة، والدعم البيئي المنسق لبنى الاتصالات والشبكات القابلة للتوسع.",
    "capabilities": [
      "طاقة الاتصالات",
      "طاقة المواقع",
      "إدارة الطاقة"
    ],
    "imageAlt": "البنية التحتية للطاقة والكهرباء داخل منشأة اتصالات"
  }
};

export function getBrandSolutions(locale: Locale): BrandSolutionCard[] {
  return (Object.keys(brandAssets) as Array<keyof typeof brandAssets>).map((key) => {
    const asset = brandAssets[key];
    const translation = brandCopy[locale][key];
    return {
      ...asset,
      ...translation,
      image: { ...asset.image, alt: translation.imageAlt },
      actionLabel: key === "kstar" ? ({ zh: "咨询 KSTAR 方案", en: "Ask about KSTAR solutions", ru: "Запросить решение KSTAR" } as Record<string, string>)[locale] || "Ask about KSTAR solutions" : (industryLandingCopy[locale] || industryLandingCopy.en).solutionAction,
    };
  });
}
