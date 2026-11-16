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
    "禾风起 (HEFENGQI) 基础设施研究院": "HEFENGQI Infrastructure Research Institute",
    "禾风起 (HEFENGQI) 光电互联实验室": "HEFENGQI Optical Interconnect Lab",
    "禾风起 (HEFENGQI) 技术工程支持部": "HEFENGQI Technical Engineering Support",
    "禾风起 (HEFENGQI) 技术团队": "RICEWIND Technical Team",
    "禾风起技术团队": "RICEWIND Technical Team",
    "禾风起电源与温控工程团队": "RICEWIND Power & Thermal Infrastructure Team",
    "RICEWIND Power & Thermal Infrastructure Team": "RICEWIND Power & Thermal Infrastructure Team",
    "RICEWIND Technical Team": "RICEWIND Technical Team",
    "禾风起 (HEFENGQI) 基础设施洞察": "HEFENGQI Infrastructure Insights",
    "禾风起 (HEFENGQI) 编辑团队": "HEFENGQI Editorial Team"
  },
  ru: {
    "HEFENGQI Infrastructure Research Institute": "Институт инфраструктурных исследований HEFENGQI",
    "禾风起 (HEFENGQI) 基础设施研究院": "Институт инфраструктурных исследований HEFENGQI",
    "禾风起 (HEFENGQI) 光电互联实验室": "Лаборатория оптических интерконнектов HEFENGQI",
    "禾风起 (HEFENGQI) 技术工程支持部": "Отдел инженерно-технической поддержки HEFENGQI",
    "禾风起 (HEFENGQI) 技术团队": "Техническая команда HEFENGQI",
    "禾风起 (HEFENGQI) 基础设施洞察": "Инфраструктурная аналитика HEFENGQI",
    "禾风起 (HEFENGQI) 编辑团队": "Редакционная команда HEFENGQI"
  },
  fr: {
    "HEFENGQI Infrastructure Research Institute": "Institut de Recherche sur les Infrastructures HEFENGQI",
    "禾风起 (HEFENGQI) 基础设施研究院": "Institut de Recherche sur les Infrastructures HEFENGQI",
    "禾风起 (HEFENGQI) 光电互联实验室": "Laboratoire d'interconnexion optique HEFENGQI",
    "禾风起 (HEFENGQI) 技术工程支持部": "Support d'ingénierie technique HEFENGQI",
    "禾风起 (HEFENGQI) 技术团队": "Équipe technique HEFENGQI",
    "禾风起 (HEFENGQI) 基础设施洞察": "Perspectives d'infrastructure HEFENGQI",
    "禾风起 (HEFENGQI) 编辑团队": "Équipe éditoriale HEFENGQI"
  },
  de: {
    "HEFENGQI Infrastructure Research Institute": "HEFENGQI Forschungsinstitut für Infrastruktur",
    "禾风起 (HEFENGQI) 基础设施研究院": "HEFENGQI Forschungsinstitut für Infrastruktur",
    "禾风起 (HEFENGQI) 光电互联实验室": "HEFENGQI Labor für optische Verbindungen",
    "禾风起 (HEFENGQI) 技术工程支持部": "HEFENGQI Technische Unterstützung",
    "禾风起 (HEFENGQI) 技术团队": "HEFENGQI Technisches Team",
    "禾风起 (HEFENGQI) 基础设施洞察": "HEFENGQI Infrastruktur-Einblicke",
    "禾风起 (HEFENGQI) 编辑团队": "HEFENGQI Redaktionsteam"
  },
  es: {
    "HEFENGQI Infrastructure Research Institute": "Instituto de Investigación de Infraestructura HEFENGQI",
    "禾风起 (HEFENGQI) 基础设施研究院": "Instituto de Investigación de Infraestructura HEFENGQI",
    "禾风起 (HEFENGQI) 光电互联实验室": "Laboratorio de interconexión óptica HEFENGQI",
    "禾风起 (HEFENGQI) 技术工程支持部": "Soporte de ingeniería técnica HEFENGQI",
    "禾风起 (HEFENGQI) 技术团队": "Equipo técnico de HEFENGQI",
    "禾风起 (HEFENGQI) 基础设施洞察": "Perspectivas de infraestructura HEFENGQI",
    "禾风起 (HEFENGQI) 编辑团队": "Equipo editorial de HEFENGQI"
  },
  ar: {
    "HEFENGQI Infrastructure Research Institute": "معهد هيفينغتشي (HEFENGQI) لأبحاث البنية التحتية",
    "禾风起 (HEFENGQI) 基础设施研究院": "معهد هيفينغتشي (HEFENGQI) لأبحاث البنية التحتية",
    "禾风起 (HEFENGQI) 光电互联实验室": "مختبر هيفينغتشي للترابط البصري",
    "禾风起 (HEFENGQI) 技术工程支持部": "قسم الدعم الفني الهندسي لهيفينغتشي",
    "禾风起 (HEFENGQI) 技术团队": "فريق هيفينغتشي الفني",
    "禾风起 (HEFENGQI) 基础设施洞察": "رؤى هيفينغتشي للبنية التحتية",
    "禾风起 (HEFENGQI) 编辑团队": "فريق التحرير في هيفينغتشي"
  }
};


/** Localize known editorial teams without changing the database attribution.
 * Unknown CJK names are omitted in foreign locales, never replaced by a fake author.
 */
export function formatEditorialAuthor(rawName: string | undefined, locale: Locale): string {
  if (!rawName?.trim()) return "";
  const trimmed = rawName.trim();
  const alias = trimmed.replace(/RICEWIND/gi, "HEFENGQI");
  const localized = authorMap[locale]?.[trimmed] ?? authorMap[locale]?.[alias];
  const name = localized ?? trimmed;
  if (locale === "zh") return name.replace(/\s*\(HEFENGQI\)/gi, "").replace(/HEFENGQI|RICEWIND/gi, "禾风起");
  if (/[\u3400-\u9fff]/u.test(name)) return "";
  return name.replace(/HEFENGQI/gi, "RICEWIND");
}
