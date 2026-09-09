import type { CategoryView, EditorialItem, Locale, ProductView } from "@/types/domain";
import { productTaxonomy } from "@/content/product-taxonomy";

type LocalizedProduct = Omit<ProductView, "slug" | "categoryName" | "name" | "directDefinition" | "shortDescription" | "whatItIs" | "problemSolved" | "suitableFor" | "advantages" | "applications" | "attributes" | "faqs" | "image" | "sourceNote"> & {
  localized: Record<Locale, Pick<ProductView, "slug" | "categoryName" | "name" | "directDefinition" | "shortDescription" | "whatItIs" | "problemSolved" | "suitableFor" | "advantages" | "applications" | "attributes" | "faqs" | "sourceNote">>;
};

const baseSpecs = {
  zh: [
    { key: "input", label: "输入", value: "演示值", comparable: true },
    { key: "output", label: "输出", value: "演示值", comparable: true },
    { key: "mounting", label: "安装方式", value: "机架安装", comparable: true },
  ],
  en: [
    { key: "input", label: "Input", value: "Demo value", comparable: true },
    { key: "output", label: "Output", value: "Demo value", comparable: true },
    { key: "mounting", label: "Mounting", value: "Rack mount", comparable: true },
  ],
  ru: [
    { key: "input", label: "Вход", value: "Демо-значение", comparable: true },
    { key: "output", label: "Выход", value: "Демо-значение", comparable: true },
    { key: "mounting", label: "Монтаж", value: "В стойку", comparable: true },
  ],
};

const demoSource = {
  zh: "演示数据，仅用于功能与版式验收；不是正式产品资料。",
  en: "Demonstration data for functional and layout review; not an official product source.",
  ru: "Демонстрационные данные для проверки функций и макета; не являются официальным источником.",
};

const demoCategoryNames: Record<Locale, Record<"power" | "battery" | "distribution", string>> = {
  zh: { power: "直流电源系统", battery: "交流不间断电源（UPS）", distribution: "配电" },
  en: { power: "DC power systems", battery: "Uninterruptible power supply (UPS)", distribution: "Power distribution" },
  ru: { power: "Системы питания постоянного тока", battery: "Источники бесперебойного питания (UPS)", distribution: "Распределение электропитания" },
};

const demoCategoryKeys = { power: "dc-power-systems", battery: "battery", distribution: "distribution" } as const;

