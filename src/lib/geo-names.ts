import { PrismaClient } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let iso: any = null;
// This optional package is not part of the public runtime dependency set.
// eslint-disable-next-line @typescript-eslint/no-require-imports
try { iso = require('iso-3166-2'); } catch {}

const prisma = new PrismaClient();

let memoryCache: Record<string, string> | null = null;
let lastCacheSync = 0;

export async function getCachedTranslations(): Promise<Record<string, string>> {
  const now = Date.now();
  if (memoryCache && now - lastCacheSync < 60000) {
    return memoryCache;
  }
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: "geoTranslations" } });
    memoryCache = (row?.value as Record<string, string>) || {};
    lastCacheSync = now;
    return memoryCache;
  } catch {
    return memoryCache || {};
  }
}

export async function saveGeoTranslation(key: string, chinese: string): Promise<void> {
  if (!key || !chinese || key === chinese) return;
  try {
    const current = await getCachedTranslations();
    current[key] = chinese;
    memoryCache = { ...current };
    await prisma.siteSetting.upsert({
      where: { key: "geoTranslations" },
      update: { value: current },
      create: { key: "geoTranslations", value: current, secret: false },
    });
  } catch (e) {
    console.error("Failed to persist geo translation:", e);
  }
}

const regionNames = new Intl.DisplayNames(["zh-CN"], { type: "region" });

