export type CatalogLocale = "zh" | "en" | "ru";

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
  names: Record<CatalogLocale, string>,
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

// Public product hierarchy verified against the requested reference on 2026-09-08.
// Names and ordering are factual taxonomy labels; descriptions remain HEFENGQI copy.
export const productTaxonomy: ProductTaxonomyItem[] = [
  item("power", "power", 1, 0, { zh: "电源管理", en: "Power management", ru: "Управление электропитанием" }),
  item("dc-power-systems", "dc-power-systems", 2, 0, { zh: "直流电源系统", en: "DC power systems", ru: "Системы питания постоянного тока" }, "power"),
  item("zte", "zte", 3, 0, { zh: "中兴", en: "ZTE", ru: "ZTE" }, "dc-power-systems"),
  item("dpc", "dpc", 3, 1, { zh: "动力源", en: "DPC", ru: "DPC" }, "dc-power-systems"),
  item("ce-t", "ce-t", 3, 2, { zh: "CE+T", en: "CE+T", ru: "CE+T" }, "dc-power-systems"),
  item("yida", "yida", 3, 3, { zh: "易达", en: "Yida", ru: "Yida" }, "dc-power-systems"),
  item("delta", "delta", 3, 4, { zh: "台达", en: "Delta", ru: "Delta" }, "dc-power-systems"),
  item("vertiv", "vertiv", 3, 5, { zh: "维谛", en: "Vertiv", ru: "Vertiv" }, "dc-power-systems"),
  item("eaton", "eaton", 3, 6, { zh: "伊顿", en: "Eaton", ru: "Eaton" }, "dc-power-systems"),
  item("huawei", "huawei", 3, 7, { zh: "华为", en: "Huawei", ru: "Huawei" }, "dc-power-systems"),
  item("battery", "ups", 2, 1, { zh: "交流不间断电源（UPS）", en: "Uninterruptible power supply (UPS)", ru: "Источники бесперебойного питания (UPS)" }, "power"),
  item("distribution", "distribution", 2, 2, { zh: "配电", en: "Power distribution", ru: "Распределение электропитания" }, "power"),
  item("thermal-management", "thermal-management", 1, 1, { zh: "热管理", en: "Thermal management", ru: "Тепловое управление" }),
  item("precision-air-conditioning", "precision-air-conditioning", 2, 0, { zh: "精密空调", en: "Precision air conditioning", ru: "Прецизионное кондиционирование" }, "thermal-management"),
  item("cabinet-air-conditioning", "cabinet-air-conditioning", 2, 1, { zh: "机柜空调", en: "Cabinet air conditioning", ru: "Кондиционирование шкафов" }, "thermal-management"),
  item("integrated-solutions", "integrated-solutions", 1, 2, { zh: "一体化解决方案", en: "Integrated solutions", ru: "Интегрированные решения" }),
  item("racks-cabinets", "racks-cabinets", 2, 0, { zh: "机架&机柜", en: "Racks & cabinets", ru: "Стойки и шкафы" }, "integrated-solutions"),
  item("integrated-cabinet", "integrated-cabinet", 2, 1, { zh: "一体化机柜", en: "Integrated cabinet", ru: "Интегрированный шкаф" }, "integrated-solutions"),
  item("monitoring-management", "monitoring-management", 1, 3, { zh: "监控和管理", en: "Monitoring and management", ru: "Мониторинг и управление" }),
  item("optical-communications", "optical-communications", 1, 4, { zh: "光通信", en: "Optical communications", ru: "Оптическая связь" }),
  item("sfp-modules", "sfp-modules", 2, 0, { zh: "SFP 光模块", en: "SFP optical transceivers", ru: "Оптические модули SFP" }, "optical-communications"),
];
