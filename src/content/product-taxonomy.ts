export type CatalogLocale = "zh" | "en" | "ru";

type LocalizedNames = Record<CatalogLocale, string>;

export type ProductTaxonomyItem = {
  key: string;
  parentKey?: string;
  slug: string;
  level: number;
  sortOrder: number;
  translations: Record<CatalogLocale, { name: string; description: string }>;
};

function item(
  key: string,
  slug: string,
  level: number,
  sortOrder: number,
  names: LocalizedNames,
  parentKey?: string,
): ProductTaxonomyItem {
  return {
    key,
    parentKey,
    slug,
    level,
    sortOrder,
    translations: {
      zh: { name: names.zh, description: `浏览${names.zh}相关产品与技术资料。` },
      en: { name: names.en, description: `Browse products and technical information for ${names.en}.` },
      ru: { name: names.ru, description: `Продукция и техническая информация: ${names.ru}.` },
    },
  };
}

const brandNames = {
  accelink: { zh: "光迅科技", en: "Accelink", ru: "Accelink" },
  adder: { zh: "Adder", en: "Adder", ru: "Adder" },
  aten: { zh: "ATEN", en: "ATEN", ru: "ATEN" },
  ceT: { zh: "CE+T", en: "CE+T", ru: "CE+T" },
  cisco: { zh: "Cisco", en: "Cisco", ru: "Cisco" },
  delta: { zh: "台达", en: "Delta", ru: "Delta" },
  eaton: { zh: "伊顿", en: "Eaton", ru: "Eaton" },
  eltek: { zh: "ELTEK", en: "ELTEK", ru: "ELTEK" },
  envicool: { zh: "英维克", en: "Envicool", ru: "Envicool" },
  huawei: { zh: "华为", en: "Huawei", ru: "Huawei" },
  kstar: { zh: "科士达", en: "KSTAR", ru: "KSTAR" },
  nvidia: { zh: "NVIDIA", en: "NVIDIA", ru: "NVIDIA" },
  raritan: { zh: "Raritan", en: "Raritan", ru: "Raritan" },
  rittal: { zh: "Rittal", en: "Rittal", ru: "Rittal" },
  santak: { zh: "山特（SANTAK）", en: "SANTAK", ru: "SANTAK" },
  stulz: { zh: "STULZ", en: "STULZ", ru: "STULZ" },
  vertiv: { zh: "维谛", en: "Vertiv", ru: "Vertiv" },
  zte: { zh: "中兴", en: "ZTE", ru: "ZTE" },
} satisfies Record<string, LocalizedNames>;

type BrandKey = keyof typeof brandNames;