function copy(locale: Locale, kind: "power" | "battery" | "distribution", index: number) {
  const texts = {
    zh: {
      power: ["通信整流电源", "面向通信机房直流供电链路的模块化电源演示条目。", "这是一条用于验证目录、详情与参数结构的通信电源演示产品。", "将交流输入转换为稳定直流输出，并为关键通信负载提供模块化供电路径。", "适合需要核对供电架构、安装空间和维护方式的集成商与采购团队。", ["结构化参数便于核对", "模块化配置思路", "适配机房与站点场景"], ["通信机房", "边缘站点", "网络设备供电"]],
      battery: ["机架式储能电池", "面向通信备电与小型能源系统的机架式电池演示条目。", "这是一条展示储能产品信息结构和询价流程的演示产品。", "在市电异常时为关键负载提供后备能源，并支持机架化部署。", "适合关注空间、备电时长与系统兼容性的项目采购方。", ["统一机架形态", "参数来源可追溯", "便于项目化配置"], ["通信备电", "弱电机房", "边缘能源系统"]],
      distribution: ["智能配电单元", "面向机柜末端配电与回路管理的配电单元演示条目。", "这是一条用于验证配电类产品筛选、比较和询价能力的演示产品。", "为机柜内设备提供有序配电，并帮助项目团队梳理回路和安装要求。", "适合数据机房、通信机柜及需要标准化末端配电的采购方。", ["清晰的回路信息", "标准化安装", "便于同类参数对比"], ["数据机房", "通信机柜", "设备配套"]],
    },
    en: {
      power: ["Telecom rectifier system", "A demonstration modular power entry for DC supply chains in communications facilities.", "This demonstration product validates catalog, detail-page, and specification structures for telecom power equipment.", "It converts AC input to stable DC output and supports a modular power path for critical communications loads.", "For integrators and buyers evaluating supply architecture, installation space, and serviceability.", ["Structured, reviewable specifications", "Modular configuration approach", "Designed around facility and site workflows"], ["Telecom rooms", "Edge sites", "Network equipment power"]],
      battery: ["Rack energy storage battery", "A demonstration rack battery entry for telecom backup and compact energy systems.", "This demonstration product shows the intended information and inquiry structure for energy storage equipment.", "It supplies backup energy to critical loads during utility interruptions in a rack-oriented form factor.", "For project buyers assessing footprint, backup duration, and system compatibility.", ["Consistent rack format", "Traceable field sources", "Project-oriented configuration"], ["Telecom backup", "Equipment rooms", "Edge energy systems"]],
      distribution: ["Intelligent power distribution unit", "A demonstration distribution unit for rack-level power and circuit organization.", "This demonstration product validates filtering, comparison, and inquiry flows for distribution equipment.", "It organizes power delivery within racks and helps project teams define circuits and installation requirements.", "For data rooms, telecom racks, and buyers standardizing rack-level distribution.", ["Clear circuit information", "Standardized installation", "Comparable attributes"], ["Data rooms", "Telecom racks", "Equipment packages"]],
    },
    ru: {
      power: ["Телекоммуникационная выпрямительная система", "Демонстрационная модульная система питания для цепей постоянного тока на объектах связи.", "Эта демонстрационная позиция проверяет структуру каталога, страницы продукта и характеристик телекоммуникационного питания.", "Она преобразует переменный ток в стабильный постоянный и формирует модульный путь питания критической нагрузки.", "Для интеграторов и закупщиков, оценивающих архитектуру питания, монтажное пространство и обслуживание.", ["Структурированные проверяемые параметры", "Модульный подход", "Ориентация на объекты связи"], ["Телекоммуникационные помещения", "Периферийные узлы", "Питание сетевого оборудования"]],
      battery: ["Стоечная аккумуляторная система", "Демонстрационная стоечная батарея для резервного питания связи и компактных энергосистем.", "Эта демонстрационная позиция показывает структуру данных и запроса для накопителей энергии.", "Она обеспечивает резервное питание критической нагрузки при перебоях сети и устанавливается в стойку.", "Для закупщиков, оценивающих размеры, автономность и совместимость системы.", ["Единый стоечный формат", "Прослеживаемые источники", "Проектная конфигурация"], ["Резерв связи", "Технические помещения", "Периферийные энергосистемы"]],
      distribution: ["Интеллектуальный блок распределения питания", "Демонстрационный блок для распределения энергии и организации цепей в шкафу.", "Эта демонстрационная позиция проверяет фильтрацию, сравнение и запрос по распределительному оборудованию.", "Он упорядочивает питание в шкафу и помогает определить цепи и требования к монтажу.", "Для центров обработки данных, телекоммуникационных шкафов и стандартизированных проектов.", ["Понятные данные цепей", "Стандартный монтаж", "Сопоставимые характеристики"], ["ЦОД", "Телекоммуникационные шкафы", "Комплектация оборудования"]],
    },
  } as const;
  const value = texts[locale][kind];
  return {
    slug: `${kind}-${index}`,
    categoryName: demoCategoryNames[locale][kind],
    name: `${value[0]} HFQ-${kind.toUpperCase()}-${String(index).padStart(2, "0")}`,
    directDefinition: value[1],
    shortDescription: value[1],
    whatItIs: value[2],
    problemSolved: value[3],
    suitableFor: value[4],
    advantages: [...value[5]],
    applications: [...value[6]],
    attributes: baseSpecs[locale],
    faqs: [{
      question: locale === "zh" ? "如何确认该产品适合项目？" : locale === "en" ? "How do I confirm project fit?" : "Как подтвердить соответствие проекту?",
      answer: locale === "zh" ? "请提交负载、输入条件、安装空间和交付地区。销售与技术人员将基于已核验资料确认，不会推测缺失参数。" : locale === "en" ? "Provide load, input conditions, installation space, and delivery region. Sales and technical staff will confirm against verified sources without inferring missing values." : "Укажите нагрузку, входные условия, место монтажа и регион поставки. Специалисты сверят данные с проверенными источниками без домыслов.",
    }],
    sourceNote: demoSource[locale],
  };
}

const kinds = ["power", "power", "battery", "battery", "distribution", "distribution"] as const;

export const localizedDemoProducts: LocalizedProduct[] = kinds.map((kind, offset) => {
  const index = offset + 1;
  return {
    id: `demo-${index}`,
    model: `HFQ-${kind.toUpperCase()}-${String(index).padStart(2, "0")}`,
    sku: `DEMO-${String(index).padStart(3, "0")}`,
    brand: "HEFENGQI DEMO",
    categoryKey: demoCategoryKeys[kind],
    updatedAt: "2026-09-07",
    localized: {
      zh: copy("zh", kind, index),
      en: copy("en", kind, index),
      ru: copy("ru", kind, index),
    },
  };
});

export function getDemoProducts(locale: Locale): ProductView[] {
  return localizedDemoProducts.map(({ localized, ...product }) => ({ ...product, ...localized[locale] }));
}

