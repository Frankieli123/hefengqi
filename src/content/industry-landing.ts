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
  },
};

// 自动为扩展多语言提供对齐回退
industryLandingCopy.fr = industryLandingCopy.en;
industryLandingCopy.de = industryLandingCopy.en;
industryLandingCopy.es = industryLandingCopy.en;
industryLandingCopy.ar = industryLandingCopy.en;

brandCopy.fr = brandCopy.en;
brandCopy.de = brandCopy.en;
brandCopy.es = brandCopy.en;
brandCopy.ar = brandCopy.en;

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