function brandItems(
  parentKey: string,
  brands: readonly BrandKey[],
  legacyKeys: Partial<Record<BrandKey, string>> = {},
): ProductTaxonomyItem[] {
  return brands.map((brand, sortOrder) => {
    const key = legacyKeys[brand] ?? `${parentKey}-${brand.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
    return item(key, key, 3, sortOrder, brandNames[brand], parentKey);
  });
}

// Factual category and brand assignments verified from the requested reference
// category pages on 2026-09-09. The hierarchy and copy remain HEFENGQI-owned.
export const productTaxonomy: ProductTaxonomyItem[] = [
  item("power", "power", 1, 0, { zh: "电源管理", en: "Power management", ru: "Управление электропитанием" }),
  item("dc-power-systems", "dc-power-systems", 2, 0, { zh: "直流电源系统", en: "DC power systems", ru: "Системы питания постоянного тока" }, "power"),
  ...brandItems("dc-power-systems", ["vertiv", "huawei", "eltek", "delta", "zte", "kstar", "ceT"], {
    vertiv: "vertiv",
    huawei: "huawei",
    delta: "delta",
    zte: "zte",
    ceT: "ce-t",
  }),
  item("battery", "ups", 2, 1, { zh: "UPS 电源", en: "UPS power", ru: "Источники бесперебойного питания (UPS)" }, "power"),
  ...brandItems("battery", ["santak", "kstar", "vertiv", "eaton", "huawei", "delta"], { eaton: "eaton" }),
  item("indoor-power-systems", "indoor-power-systems", 2, 2, { zh: "室内电源系统", en: "Indoor power systems", ru: "Системы электропитания для помещений" }, "power"),
  ...brandItems("indoor-power-systems", ["huawei"]),
  item("outdoor-power-systems", "outdoor-power-systems", 2, 3, { zh: "室外电源系统", en: "Outdoor power systems", ru: "Наружные системы электропитания" }, "power"),
  ...brandItems("outdoor-power-systems", ["huawei", "zte"]),
  item("site-energy-systems", "site-energy-systems", 2, 4, { zh: "站点能源系统", en: "Site energy systems", ru: "Энергосистемы объектов связи" }, "power"),
  ...brandItems("site-energy-systems", ["huawei", "vertiv", "eltek", "delta", "zte"]),
  item("solar-power-systems", "solar-power-systems", 2, 5, { zh: "太阳能供电系统", en: "Solar power systems", ru: "Системы солнечного электропитания" }, "power"),
  ...brandItems("solar-power-systems", ["eltek", "vertiv"]),
  item("telecom-batteries", "telecom-batteries", 2, 6, { zh: "通信蓄电池", en: "Telecom batteries", ru: "Аккумуляторы для телекоммуникаций" }, "power"),
  ...brandItems("telecom-batteries", ["huawei"]),

  item("thermal-management", "thermal-management", 1, 1, { zh: "热管理", en: "Thermal management", ru: "Тепловое управление" }),
  item("precision-air-conditioning", "precision-air-conditioning", 2, 0, { zh: "精密空调", en: "Precision air conditioning", ru: "Прецизионное кондиционирование" }, "thermal-management"),
  ...brandItems("precision-air-conditioning", ["vertiv", "kstar", "stulz", "delta", "huawei", "envicool"]),
  item("cabinet-air-conditioning", "cabinet-air-conditioning", 2, 1, { zh: "机柜空调", en: "Cabinet air conditioning", ru: "Кондиционирование шкафов" }, "thermal-management"),
  ...brandItems("cabinet-air-conditioning", ["rittal", "envicool"]),

  item("optical-communications", "optical-communications", 1, 2, { zh: "光通信与光网络", en: "Optical communications and networking", ru: "Оптическая связь и сети" }),
  item("sfp-modules", "sfp-modules", 2, 0, { zh: "SFP 光模块", en: "SFP optical transceivers", ru: "Оптические модули SFP" }, "optical-communications"),
  ...brandItems("sfp-modules", ["huawei", "cisco", "nvidia", "accelink"]),

  item("integrated-solutions", "integrated-solutions", 1, 3, { zh: "数据中心基础设施", en: "Data center infrastructure", ru: "Инфраструктура центров обработки данных" }),
  item("integrated-cabinet", "integrated-cabinet", 2, 0, { zh: "一体化机柜", en: "Integrated cabinets", ru: "Интегрированные шкафы" }, "integrated-solutions"),
  ...brandItems("integrated-cabinet", ["vertiv", "huawei"]),
  item("distribution", "pdu", 2, 1, { zh: "PDU（电源分配单元）", en: "Power distribution units (PDU)", ru: "Блоки распределения питания (PDU)" }, "integrated-solutions"),
  ...brandItems("distribution", ["vertiv", "eaton"]),
  item("kvm-systems", "kvm-systems", 2, 2, { zh: "KVM 系统", en: "KVM systems", ru: "Системы KVM" }, "integrated-solutions"),
  ...brandItems("kvm-systems", ["aten", "vertiv", "raritan", "adder"]),
];

// These nodes belonged to the original demo tree. The explicit taxonomy sync
// archives them only when they no longer contain products or published descendants.
export const retiredDefaultCategoryKeys = [
  "dpc",
  "monitoring-management",
  "racks-cabinets",
  "ups-systems",
  "yida",
] as const;
