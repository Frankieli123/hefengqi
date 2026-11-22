import geoMap from "@/content/geo-zh.json";

const countries = new Intl.DisplayNames(["zh-CN"], { type: "region" });
const countryNames: Record<string, string> = { China: "CN", "United States": "US", "Hong Kong": "HK", Taiwan: "TW", Singapore: "SG", "United Kingdom": "GB", Germany: "DE", France: "FR", Japan: "JP", "South Korea": "KR", India: "IN", Indonesia: "ID", Malaysia: "MY", Thailand: "TH", Vietnam: "VN", Philippines: "PH", Australia: "AU", Canada: "CA", Brazil: "BR", Mexico: "MX", Russia: "RU", "South Africa": "ZA", "United Arab Emirates": "AE", "Saudi Arabia": "SA", Netherlands: "NL", Spain: "ES", Italy: "IT", Switzerland: "CH", Sweden: "SE", Norway: "NO", Finland: "FI", Denmark: "DK", Poland: "PL", Turkey: "TR", Guyana: "GY" };
const special: Record<string, string> = { "Hong Kong": "中国香港", Taiwan: "中国台湾", Macao: "中国澳门", "(not set)": "未设置" };
const regions = geoMap as Record<string, string>;
const cities: Record<string, string> = { "Hong Kong": "香港", Singapore: "新加坡", "Kowloon City": "九龙", Shenzhen: "深圳", Guangzhou: "广州", Shanghai: "上海", Beijing: "北京", Hangzhou: "杭州", Chengdu: "成都", Chongqing: "重庆", Wuhan: "武汉", Xiamen: "厦门", Nanjing: "南京", Ningbo: "宁波", Dongguan: "东莞", Foshan: "佛山", Suzhou: "苏州", Qingdao: "青岛", Tianjin: "天津" };
const devices: Record<string, string> = { desktop: "桌面电脑", mobile: "手机", tablet: "平板", smartTV: "智能电视", "(not set)": "未设置" };
const media: Record<string, string> = { referral: "引荐", organic: "自然搜索", cpc: "付费点击", social: "社交媒体", email: "邮件", affiliate: "联盟推广", display: "展示广告", video: "视频广告", "(none)": "无媒介", "(not set)": "未设置" };
const events: Record<string, string> = { page_view: "页面浏览", session_start: "会话开始", user_engagement: "用户互动", scroll: "页面滚动", click: "点击", first_visit: "首次访问", generate_lead: "提交线索", view_item: "查看产品", view_item_list: "查看产品列表", select_item: "选择产品", form_start: "开始填写表单", form_submit: "提交表单" };

export function normalizeGeoName(value: string) {
 return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\b(province|state|region|prefecture|municipality|autonomous|county|oblast|republic|territory|district|governorate)\b/g, "").replace(/[^a-z0-9]+/g, "");
}
export function countryCode(value: string, id?: string) { return id && /^[A-Z]{2}$/.test(id) ? id : countryNames[value]; }
export function formatCountry(value: string, id?: string) {
 if (special[value]) return special[value];
 const code = countryCode(value, id);
 if (code) { try { return countries.of(code) ?? value; } catch { return value; } }
 return value || "未设置";
}
export function formatRegion(value: string, countryId?: string) {
 if (!value || value === "(not set)") return "未设置";
 return (countryId ? regions[`${countryId.toLowerCase()}:${normalizeGeoName(value)}`] : undefined) ?? special[value] ?? value;
}
export function formatCity(value: string, countryId?: string) {
 if (!value || value === "(not set)") return "未设置";
 return cities[value] ?? (countryId ? regions[`${countryId.toLowerCase()}:${normalizeGeoName(value)}`] : undefined) ?? value;
}
export function formatDevice(value: string) { return devices[value] ?? value; }
export function formatEventName(value: string) { return events[value] ?? value; }
export function formatSource(value: string) {
 if (!value || value === "(not set)") return "未设置";
 if (/^\(?direct\)?\s*\/\s*\(?none\)?$/i.test(value)) return "直接访问";
 const [source, medium, ...rest] = value.split(" / ");
 const readableMedium = medium ? (media[medium] ?? medium) : "";
 return [[source === "(direct)" ? "直接访问" : source, readableMedium].filter(Boolean).join(" / "), ...rest].join(" / ");
}
