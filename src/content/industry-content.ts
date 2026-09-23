import type { EditorialItem, Locale } from "@/types/domain";
import { getIndustryVisual } from "@/content/industry-landing";

type IndustryTranslationContent = {
  slug: string;
  title: string;
  summary: string;
  body: string[];
  seoTitle: string;
  seoDescription: string;
};

export type IndustryContentDefinition = {
  key: string;
  sortOrder: number;
  translations: Record<string, IndustryTranslationContent>;
};

export const industryContent: IndustryContentDefinition[] = [
  {
    key: "data-centers",
    sortOrder: 10,
    translations: {
      zh: {
        slug: "data-centers",
        title: "数据中心基础设施",
        summary: "围绕连续供电、热管理、机柜配套与运维边界，为企业机房、托管设施和 AI 算力场景组织可核验的设备选型信息。",
        body: [
          "数据中心设备选型应从负载规模、冗余目标、现有配电条件、机房空间和后续扩容计划开始。HEFENGQI 将这些现场约束整理为结构化需求，帮助项目团队在询价前明确供电路径、散热方式和交付边界。",
          "供电部分可围绕 UPS、直流电源、配电单元与备电系统建立设备清单，并逐项核对输入条件、输出容量、备电时间、旁路方式及维护空间。对于高密度负载，应同时确认上游容量和机柜级配电，避免只按单台设备额定功率选型。",
          "热管理部分结合热负荷、气流组织、环境温湿度与安装条件，在精密空调、列间制冷和机柜空调等形式之间进行选择。供电和制冷需要作为同一基础设施链路评估，而不是分别配置。",
          "机柜、PDU、KVM、光模块与监控接口等配套设备可纳入同一份 BOM。所有型号、参数和兼容性以制造商资料与项目复核结果为准，缺失信息不会通过推测补齐。",
        ],
        seoTitle: "数据中心基础设施解决方案",
        seoDescription: "面向企业机房、托管设施与 AI 算力场景，整理 UPS、配电、精密制冷、机柜及运维配套设备的选型信息。",
      },
      en: {
        slug: "data-centers",
        title: "Data center infrastructure",
        summary: "Verifiable equipment-selection information for continuous power, thermal management, rack infrastructure, and operations across enterprise, colocation, and AI environments.",
        body: [
          "Data center selection starts with load, redundancy targets, incoming power, available space, and the expansion plan. HEFENGQI turns these site constraints into a structured requirement so project teams can define the power path, cooling approach, and delivery boundary before requesting quotations.",
          "The power scope may combine UPS, DC power, distribution, and backup systems. Input conditions, output capacity, runtime, bypass arrangement, and service clearance should be checked together. For high-density loads, upstream capacity and rack-level distribution must be evaluated as one chain.",
          "Thermal management should reflect heat load, airflow, ambient conditions, and installation limits when selecting precision, row-based, or cabinet cooling. Power and cooling are reviewed as one infrastructure system rather than isolated equipment packages.",
          "Racks, PDUs, KVM, optical modules, and monitoring interfaces can be organized in the same bill of materials. Models, specifications, and compatibility remain subject to manufacturer documentation and project review; missing facts are not inferred.",
        ],
        seoTitle: "Data center infrastructure solutions",
        seoDescription: "Selection support for UPS, distribution, precision cooling, racks, and operational infrastructure in enterprise, colocation, and AI data centers.",
      },
      ru: {
        slug: "data-centers",
        title: "Инфраструктура центров обработки данных",
        summary: "Проверяемая информация для выбора бесперебойного питания, охлаждения, стоечной инфраструктуры и средств эксплуатации корпоративных, коммерческих и AI-ЦОД.",
        body: [
          "Подбор инфраструктуры ЦОД начинается с нагрузки, требований к резервированию, параметров ввода, доступного пространства и плана расширения. HEFENGQI преобразует эти ограничения в структурированное техническое задание, чтобы до запроса цены определить схему питания, способ охлаждения и границы поставки.",
          "Контур электропитания может включать ИБП, системы постоянного тока, распределение и резервные батареи. Входные параметры, мощность, автономность, байпас и пространство для обслуживания необходимо проверять совместно. Для высокоплотных нагрузок также учитываются вышестоящая сеть и распределение на уровне стойки.",
          "Тепловая инфраструктура выбирается с учётом нагрузки, воздушных потоков, условий среды и монтажа: прецизионное, внутрирядное или шкафное охлаждение. Питание и охлаждение рассматриваются как единая система.",
          "Стойки, PDU, KVM, оптические модули и интерфейсы мониторинга могут входить в общую спецификацию. Модели, параметры и совместимость подтверждаются документацией производителя и проверкой проекта; отсутствующие данные не предполагаются.",
        ],
        seoTitle: "Решения для инфраструктуры ЦОД",
        seoDescription: "Подбор ИБП, распределения, прецизионного охлаждения, стоек и эксплуатационной инфраструктуры для корпоративных, коммерческих и AI-ЦОД.",
      },
    },
  },
  {
    key: "telecom-5g",
    sortOrder: 20,
    translations: {
      zh: {
        slug: "telecom-5g",
        title: "电信与 5G 网络",
        summary: "面向基站、边缘节点、核心机房与传输网络，协调直流供电、站点能源、机柜散热和光通信设备的选型。",
        body: [
          "通信网络从宏站到边缘节点具有不同的负载、空间、环境和维护条件。选型需要先确认现网制式、扩容计划、输入电源、直流母线、备电目标及远程运维要求，再决定设备组合。",
          "供电链路通常涉及 -48 V 直流电源、整流模块、控制器、配电、通信蓄电池以及室内外电源系统。弱电网或离网站点还需要结合光伏、油机与储能条件评估站点能源方案，并核对系统接口与扩容能力。",
          "室外机柜与紧凑机房的热管理应结合环境温度、粉尘、湿度、防护等级和安装空间选择机柜空调或精密制冷设备。制冷能力与机柜热负荷应基于现场数据核算。",
          "SFP 光模块、KVM 与监控接口等网络配套设备需要核对速率、距离、光纤类型、协议与设备兼容性。HEFENGQI 以明确的型号和来源资料整理清单，便于采购、交付和后续维护。",
        ],
        seoTitle: "电信与 5G 网络基础设施",
        seoDescription: "面向基站、核心机房与边缘网络，提供直流电源、站点能源、机柜制冷和光通信设备的结构化选型信息。",
      },
      en: {
        slug: "telecom-5g",
        title: "Telecommunications and 5G networks",
        summary: "Coordinated selection of DC power, site energy, cabinet cooling, and optical communications equipment for radio sites, edge nodes, core facilities, and transport networks.",
        body: [
          "Telecom environments vary from macro sites to edge nodes, each with different load, space, ambient, and service conditions. Selection begins by confirming the existing network, expansion plan, incoming supply, DC bus, backup target, and remote-operations requirements.",
          "The power chain commonly includes -48 V DC systems, rectifiers, controllers, distribution, telecom batteries, and indoor or outdoor power cabinets. Weak-grid and off-grid sites may also require coordinated solar, generator, and storage inputs, with interfaces and expansion capability verified in advance.",
          "Cooling for outdoor cabinets and compact equipment rooms must reflect ambient temperature, dust, humidity, enclosure protection, and installation space. Capacity is calculated from the actual cabinet heat load rather than a generic site label.",
          "SFP optical modules, KVM, and monitoring interfaces are checked for speed, reach, fiber type, protocol, and equipment compatibility. HEFENGQI organizes the bill of materials around exact models and source documents for procurement, delivery, and maintenance.",
        ],
        seoTitle: "Telecom and 5G infrastructure solutions",
        seoDescription: "Structured selection information for DC power, site energy, cabinet cooling, and optical communications equipment across telecom and 5G networks.",
      },
      ru: {
        slug: "telecom-5g",
        title: "Телекоммуникации и сети 5G",
        summary: "Согласованный подбор систем постоянного тока, энергии площадки, шкафного охлаждения и оптической связи для базовых станций, периферийных узлов и транспортных сетей.",
        body: [
          "Условия сети различаются от макросайтов до периферийных узлов: меняются нагрузка, пространство, климат и обслуживание. Сначала уточняются действующая сеть, план расширения, входное питание, шина постоянного тока, требуемая автономность и удалённая эксплуатация.",
          "Контур питания обычно включает системы -48 V DC, выпрямители, контроллеры, распределение, телекоммуникационные батареи и внутренние либо наружные шкафы. Для слабых и автономных сетей также оцениваются солнечная генерация, ДГУ и накопители с обязательной проверкой интерфейсов и возможности расширения.",
          "Охлаждение наружных шкафов и компактных аппаратных выбирается по температуре, пыли, влажности, степени защиты и монтажному пространству. Производительность рассчитывается по фактической тепловой нагрузке шкафа.",
          "Для модулей SFP, KVM и мониторинга проверяются скорость, дальность, тип волокна, протокол и совместимость. HEFENGQI формирует перечень по точным моделям и исходным документам для закупки, поставки и обслуживания.",
        ],
        seoTitle: "Инфраструктура телекоммуникаций и 5G",
        seoDescription: "Подбор систем DC-питания, энергии площадки, шкафного охлаждения и оптической связи для телекоммуникационных и 5G-сетей.",
      },
    },
  },
  {
    key: "healthcare",
    sortOrder: 30,
    translations: {
      zh: {
        slug: "healthcare",
        title: "医疗设施与医疗网络",
        summary: "为影像设备配套机房、实验室信息系统、院内数据机房和安防网络整理连续供电与环境控制需求。",
        body: [
          "医疗设施中的信息系统、影像设备配套机房、实验室与安防网络对供电连续性和环境稳定性有明确要求。不同负载的重要等级、允许中断时间和监管要求必须由项目方确认，不能用通用产品参数替代专业设计。",
          "UPS 与备电系统的选择需要核对负载性质、启动电流、备电时间、旁路、发电机配合和维护方案。涉及医疗用途时，还应由具备资质的项目团队确认电气隔离、接地、认证与当地规范。",
          "精密空调和机柜空调可用于医疗数据机房、网络间及设备配套空间的温湿度管理。选型依据包括热负荷、冗余目标、噪声限制、气流组织和维护通道。",
          "HEFENGQI 将电源、制冷、PDU、KVM 与网络配套产品整理为可复核清单，但不会把普通工业设备描述为医疗认证设备。最终配置以设计文件、制造商资料和当地合规要求为准。",
        ],
        seoTitle: "医疗设施供电与环境控制",
        seoDescription: "为医疗数据机房、影像设备配套空间和院内网络整理 UPS、备电、精密制冷及运维配套设备的选型需求。",
      },
      en: {
        slug: "healthcare",
        title: "Healthcare facilities and networks",
        summary: "Continuous-power and environmental-control requirements for imaging support rooms, laboratory IT, healthcare data rooms, and security networks.",
        body: [
          "Healthcare IT, imaging support rooms, laboratories, and security networks have defined requirements for power continuity and environmental stability. The project owner must confirm load criticality, tolerated interruption, and regulatory scope; general product data cannot replace professional design.",
          "UPS and backup selection considers load behavior, inrush, runtime, bypass, generator coordination, and maintenance strategy. For medical use, qualified project teams must also verify isolation, grounding, certifications, and local electrical requirements.",
          "Precision and cabinet cooling can support healthcare data rooms, network rooms, and equipment spaces. Heat load, redundancy, acoustic limits, airflow, and maintenance access determine the appropriate configuration.",
          "HEFENGQI organizes power, cooling, PDU, KVM, and network products into a reviewable shortlist without describing standard industrial equipment as medically certified. Final configurations remain subject to design documents, manufacturer evidence, and local compliance review.",
        ],
        seoTitle: "Power and environmental control for healthcare facilities",
        seoDescription: "Selection requirements for UPS, backup power, precision cooling, and operational infrastructure across healthcare data rooms and support spaces.",
      },
      ru: {
        slug: "healthcare",
        title: "Медицинские объекты и сети",
        summary: "Требования к непрерывному питанию и климату для помещений сопровождения диагностического оборудования, лабораторных ИТ-систем, медицинских ЦОД и сетей безопасности.",
        body: [
          "Медицинские ИТ-системы, вспомогательные помещения диагностики, лаборатории и сети безопасности предъявляют определённые требования к непрерывности питания и стабильности среды. Категорию нагрузки, допустимый перерыв и нормативную область подтверждает проектная организация; общие характеристики продукции не заменяют проектирование.",
          "При выборе ИБП и резерва учитываются характер нагрузки, пусковые токи, автономность, байпас, взаимодействие с генератором и обслуживание. Для медицинского применения квалифицированные специалисты отдельно проверяют изоляцию, заземление, сертификаты и местные нормы.",
          "Прецизионные и шкафные кондиционеры могут обслуживать медицинские серверные, сетевые помещения и вспомогательные зоны оборудования. Конфигурация определяется тепловой нагрузкой, резервированием, шумом, воздушными потоками и доступом для обслуживания.",
          "HEFENGQI формирует проверяемый перечень питания, охлаждения, PDU, KVM и сетевого оборудования, не выдавая стандартные промышленные изделия за медицинские. Итоговая конфигурация подтверждается проектной документацией, данными производителя и местными требованиями.",
        ],
        seoTitle: "Питание и климат для медицинских объектов",
        seoDescription: "Подбор ИБП, резервного питания, прецизионного охлаждения и эксплуатационной инфраструктуры для медицинских серверных и вспомогательных помещений.",
      },
    },
  },
  {
    key: "industrial-manufacturing",
    sortOrder: 40,
    translations: {
      zh: {
        slug: "industrial-manufacturing",
        title: "工业与智能制造",
        summary: "面向生产控制、自动化设备、工业网络和边缘机房，结合负载特性与现场环境规划供电、备电和散热设备。",
        body: [
          "工业现场的控制系统、自动化产线、机器人、检测设备和边缘计算节点需要与生产节拍相匹配的电源连续性。项目应先识别关键负载、可接受停机时间、输入电能质量和恢复流程。",
          "UPS、直流电源、配电与备电系统需要结合冲击负载、上游保护、旁路、扩容和维护条件选型。任何关于短路能力、过载时间或环境适应性的要求，都必须落实到可核验的具体型号参数。",
          "工业机柜与边缘机房的制冷设备应根据热负荷、环境温度、粉尘、湿度、振动及防护要求配置。机柜空调、精密空调和气流组织需要与设备布置同步考虑。",
          "通过统一整理供电、制冷、PDU、KVM 和通信模块，可以减少多供应商交付中的接口遗漏。HEFENGQI 依据制造商资料与项目约束建立清单，并为采购阶段保留清晰的参数核对路径。",
        ],
        seoTitle: "工业与智能制造基础设施",
        seoDescription: "为生产控制、工业自动化、工业网络与边缘机房整理 UPS、直流电源、配电、备电和散热设备选型信息。",
      },
      en: {
        slug: "industrial-manufacturing",
        title: "Industrial and smart manufacturing",
        summary: "Power, backup, and thermal equipment planning for production controls, automation, industrial networks, and edge rooms based on load behavior and site conditions.",
        body: [
          "Control systems, automated lines, robotics, inspection equipment, and edge-computing nodes require power continuity aligned with the production process. Projects should first identify critical loads, tolerated downtime, incoming power quality, and recovery procedures.",
          "UPS, DC power, distribution, and backup systems are selected around transient loads, upstream protection, bypass, expansion, and service conditions. Requirements for short-circuit behavior, overload duration, or environmental tolerance must be confirmed against an exact model.",
          "Cooling for industrial cabinets and edge rooms should reflect heat load, ambient temperature, dust, humidity, vibration, and enclosure requirements. Cabinet or precision cooling and airflow planning are coordinated with equipment placement.",
          "A unified list covering power, cooling, PDU, KVM, and communications modules reduces interface gaps across multiple suppliers. HEFENGQI structures the shortlist around manufacturer documents and project constraints, preserving a clear verification path for procurement.",
        ],
        seoTitle: "Industrial and smart-manufacturing infrastructure",
        seoDescription: "Selection information for UPS, DC power, distribution, backup, and cooling across production controls, industrial networks, and edge facilities.",
      },
      ru: {
        slug: "industrial-manufacturing",
        title: "Промышленность и интеллектуальное производство",
        summary: "Планирование питания, резерва и охлаждения для производственного управления, автоматизации, промышленных сетей и периферийных аппаратных с учётом нагрузки и условий площадки.",
        body: [
          "Системы управления, автоматические линии, роботы, измерительное оборудование и периферийные вычислительные узлы требуют непрерывности питания, согласованной с производственным процессом. Сначала определяются критические нагрузки, допустимый простой, качество входной сети и процедура восстановления.",
          "ИБП, DC-питание, распределение и резерв выбираются с учётом переходных нагрузок, вышестоящей защиты, байпаса, расширения и обслуживания. Требования к короткому замыканию, перегрузке и условиям среды подтверждаются для конкретной модели.",
          "Охлаждение промышленных шкафов и периферийных аппаратных учитывает тепловую нагрузку, температуру, пыль, влажность, вибрацию и степень защиты. Шкафное либо прецизионное охлаждение и воздушные потоки согласуются с размещением оборудования.",
          "Единый перечень питания, охлаждения, PDU, KVM и коммуникационных модулей снижает риск пропуска интерфейсов при поставках разных производителей. HEFENGQI формирует список по документации и ограничениям проекта с понятной проверкой параметров на этапе закупки.",
        ],
        seoTitle: "Инфраструктура промышленности и умного производства",
        seoDescription: "Подбор ИБП, DC-питания, распределения, резерва и охлаждения для производственного управления, промышленных сетей и периферийных объектов.",
      },
    },
  },
];

export function getIndustryDemoItems(locale: Locale): EditorialItem[] {
  return industryContent.map((industry) => {
    const translation = industry.translations[locale];
    return {
      id: `industry-${industry.key}`,
      key: industry.key,
      slug: translation.slug,
      title: translation.title,
      summary: translation.summary,
      body: translation.body,
      updatedAt: "2026-09-12",
      seoTitle: translation.seoTitle,
      seoDescription: translation.seoDescription,
      coverImage: getIndustryVisual(industry.key, translation.title),
    };
  });
}
