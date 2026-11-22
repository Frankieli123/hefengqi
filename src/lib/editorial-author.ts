import type { Locale } from "@/types/domain";

const authorMap: Record<Locale, Record<string, string>> = {
  zh: {
    "HEFENGQI Infrastructure Research Institute": "禾风起 (HEFENGQI) 基础设施研究院",
    "HEFENGQI Optical Interconnect Lab": "禾风起 (HEFENGQI) 光电互联实验室",
    "HEFENGQI Technical Engineering Support": "禾风起 (HEFENGQI) 技术工程支持部",
    "HEFENGQI Technical Team": "禾风起技术团队",
    "RICEWIND Technical Team": "禾风起技术团队",
    "RICEWIND Power & Thermal Infrastructure Team": "禾风起电源与温控工程团队",
    "HEFENGQI Infrastructure Insights": "禾风起 (HEFENGQI) 基础设施洞察",
    "HEFENGQI Editorial Team": "禾风起 (HEFENGQI) 编辑团队"
  },
  en: {
    "禾风起 (RICEWIND) 基础设施研究院": "RICEWIND Infrastructure Research Institute",
    "禾风起 (RICEWIND) 光电互联实验室": "RICEWIND Optical Interconnect Lab",
    "禾风起 (RICEWIND) 技术工程支持部": "RICEWIND Technical Engineering Support",
    "禾风起 (RICEWIND) 技术团队": "RICEWIND Technical Team",
    "禾风起技术团队": "RICEWIND Technical Team",
    "禾风起电源与温控工程团队": "RICEWIND Power & Thermal Infrastructure Team",
    "RICEWIND Power & Thermal Infrastructure Team": "RICEWIND Power & Thermal Infrastructure Team",
    "RICEWIND Technical Team": "RICEWIND Technical Team",
    "禾风起 (RICEWIND) 基础设施洞察": "RICEWIND Infrastructure Insights",
    "禾风起 (RICEWIND) 编辑团队": "RICEWIND Editorial Team"
  },
  ru: {
    "HEFENGQI Infrastructure Research Institute": "Институт инфраструктурных исследований RICEWIND",
    "禾风起 (RICEWIND) 基础设施研究院": "Институт инфраструктурных исследований RICEWIND",
    "禾风起 (RICEWIND) 光电互联实验室": "Лаборатория оптических интерконнектов RICEWIND",
    "禾风起 (RICEWIND) 技术工程支持部": "Отдел инженерно-технической поддержки RICEWIND",
    "禾风起 (RICEWIND) 技术团队": "Техническая команда RICEWIND",
    "禾风起 (RICEWIND) 基础设施洞察": "Инфраструктурная аналитика RICEWIND",
    "禾风起 (RICEWIND) 编辑团队": "Редакционная команда RICEWIND"
  },
  fr: {
    "HEFENGQI Infrastructure Research Institute": "Institut de Recherche sur les Infrastructures RICEWIND",
    "禾风起 (RICEWIND) 基础设施研究院": "Institut de Recherche sur les Infrastructures RICEWIND",
    "禾风起 (RICEWIND) 光电互联实验室": "Laboratoire d'interconnexion optique RICEWIND",
    "禾风起 (RICEWIND) 技术工程支持部": "Support d'ingénierie technique RICEWIND",
    "禾风起 (RICEWIND) 技术团队": "Équipe technique RICEWIND",
    "禾风起 (RICEWIND) 基础设施洞察": "Perspectives d'infrastructure RICEWIND",
    "禾风起 (RICEWIND) 编辑团队": "Équipe éditoriale RICEWIND"
  },
  de: {
    "HEFENGQI Infrastructure Research Institute": "RICEWIND Forschungsinstitut für Infrastruktur",
    "禾风起 (RICEWIND) 基础设施研究院": "RICEWIND Forschungsinstitut für Infrastruktur",
    "禾风起 (RICEWIND) 光电互联实验室": "RICEWIND Labor für optische Verbindungen",
    "禾风起 (RICEWIND) 技术工程支持部": "RICEWIND Technische Unterstützung",
    "禾风起 (RICEWIND) 技术团队": "RICEWIND Technisches Team",
    "禾风起 (RICEWIND) 基础设施洞察": "RICEWIND Infrastruktur-Einblicke",
    "禾风起 (RICEWIND) 编辑团队": "RICEWIND Redaktionsteam"
  },
  es: {
    "HEFENGQI Infrastructure Research Institute": "Instituto de Investigación de Infraestructura RICEWIND",
    "禾风起 (RICEWIND) 基础设施研究院": "Instituto de Investigación de Infraestructura RICEWIND",
    "禾风起 (RICEWIND) 光电互联实验室": "Laboratorio de interconexión óptica RICEWIND",
    "禾风起 (RICEWIND) 技术工程支持部": "Soporte de ingeniería técnica RICEWIND",
    "禾风起 (RICEWIND) 技术团队": "Equipo técnico de RICEWIND",
    "禾风起 (RICEWIND) 基础设施洞察": "Perspectivas de infraestructura RICEWIND",
    "禾风起 (RICEWIND) 编辑团队": "Equipo editorial de RICEWIND"
  },
  ar: {
    "HEFENGQI Infrastructure Research Institute": "معهد RICEWIND لأبحاث البنية التحتية",
    "禾风起 (RICEWIND) 基础设施研究院": "معهد هيفينغتشي (RICEWIND) لأبحاث البنية التحتية",
    "禾风起 (RICEWIND) 光电互联实验室": "مختبر هيفينغتشي للترابط البصري",
    "禾风起 (RICEWIND) 技术工程支持部": "قسم الدعم الفني الهندسي لهيفينغتشي",
    "禾风起 (RICEWIND) 技术团队": "فريق هيفينغتشي الفني",
    "禾风起 (RICEWIND) 基础设施洞察": "رؤى هيفينغتشي للبنية التحتية",
    "禾风起 (RICEWIND) 编辑团队": "فريق التحرير في هيفينغتشي"
  }
};


/** Localize known editorial teams without changing the database attribution.
 * Unknown CJK names are omitted in foreign locales, never replaced by a fake author.
 */
export function formatEditorialAuthor(rawName: string | undefined, locale: Locale): string {
  if (!rawName?.trim()) return "";
  const trimmed = rawName.trim();
  const alias = trimmed.replace(/RICEWIND/gi, "HEFENGQI");
  const canonical = trimmed.replace(/HEFENGQI/gi, "RICEWIND");
  const localized = authorMap[locale]?.[trimmed] ?? authorMap[locale]?.[alias] ?? authorMap[locale]?.[canonical];
  const name = localized ?? trimmed;
  if (locale === "zh") return name.replace(/\s*\(HEFENGQI\)/gi, "").replace(/HEFENGQI|RICEWIND/gi, "禾风起");
  if (/[\u3400-\u9fff]/u.test(name)) return "";
  return name.replace(/HEFENGQI/gi, "RICEWIND");
}