export function getDemoCategories(locale: Locale): CategoryView[] {
  const byKey = new Map(productTaxonomy.map((category) => [category.key, category]));
  const directCounts = new Map<string, number>();
  localizedDemoProducts.forEach((product) => directCounts.set(product.categoryKey, (directCounts.get(product.categoryKey) ?? 0) + 1));

  function categoryPath(key: string) {
    const parts: string[] = [];
    const visited = new Set<string>();
    let current = byKey.get(key);
    while (current && !visited.has(current.key)) {
      visited.add(current.key);
      parts.unshift(current.slug);
      current = current.parentKey ? byKey.get(current.parentKey) : undefined;
    }
    return parts.join("/");
  }

  function aggregateCount(key: string): number {
    return (directCounts.get(key) ?? 0) + productTaxonomy
      .filter((category) => category.parentKey === key)
      .reduce((total, child) => total + aggregateCount(child.key), 0);
  }

  return productTaxonomy.map((category) => ({
    id: `category-${category.key}`,
    key: category.key,
    slug: category.slug,
    path: categoryPath(category.key),
    name: category.translations[locale].name,
    description: category.translations[locale].description,
    parentKey: category.parentKey,
    level: category.level,
    count: aggregateCount(category.key),
  }));
}

const editorial: Record<Locale, Record<"solutions" | "industries" | "cases" | "news", EditorialItem[]>> = {
  zh: {
    solutions: [{ id: "s1", slug: "telecom-site-power", title: "通信站点供电配套", summary: "从输入条件、负载到备电时长，建立可核验的设备选型清单。", body: ["本页为方案结构演示，不包含未经确认的项目承诺。", "正式内容应由工程资料、现场约束与授权产品数据共同支持。"], updatedAt: "2026-09-07" }],
    industries: [{ id: "i1", slug: "communications", title: "通信基础设施", summary: "面向基站、网络机房与边缘节点的设备配套。", body: ["围绕稳定供电、安装空间与维护路径整理采购信息。"], updatedAt: "2026-09-07" }],
    cases: [{ id: "c1", slug: "project-validation-method", title: "项目资料核验方法", summary: "用字段来源、参数模板与人工复核减少设备选型中的信息偏差。", body: ["这是流程案例演示，不虚构客户、地点或项目成果。"], updatedAt: "2026-09-07" }],
    news: [{ id: "n1", slug: "structured-product-data", title: "为什么要结构化管理设备参数", summary: "型号、单位和字段来源的一致性，是跨语言产品资料可信的基础。", body: ["结构化数据让筛选、对比、翻译与复核使用同一事实基础。"], updatedAt: "2026-09-07" }],
  },
  en: {
    solutions: [{ id: "s1", slug: "telecom-site-power", title: "Telecom site power package", summary: "Build a verifiable equipment shortlist from input conditions, load, and backup duration.", body: ["This page demonstrates solution structure and contains no unverified project promises.", "Production content should be supported by engineering inputs, site constraints, and authorized product data."], updatedAt: "2026-09-07" }],
    industries: [{ id: "i1", slug: "communications", title: "Communications infrastructure", summary: "Equipment packages for base stations, network facilities, and edge nodes.", body: ["Procurement information is organized around stable power, space, and maintenance paths."], updatedAt: "2026-09-07" }],
    cases: [{ id: "c1", slug: "project-validation-method", title: "A method for validating project data", summary: "Field provenance, attribute templates, and human review reduce sourcing ambiguity.", body: ["This is a process demonstration; it does not fabricate a customer, location, or result."], updatedAt: "2026-09-07" }],
    news: [{ id: "n1", slug: "structured-product-data", title: "Why equipment specifications need structure", summary: "Consistent models, units, and source fields underpin trustworthy multilingual product data.", body: ["Structured data lets filtering, comparison, translation, and review share one factual base."], updatedAt: "2026-09-07" }],
  },
  ru: {
    solutions: [{ id: "s1", slug: "telecom-site-power", title: "Электропитание объекта связи", summary: "Проверяемый перечень оборудования с учётом входа, нагрузки и времени резерва.", body: ["Страница демонстрирует структуру решения и не содержит неподтверждённых обещаний.", "Рабочий контент должен опираться на инженерные данные, условия объекта и авторизованные материалы."], updatedAt: "2026-09-07" }],
    industries: [{ id: "i1", slug: "communications", title: "Инфраструктура связи", summary: "Комплектация базовых станций, сетевых помещений и периферийных узлов.", body: ["Данные организованы с учётом питания, пространства и обслуживания."], updatedAt: "2026-09-07" }],
    cases: [{ id: "c1", slug: "project-validation-method", title: "Метод проверки проектных данных", summary: "Источники полей, шаблоны параметров и ручная проверка снижают неоднозначность.", body: ["Это демонстрация процесса без вымышленных клиентов, мест или результатов."], updatedAt: "2026-09-07" }],
    news: [{ id: "n1", slug: "structured-product-data", title: "Зачем структурировать характеристики оборудования", summary: "Согласованность моделей, единиц и источников обеспечивает доверие к трёхъязычным данным.", body: ["Структура объединяет фильтрацию, сравнение, перевод и проверку на одной фактической основе."], updatedAt: "2026-09-07" }],
  },
};

export function getDemoEditorial(locale: Locale, type: keyof (typeof editorial)[Locale]) {
  return editorial[locale][type];
}