export function formatCountryName(code: string): string {
  if (!code || code === "UNKNOWN" || code === "--") return "未知地区";
  try {
    return regionNames.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

const STATIC_GEO_MAP: Record<string, string> = {
  // 中国省份
  "CN-BJ": "北京", "CN-TJ": "天津", "CN-HE": "河北", "CN-SX": "山西", "CN-NM": "内蒙古",
  "CN-LN": "辽宁", "CN-JL": "吉林", "CN-HL": "黑龙江", "CN-SH": "上海", "CN-JS": "江苏",
  "CN-ZJ": "浙江", "CN-AH": "安徽", "CN-FJ": "福建", "CN-JX": "江西", "CN-SD": "山东",
  "CN-HA": "河南", "CN-HB": "湖北", "CN-HN": "湖南", "CN-GD": "广东", "CN-GX": "广西",
  "CN-HI": "海南", "CN-CQ": "重庆", "CN-SC": "四川", "CN-GZ": "贵州", "CN-YN": "云南",
  "CN-XZ": "西藏", "CN-SN": "陕西", "CN-GS": "甘肃", "CN-QH": "青海", "CN-NX": "宁夏",
  "CN-XJ": "新疆", "CN-HK": "香港", "CN-MO": "澳门", "CN-TW": "台湾",
  "TW-TPE": "台北", "TW-KHH": "高雄", "TW-TXG": "台中", "TW-TNN": "台南",

  // 俄罗斯与中亚重点省份
  "RU-MOW": "莫斯科", "RU-SPE": "圣彼得堡", "RU-KDA": "克拉斯诺达尔边疆区", "RU-SAM": "萨马拉州",
  "RU-SAR": "萨拉托夫州", "RU-SE": "北奥塞梯", "RU-ROS": "罗斯托夫州",
  "RU-SVE": "斯维尔德洛夫斯克州", "RU-NIZ": "下诺夫哥罗德州", "RU-NVS": "新西伯利亚州",
  "RU-TAT": "鞑靼斯坦", "RU-PRI": "滨海边疆区", "RU-KHA": "哈巴罗夫斯克边疆区",
  "KZ-71": "阿斯塔纳", "KZ-75": "阿拉木图", "KZ-AKM": "阿克莫拉州", "KZ-AKT": "阿克托别州",
  "KZ-ALM": "阿拉木图州", "KZ-ATR": "阿特劳州", "KZ-ZHA": "江布尔州", "KZ-KAR": "卡拉干达州",

  // 越南
  "VN-HN": "河内", "VN-SG": "胡志明市", "VN-39": "同奈省", "VN-52": "朔庄省",
  "VN-44": "安江省", "VN-CT": "芹苴市", "VN-DN": "岘港市", "VN-HP": "海防市",

  // 欧洲与美洲
  "DE-HE": "黑森州", "DE-BY": "巴伐利亚州", "DE-BW": "巴登-符腾堡州", "DE-NW": "北莱茵-威斯特法伦州",
  "FR-PAC": "普罗旺斯", "FR-IDF": "法兰西岛", "JP-13": "东京都", "JP-27": "大阪府",
  "UA-30": "基辅", "TH-10": "曼谷", "SE-BD": "北博滕省", "US-CA": "加利福尼亚州",
  "US-TX": "得克萨斯州", "US-NY": "纽约州",

  // 重点高频城市
  "Hangzhou": "杭州", "Nanjing": "南京", "Shanghai": "上海", "Beijing": "北京",
  "Shenzhen": "深圳", "Guangzhou": "广州", "Taipei": "台北", "Baoding": "保定",
  "Nanle": "南乐", "Bien Hoa": "边和", "Hanoi": "河内", "Ho Chi Minh City": "胡志明市",
  "Kadgaron": "卡德加龙", "Armavir": "阿尔马维尔", "Luleå": "吕勒奥", "Mejiro": "目白",
  "Samara": "萨马拉", "Saratov": "萨拉托夫", "Soc Trang": "朔庄", "St Petersburg": "圣彼得堡",
  "Kyiv": "基辅", "Astana": "阿斯塔纳", "Bangkok": "曼谷", "Eschborn": "埃施博恩",
  "Moscow": "莫斯科", "Tokyo": "东京", "Singapore": "新加坡", "London": "伦敦",
  "Paris": "巴黎", "Frankfurt": "法兰克福", "Dubai": "迪拜", "New York": "纽约"
};

export async function resolveRegionNameAsync(region: string): Promise<string> {
  if (!region || region === "UNKNOWN" || region === "未知地区" || region === "--") return "未知省州";
  const trimmed = region.trim();
  const upper = trimmed.toUpperCase();

  if (STATIC_GEO_MAP[upper]) return STATIC_GEO_MAP[upper];
  if (STATIC_GEO_MAP[trimmed]) return STATIC_GEO_MAP[trimmed];

  const cache = await getCachedTranslations();
  if (cache[upper]) return cache[upper];
  if (cache[trimmed]) return cache[trimmed];

  try {
    const subInfo = iso.subdivision(upper);
    if (subInfo && subInfo.name) {
      if (cache[subInfo.name]) return cache[subInfo.name];
      if (STATIC_GEO_MAP[subInfo.name]) return STATIC_GEO_MAP[subInfo.name];
    }
  } catch {}

  return trimmed;
}

export async function resolveCityNameAsync(city: string): Promise<string> {
  if (!city || city === "UNKNOWN" || city === "未知城市" || city === "--") return "未知城市";
  const trimmed = city.trim();

  if (STATIC_GEO_MAP[trimmed]) return STATIC_GEO_MAP[trimmed];

  const cache = await getCachedTranslations();
  if (cache[trimmed]) return cache[trimmed];

  return trimmed;
}

export function formatRegionName(region: string): string {
  if (!region || region === "UNKNOWN" || region === "未知地区" || region === "--") return "未知省州";
  const trimmed = region.trim();
  const upper = trimmed.toUpperCase();
  if (STATIC_GEO_MAP[upper]) return STATIC_GEO_MAP[upper];
  if (STATIC_GEO_MAP[trimmed]) return STATIC_GEO_MAP[trimmed];
  if (memoryCache && memoryCache[upper]) return memoryCache[upper];
  if (memoryCache && memoryCache[trimmed]) return memoryCache[trimmed];
  return region;
}

export function formatCityName(city: string): string {
  if (!city || city === "UNKNOWN" || city === "未知城市" || city === "--") return "未知城市";
  const trimmed = city.trim();
  if (STATIC_GEO_MAP[trimmed]) return STATIC_GEO_MAP[trimmed];
  if (memoryCache && memoryCache[trimmed]) return memoryCache[trimmed];
  return city;
}
