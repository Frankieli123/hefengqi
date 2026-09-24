import type { Locale } from "@/types/domain";

export interface AboutStat {
  value: string;
  suffix?: string;
  label: string;
  description: string;
}

export interface AboutScenario {
  id: string;
  iconName: "server" | "tower" | "cpu" | "shield";
  title: string;
  specs: string;
  description: string;
}

export interface AboutCommitment {
  id: string;
  tag: string;
  title: string;
  description: string;
  highlights: string[];
}

export interface AboutProject {
  id: string;
  sector: string;
  region: string;
  title: string;
  description: string;
}

export interface AboutStep {
  step: string;
  title: string;
  summary: string;
  detail: string;
}

export interface AboutCompanyInfo {
  legalNameLabel: string;
  legalName: string;
  brandLabel: string;
  brand: string;
  locationLabel: string;
  location: string;
  websiteLabel: string;
  websiteUrl: string;
  emailLabel: string;
  email: string;
  phoneLabel: string;
  phone: string;
  hoursLabel: string;
  hours: string;
}

export interface AboutPageData {
  slogan?: string;
  title: string;
  lead: string;
  stats: AboutStat[];
  scenariosTitle: string;
  scenariosSubtitle: string;
  scenarios: AboutScenario[];
  commitmentsTitle: string;
  commitmentsSubtitle: string;
  commitments: AboutCommitment[];
  projectsTitle: string;
  projectsSubtitle: string;
  projects: AboutProject[];
  processTitle: string;
  processSubtitle: string;
  steps: AboutStep[];
  companySectionTitle: string;
  companySectionSubtitle: string;
  companyInfo: AboutCompanyInfo;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButtonText: string;
}

const coreAboutData: Record<"zh" | "en" | "ru", AboutPageData> = {
  zh: {
        title: "关于禾风起 (RICEWIND)",
    lead:
      "杭州禾风起通信技术有限公司（品牌：RICEWIND / 禾风起）是 VERTIV（维谛）、Huawei（华为）、Delta（台达）、ELTEK（安腾）与 ZTE（中兴）的专业供应链与技术服务商。我们深耕工业级关键能源与通信领域，专注为全球 B2B 客户提供原厂全新（Brand New）整机与严选二手（Pre-Owned Grade A）通信电源、高频整流模块、精密制冷空调及一体化基础设施设备。",
    stats: [
      {
        value: "56",
        suffix: "+",
        label: "覆盖国家与地区",
        description: "交付覆盖金融、能源、电信运营商与大型数据中心",
      },
      {
        value: "6",
        suffix: "+",
        label: "原厂合作品牌",
        description: "VERTIV、Huawei、Delta、ELTEK、ZTE 官方供应链",
      },
      {
        value: "100",
        suffix: "%",
        label: "原厂密封正品",
        description: "独立可追溯 S/N 序列号、官方最新固件与质保",
      },
      {
        value: "24",
        suffix: "h",
        label: "工程师直接响应",
        description: "电气负载分析、制冷容量核算及高性价比选型配置",
      },
    ],
    scenariosTitle: "关键任务应用场景",
    scenariosSubtitle: "为严苛工况与高可用要求提供高品质工业级设备供应与系统方案集成",
    scenarios: [
      {
        id: "dc",
        iconName: "server",
        title: "边缘与中型数据中心",
        specs: "5–500 m² | 5–500 kW 容量 | PUE 严苛优化",
        description:
          "提供高密度机架配电、模块化 UPS、精密列间与房间级空调，协助数据中心在严苛温控与连续供电标准下平稳运转。",
      },
      {
        id: "telecom",
        iconName: "tower",
        title: "通信枢纽中心与基站",
        specs: "-48V 高可靠直流电源 | 传输机房 | 宏基站",
        description:
          "为电信核心机房、骨干传输节点与各型通信宏基站提供高效嵌入式整流电源、智能电池管理及远程动环监控设备。",
      },
      {
        id: "industry",
        iconName: "cpu",
        title: "工业控制与能源设施",
        specs: "智能制造 | 轨道交通 | 电力与能源公用工程",
        description:
          "针对工业控制室、变电站与自动化产线的恶劣电网与温湿度环境，配置耐冲击、高防护的工业级电源与备电系统。",
      },
      {
        id: "cleanroom",
        iconName: "shield",
        title: "医疗洁净室与精密实验室",
        specs: "精密恒温恒湿 | 医疗影像设施 | 零中断备电",
        description:
          "为医院大型影像设备、生化净化实验室及高价值洁净厂房提供恒温恒湿环境控制与零切换毫秒级备电解决方案。",
      },
    ],
    commitmentsTitle: "原厂品质与工程师直联服务",
    commitmentsSubtitle: "坚守工业级交付底线，原厂全新与严选二手双轨现货，100% 满载跑机实测",
    commitments: [
      {
        id: "authenticity",
        tag: "供应链基准",
        title: "原厂全新与严选二手 · 双轨现货保障",
        description:
          "我们同时提供原厂全新密封设备与海量严选二手通信电源、整流模块现货储备。无论全新还是二手件，出厂前均经过 100% 满载高功率跑机老化实测，确保电气指标与可靠性完全达标。",
        highlights: [
          "原厂全新整机与严选二手模块双轨储备，满足不同工期与预算需求",
          "100% 满载高功率测试台真机跑机老化测试，杜绝隐性故障",
          "支持快速现货直发，为全球基站与机房提供敏捷供电保障",
        ],
      },
      {
        id: "engineering",
        tag: "技术保障",
        title: "资深工程师全程把关 · 拒绝外包话务",
        description:
          "禾风起绝非普通贸易转手商或外包呼叫中心。每个产品线均由具备多年现场调测经验的资深通信与电气工程师严格跟进把关。",
        highlights: [
          "专属销售工程师 1 对 1 技术沟通与方案核对",
          "24 小时内出具专业电气负载分析与制冷容量核算",
          "提供高性价比选型配置建议与全套技术白皮书",
        ],
      },
    ],
    projectsTitle: "全球实战交付业绩",
    projectsSubtitle: "产品与方案已成功部署至全球 56+ 国家和地区的关键基础设施",
    projects: [
      {
        id: "p1",
        sector: "金融基础设施",
        region: "中东地区",
        title: "跨国商业银行核心数据中心高可靠供配电改造",
        description:
          "为中东核心商业银行机房提供多套高可用模块化电源与列间精密制冷系统，实现老旧配电系统的平滑无缝升级。",
      },
      {
        id: "p2",
        sector: "大型工业制造",
        region: "亚太地区",
        title: "大型工业级整流与关键任务蓄电池备电系统集成",
        description:
          "为大型先进制造园区提供大容量直流供电模块与耐严苛工况的备用电池管理单元，保障自动化产线连续供电。",
      },
      {
        id: "p3",
        sector: "电信运营商",
        region: "东南亚地区",
        title: "跨国电信运营商骨干 POP 站点交钥匙供电保障",
        description:
          "为多个关键传输机房及海缆登陆 POP 站点部署标准化高频开关电源系统，配合远程调测指导实现快速交付验收。",
      },
    ],
    processTitle: "规范化采购与交付流程",
    processSubtitle: "五步闭环管理，确保从规格确认到售后技术支持全程透明高效",
    steps: [
      {
        step: "01",
        title: "提交需求",
        summary: "明确型号或工况参数",
        detail:
          "通过官网表单、商务邮件或 WhatsApp 发送采购清单（BOQ）、设备型号或现场电气与制冷参数。",
      },
      {
        step: "02",
        title: "专业核算",
        summary: "24 小时出具方案与报价",
        detail:
          "资深工程师在 24 小时内核算负载与容量，出具详细技术规格确认书与形式发票（PI / Quotation）。",
      },
      {
        step: "03",
        title: "合同生效",
        summary: "签署协议并锁定货期",
        detail:
          "双方签署正规国际采购协议并支付 30% 预付款，支持电汇 T/T、不可撤销信用证 L/C 等结算方式。",
      },
      {
        step: "04",
        title: "安全交付",
        summary: "原包装出库与单证齐全",
        detail:
          "原厂原包装出库，严格加固免熏蒸木箱，随货附带商业发票、装箱单、原产地证（CO）及出厂合格质保单。",
      },
      {
        step: "05",
        title: "持续护航",
        summary: "质保响应与技术调试指导",
        detail:
          "提供原厂备品备件通道、RMA 快速质保响应、全套技术白皮书与资深工程师远程开通调试指导。",
      },
    ],
    companySectionTitle: "企业资质与官方联络",
    companySectionSubtitle: "杭州实体技术企业，真诚期待与全球工程总包与采购团队建立长期合作",
    companyInfo: {
      legalNameLabel: "公司全称",
      legalName: "杭州禾风起通信技术有限公司",
      brandLabel: "运营品牌",
      brand: "RICEWIND",
      locationLabel: "公司总部",
      location: "中国 浙江省 杭州市",
      websiteLabel: "官方网址",
      websiteUrl: "https://ricewind.com",
      emailLabel: "商务邮箱",
      email: "lee@ricewind.com",
      phoneLabel: "WhatsApp / 微信",
      phone: "+86 17621197907",
      hoursLabel: "服务时间",
      hours: "周一至周五 9:00–18:00 (GMT+8，紧急项目 7×24h 在线)",
    },
    ctaTitle: "准备好为您的关键项目配置可靠设备了吗？",
    ctaSubtitle: "联系专属工程师，24 小时内获取针对您工况的深度配置核算与正式报价。",
    ctaButtonText: "提交采购需求",
  },
  en: {
    slogan: "Powering Connections, Securing Critical Infrastructure.",
    title: "About RICEWIND",
    lead:
      "RICEWIND (Hangzhou Ricewind Technology Co., Ltd.) is a specialized channel partner and technical solution integrator for VERTIV, Huawei, Delta, ELTEK, and ZTE. Headquartered in Hangzhou, China, we specialize in supplying authentic, factory-sealed critical power, precision cooling, and telecom/datacenter infrastructure equipment for international B2B procurement partners and infrastructure contractors.",
    stats: [
      {
        value: "56",
        suffix: "+",
        label: "Countries & Regions Deployed",
        description: "Deployed across telecom carriers, banking, energy, and data centers",
      },
      {
        value: "6",
        suffix: "+",
        label: "Tier-1 Brand Ecosystem",
        description: "Authorized channels for VERTIV, Huawei, Delta, ELTEK, and ZTE",
      },
      {
        value: "100",
        suffix: "%",
        label: "Factory-Sealed & Authentic",
        description: "Individual verifiable serial numbers (S/N) and latest official firmware",
      },
      {
        value: "24",
        suffix: "h",
        label: "Direct Engineering Turnaround",
        description: "Electrical load calculations, thermal dissipation analysis & optimized BOQ",
      },
    ],
    scenariosTitle: "Mission-Critical Application Scenarios",
    scenariosSubtitle: "Supplying and integrating high-reliability industrial hardware for demanding operational environments",
    scenarios: [
      {
        id: "dc",
        iconName: "server",
        title: "Edge & Medium Data Centers",
        specs: "5–500 m² | 5–500 kW Capacity | Rigorous PUE Optimization",
        description:
          "Modular UPS systems, rack-mount power distribution units, and row/room precision air conditioners engineered for continuous uptime and strict temperature tolerances.",
      },
      {
        id: "telecom",
        iconName: "tower",
        title: "Telecom Central Offices & BTS Sites",
        specs: "-48V DC Power Systems | Transmission Hubs | Macro BTS",
        description:
          "High-efficiency embedded rectifiers, intelligent battery lifecycle controllers, and centralized environment monitoring for critical cellular and fiber nodes.",
      },
      {
        id: "industry",
        iconName: "cpu",
        title: "Industrial Control & Energy Utilities",
        specs: "Smart Manufacturing | Rail Transit | Electric Utilities",
        description:
          "Ruggedized power systems engineered to withstand severe power grid fluctuations, electromagnetic interference, and wide operating temperature ranges.",
      },
      {
        id: "cleanroom",
        iconName: "shield",
        title: "Medical Facilities & Laboratories",
        specs: "Constant Temperature & Humidity | Imaging Rooms | Zero-Transfer UPS",
        description:
          "Zero-interruption power backup and precise environmental conditioning for high-value medical scanners, cleanrooms, and analytical laboratories.",
      },
    ],
    commitmentsTitle: "Authenticity Assurance & Direct Engineering",
    commitmentsSubtitle: "Industrial-grade integrity: dual-track Brand New & Pre-Owned Grade A inventory with 100% full-load bench testing",
    commitments: [
      {
        id: "authenticity",
        tag: "Supply Chain Integrity",
        title: "Brand New & Pre-Owned Grade A · Dual Inventory Assurance",
        description:
          "Our established procurement channels ensure that every module, UPS, and air conditioner is delivered in factory-sealed packaging with full audit compliance.",
        highlights: [
          "Dual-track supply: Brand New and Pre-Owned Grade A to meet varied deployment timelines and budgets",
          "100% Full-load burn-in testing on dedicated test racks prior to dispatch",
          "Immediate worldwide dispatch for rapid site recovery and continuous operations",
        ],
      },
      {
        id: "engineering",
        tag: "Technical Delivery",
        title: "Dedicated Engineers · No Outsourced Call Centers",
        description:
          "We are far more than a conventional trading intermediary. Every product portfolio is overseen by experienced electrical and HVAC application engineers.",
        highlights: [
          "Direct 1-on-1 technical sales engineer consultation on every inquiry",
          "Detailed load analysis and heat dissipation calculations delivered within 24 hours",
          "Optimized bill of quantities with complete technical documentation and whitepapers",
        ],
      },
    ],
    projectsTitle: "Proven Global Track Record",
    projectsSubtitle: "Hardware and turnkey systems deployed across mission-critical sites worldwide",
    projects: [
      {
        id: "p1",
        sector: "Financial Infrastructure",
        region: "Middle East",
        title: "Regional Commercial Bank Core Data Center Power Retrofit",
        description:
          "Supplied high-reliability modular UPS suites and in-row precision cooling to ensure 100% uptime during core banking workload migration.",
      },
      {
        id: "p2",
        sector: "Heavy Manufacturing",
        region: "Asia-Pacific",
        title: "Industrial Rectifier & Mission-Critical Battery Power Integration",
        description:
          "Deployed heavy-duty DC power distribution units and battery protection arrays to shield automated assembly lines from grid fluctuations.",
      },
      {
        id: "p3",
        sector: "Telecommunications",
        region: "Southeast Asia",
        title: "Multinational Telecom Carrier Backbone POP Infrastructure",
        description:
          "Equipped critical POP and landing points with standardized high-frequency DC switching systems and remote commissioning support.",
      },
    ],
    processTitle: "Standardized 5-Step Procurement Workflow",
    processSubtitle: "Transparent, auditable execution from initial BOQ submission to post-delivery technical commissioning",
    steps: [
      {
        step: "01",
        title: "Submit Inquiry",
        summary: "Send Bill of Quantities or Target Models",
        detail:
          "Submit your target equipment list, system parameters, or project requirements via web form, business email, or WhatsApp.",
      },
      {
        step: "02",
        title: "Technical Offer",
        summary: "24-Hour Engineering & Commercial Proposal",
        detail:
          "Receive tailored technical datasheets, heat/power calculations, and formal commercial quotation (PI) within 24 hours.",
      },
      {
        step: "03",
        title: "Order Confirmation",
        summary: "Sign Agreement & Secure Allocation",
        detail:
          "Countersign sales contract and confirm order with a 30% advance deposit via Wire Transfer (T/T) or Irrevocable L/C.",
      },
      {
        step: "04",
        title: "Secure Dispatch",
        summary: "Factory Packaging & Full Export Paperwork",
        detail:
          "Factory-sealed units reinforced in export-grade wooden crates, accompanied by Commercial Invoice, Packing List, Certificate of Origin (CO), and Warranty docs.",
      },
      {
        step: "05",
        title: "Lifecycle Support",
        summary: "RMA Fast-Track & Engineering Support",
        detail:
          "Access authentic spare parts supply, rapid RMA processing, technical whitepapers, and remote commissioning assistance by senior engineers.",
      },
    ],
    companySectionTitle: "Corporate Credentials & Direct Contact",
    companySectionSubtitle: "Hangzhou-based engineering supplier dedicated to long-term partnerships with global contractors and buyers",
    companyInfo: {
      legalNameLabel: "Legal Entity",
      legalName: "Hangzhou Ricewind Technology Co., Ltd.",
      brandLabel: "Operating Brand",
      brand: "RICEWIND",
      locationLabel: "Headquarters",
      location: "Hangzhou, Zhejiang Province, China",
      websiteLabel: "Official Website",
      websiteUrl: "https://ricewind.com",
      emailLabel: "Business Email",
      email: "lee@ricewind.com",
      phoneLabel: "WhatsApp / WeChat",
      phone: "+86 17621197907",
      hoursLabel: "Business Hours",
      hours: "Mon–Fri 9:00–18:00 (GMT+8 / 24/7 on-call for critical tenders)",
    },
    ctaTitle: "Ready to procure certified equipment for your project?",
    ctaSubtitle: "Speak directly with an application engineer. Receive verified calculations and commercial terms within 24 hours.",
    ctaButtonText: "Submit Your Inquiry",
  },
  ru: {
    slogan: "Энергия связи, надежность критической инфраструктуры.",
    title: "О компании RICEWIND",
    lead:
      "Компания RICEWIND (Hangzhou Ricewind Technology Co., Ltd.) — надежный специализированный поставщик и технический интегратор решений VERTIV, Huawei, Delta, ELTEK и ZTE. Наш головной офис расположен в г. Ханчжоу (Китай). Мы специализируемся на прямых B2B-поставках оригинального оборудования гарантированного качества для дата-центров, телекоммуникационных сетей и промышленной энергоинфраструктуры.",
    stats: [
      {
        value: "56",
        suffix: "+",
        label: "Стран присутствия",
        description: "Поставки для телекоммуникаций, банковского сектора, энергетики и ЦОД",
      },
      {
        value: "6",
        suffix: "+",
        label: "Ведущих брендов-партнеров",
        description: "Официальные цепочки поставок VERTIV, Huawei, Delta, ELTEK, ZTE",
      },
      {
        value: "100",
        suffix: "%",
        label: "Заводская оригинальность",
        description: "Оригинальная заводская упаковка, серийные номера и официальное ПО",
      },
      {
        value: "24",
        suffix: "ч",
        label: "Инженерный расчет",
        description: "Расчет электрических нагрузок, тепловыделения и подбор спецификаций",
      },
    ],
    scenariosTitle: "Ключевые области применения",
    scenariosSubtitle: "Поставка и системная интеграция оборудования для ответственных объектов с высокими требованиями к надежности",
    scenarios: [
      {
        id: "dc",
        iconName: "server",
        title: "Периферийные и средние ЦОД",
        specs: "5–500 м² | Мощность 5–500 кВт | Оптимизация PUE",
        description:
          "Модульные ИБП, интеллектуальное распределение питания и прецизионные кондиционеры для непрерывной работы вычислительных мощностей.",
      },
      {
        id: "telecom",
        iconName: "tower",
        title: "Узлы связи и базовые станции",
        specs: "Системы -48В | Опорные сети | Базовые станции",
        description:
          "Высокоэффективные выпрямительные системы, контроллеры мониторинга аккумуляторов и системы электропитания для макростанций.",
      },
      {
        id: "industry",
        iconName: "cpu",
        title: "Диспетчерские и АСУ ТП",
        specs: "Промышленные предприятия | Транспорт | Энергетика",
        description:
          "Отказоустойчивые промышленные системы питания, адаптированные к нестабильным сетям, электромагнитным помехам и перепадам температур.",
      },
      {
        id: "cleanroom",
        iconName: "shield",
        title: "Чистые помещения и лаборатории",
        specs: "Прецизионный климат | Медоборудование | Безобрывное питание",
        description:
          "Решения для медицинских диагностических комплексов, фармацевтических производств и прецизионных измерительных лабораторий.",
      },
    ],
    commitmentsTitle: "Заводское качество и инженерная поддержка",
    commitmentsSubtitle: "Промышленная надежность: новые и б/у компоненты Grade A со 100% нагрузочным тестированием",
    commitments: [
      {
        id: "authenticity",
        tag: "Надежность поставок",
        title: "Новое и проверенное б/у (Grade A) · Гарантия двойного склада",
        description:
          "Прямое взаимодействие с дистрибьюторскими каналами гарантирует поставку оборудования в заводской опломбированной упаковке.",
        highlights: [
          "Двойной склад: новое оборудование (Brand New) и проверенное б/у (Grade A) под любые бюджеты и сроки",
          "100% Нагрузочное тестирование на специализированных стендах перед отгрузкой",
          "Оперативная доставка по всему миру для срочного восстановления узлов связи",
        ],
      },
      {
        id: "engineering",
        tag: "Инженерная экспертиза",
        title: "Квалифицированные инженеры · Без посредников",
        description:
          "Мы не являемся обычной перепродающей компанией. Каждое направление курируют опытные инженеры по энергосистемам и прецизионному климату.",
        highlights: [
          "Прямая работа с техническими специалистами по каждому запросу",
          "Расчет тепловыделения и электрических мощностей в течение 24 часов",
          "Оптимальный подбор спецификаций (BOQ) и технические паспорта",
        ],
      },
    ],
    projectsTitle: "Опыт глобальных внедрений",
    projectsSubtitle: "Успешно реализованные проекты в более чем 56 странах мира",
    projects: [
      {
        id: "p1",
        sector: "Банковский сектор",
        region: "Ближний Восток",
        title: "Модернизация энергоснабжения центрального ЦОД коммерческого банка",
        description:
          "Поставка отказоустойчивых модульных систем бесперебойного питания и рядных прецизионных кондиционеров.",
      },
      {
        id: "p2",
        sector: "Промышленность",
        region: "Азиатско-Тихоокеанский регион",
        title: "Интеграция промышленных выпрямителей и систем аварийного питания",
        description:
          "Оснащение высоконагруженных автоматизированных производственных линий стабильными системами постоянного тока.",
      },
      {
        id: "p3",
        sector: "Телекоммуникации",
        region: "Юго-Восточная Азия",
        title: "Комплексное оснащение опорных узлов связи (POP) телеком-оператора",
        description:
          "Поставка стандартизированных высокочастотных систем электропитания и инженерная поддержка при вводе в эксплуатацию.",
      },
    ],
    processTitle: "5 шагов взаимодействия",
    processSubtitle: "Прозрачный и стандартизированный процесс от первой заявки до запуска в эксплуатацию",
    steps: [
      {
        step: "01",
        title: "Заявка",
        summary: "Спецификация или список моделей",
        detail:
          "Отправка проектной спецификации (BOQ) или перечня моделей через форму на сайте, электронную почту или WhatsApp.",
      },
      {
        step: "02",
        title: "ТКП и расчет",
        summary: "Технико-коммерческое предложение за 24 часа",
        detail:
          "Предоставление инженерного расчета нагрузок, технических паспортов и официального коммерческого предложения (PI).",
      },
      {
        step: "03",
        title: "Согласование",
        summary: "Договор и фиксация сроков",
        detail:
          "Подписание договора поставки и внесение предоплаты 30% (банковский перевод T/T или безотзывный аккредитив L/C).",
      },
      {
        step: "04",
        title: "Отгрузка",
        summary: "Заводская упаковка и экспортные документы",
        detail:
          "Отгрузка в оригинальной упаковке с деревянной обрешеткой, инвойс, упаковочный лист, сертификат происхождения (CO) и гарантийный талон.",
      },
      {
        step: "05",
        title: "Поддержка",
        summary: "Гарантия, ЗИП и сервис",
        detail:
          "Поставка оригинальных запчастей (ЗИП), оперативная обработка гарантийных запросов (RMA) и консультации инженеров.",
      },
    ],
    companySectionTitle: "Реквизиты и контакты",
    companySectionSubtitle: "Технологическая компания из г. Ханчжоу — ваш надежный партнер для реализации критических проектов",
    companyInfo: {
      legalNameLabel: "Юридическое лицо",
      legalName: "Hangzhou Ricewind Technology Co., Ltd.",
      brandLabel: "Бренд",
      brand: "RICEWIND",
      locationLabel: "Головной офис",
      location: "г. Ханчжоу, провинция Чжэцзян, Китай",
      websiteLabel: "Официальный сайт",
      websiteUrl: "https://ricewind.com",
      emailLabel: "Электронная почта",
      email: "lee@ricewind.com",
      phoneLabel: "WhatsApp / WeChat",
      phone: "+86 17621197907",
      hoursLabel: "График работы",
      hours: "Пн–Пт 9:00–18:00 (GMT+8 / 24/7 для экстренных проектов)",
    },
    ctaTitle: "Готовы подобрать надежное оборудование для вашего проекта?",
    ctaSubtitle: "Свяжитесь с нашими инженерами и получите детальный расчет спецификации в течение 24 часов.",
    ctaButtonText: "Отправить запрос",
  },
};

export const aboutData: Record<Locale, AboutPageData> = {
  ...coreAboutData,
  fr: {
      "slogan": "Alimenter les connexions, sécuriser les infrastructures critiques.",
      "title": "À propos de RICEWIND",
      "lead": "RICEWIND (Hangzhou Ricewind Technology Co., Ltd.) est un partenaire de distribution et intégrateur spécialisé pour VERTIV, Huawei, Delta, ELTEK et ZTE. Nous fournissons des systèmes neufs scellés (Brand New) ainsi qu'un stock massif d'équipements de seconde main certifiés (Pre-Owned Grade A) : baies d'énergie, redresseurs et climatisation de précision pour les acteurs B2B mondiaux.",
      "stats": [
          {
              "value": "56",
              "suffix": "+",
              "label": "Pays et régions desservis",
              "description": "Déployé auprès d'opérateurs télécoms, banques, acteurs de l'énergie et centres de données"
          },
          {
              "value": "6",
              "suffix": "+",
              "label": "Écosystème de marques de premier rang",
              "description": "Canaux officiels pour VERTIV, Huawei, Delta, ELTEK et ZTE"
          },
          {
              "value": "100",
              "suffix": "%",
              "label": "Scellé d'usine et authentique",
              "description": "Numéros de série (S/N) vérifiables individuellement et micrologiciels officiels à jour"
          },
          {
              "value": "24",
              "suffix": "h",
              "label": "Délai de réponse technique direct",
              "description": "Calculs de charges électriques, analyses de dissipation thermique et BOQ optimisés"
          }
      ],
      "scenariosTitle": "Scénarios d'application pour infrastructures critiques",
      "scenariosSubtitle": "Fourniture et intégration d'équipements industriels haute fiabilité pour environnements opérationnels exigeants",
      "scenarios": [
          {
              "id": "dc",
              "iconName": "server",
              "title": "Centres de données Edge et de moyenne envergure",
              "specs": "5–500 m² | Puissance de 5 à 500 kW | Optimisation rigoureuse du PUE",
              "description": "Systèmes d'onduleurs modulaires, unités de distribution d'alimentation en rack et climatiseurs de précision en rangée ou en salle, conçus pour une disponibilité continue et une tolérance thermique stricte."
          },
          {
              "id": "telecom",
              "iconName": "tower",
              "title": "Centraux télécoms et stations de base (BTS)",
              "specs": "Systèmes d'énergie CC -48 V | Nœuds de transmission | BTS macro",
              "description": "Redresseurs intégrés à haut rendement, contrôleurs intelligents du cycle de vie des batteries et surveillance centralisée de l'environnement pour les nœuds cellulaires et fibre optique critiques."
          },
          {
              "id": "industry",
              "iconName": "cpu",
              "title": "Contrôle industriel et services énergétiques",
              "specs": "Industrie 4.0 | Transport ferroviaire | Réseaux électriques",
              "description": "Systèmes d'alimentation durcis conçus pour résister aux fortes fluctuations du réseau électrique, aux interférences électromagnétiques et aux plages de températures extrêmes."
          },
          {
              "id": "cleanroom",
              "iconName": "shield",
              "title": "Installations médicales et laboratoires",
              "specs": "Température et hygrométrie constantes | Salles d'imagerie | Onduleurs sans temps de transfert",
              "description": "Alimentation de secours sans interruption et régulation climatique de précision pour les scanners médicaux de pointe, salles blanches et laboratoires d'analyse."
          }
      ],
      "commitmentsTitle": "Garantie d'authenticité et expertise technique directe",
      "commitmentsSubtitle": "Rigueur industrielle : stock double voie Neuf & Seconde main Grade A avec tests à 100 % sous pleine charge",
      "commitments": [
          {
              "id": "authenticity",
              "tag": "Intégrité de la chaîne d'approvisionnement",
              "title": "Neuf d'usine & Seconde main Grade A · Double garantie de disponibilité",
              "description": "Nos canaux d'approvisionnement établis garantissent que chaque module, onduleur et climatiseur est livré dans son emballage d'origine scellé d'usine, en parfaite conformité d'audit.",
              "highlights": [
                  "Approvisionnement double voie : Neuf et Seconde main Grade A adaptés à tous les calendriers et budgets",
                  "100 % De tests sous pleine charge sur bancs d'essai dédiés avant chaque départ",
                  "Expédition internationale rapide pour la maintenance et la continuité de service des sites"
              ]
          },
          {
              "id": "engineering",
              "tag": "Livraison technique",
              "title": "Ingénieurs dédiés · Aucun centre d'appels sous-traité",
              "description": "Bien plus qu'un simple intermédiaire commercial : chaque portefeuille de produits est supervisé par des ingénieurs d'application expérimentés en électricité et CVC.",
              "highlights": [
                  "Consultation technique individuelle et directe avec un ingénieur technico-commercial pour chaque demande",
                  "Bilan de puissance détaillé et calculs de dissipation thermique fournis sous 24 heures",
                  "Bordereau quantitatif (BOQ) optimisé accompagné d'une documentation technique complète et de livres blancs"
              ]
          }
      ],
      "projectsTitle": "Références internationales éprouvées",
      "projectsSubtitle": "Matériels et solutions clés en main déployés sur des sites stratégiques à travers le monde",
      "projects": [
          {
              "id": "p1",
              "sector": "Infrastructure financière",
              "region": "Moyen-Orient",
              "title": "Rénovation électrique du centre de données principal d'une banque commerciale régionale",
              "description": "Fourniture de systèmes d'onduleurs modulaires haute fiabilité et de climatiseurs de précision en rangée pour assurer une disponibilité continue à 100 % pendant la migration des charges de travail bancaires critiques."
          },
          {
              "id": "p2",
              "sector": "Industrie lourde",
              "region": "Asie-Pacifique",
              "title": "Intégration de redresseurs industriels et d'alimentations de secours par batterie critique",
              "description": "Déploiement d'unités de distribution d'énergie continue (CC) industrielles et de baies de protection de batteries pour prémunir les lignes d'assemblage automatisées contre les perturbations du réseau."
          },
          {
              "id": "p3",
              "sector": "Télécommunications",
              "region": "Asie du Sud-Est",
              "title": "Infrastructure de points de présence (POP) dorsale pour un opérateur télécom multinational",
              "description": "Équipement des POP stratégiques et stations d'atterrissement avec des systèmes d'alimentation CC à découpage haute fréquence standardisés et assistance à la mise en service à distance."
          }
      ],
      "processTitle": "Processus d'approvisionnement standardisé en 5 étapes",
      "processSubtitle": "Exécution transparente et auditable, de la soumission initiale du BOQ à la mise en service technique après livraison",
      "steps": [
          {
              "step": "01",
              "title": "Soumission de la demande",
              "summary": "Envoi du bordereau quantitatif (BOQ) ou des références cibles",
              "detail": "Transmettez votre liste de matériel cible, vos paramètres système ou vos spécifications de projet via notre formulaire web, par e-mail professionnel ou par WhatsApp."
          },
          {
              "step": "02",
              "title": "Offre technique",
              "summary": "Proposition technique et commerciale sous 24 heures",
              "detail": "Recevez des fiches techniques adaptées, les calculs thermiques/électriques et une offre commerciale officielle (PI) sous 24 heures."
          },
          {
              "step": "03",
              "title": "Confirmation de commande",
              "summary": "Signature du contrat et réservation des stocks",
              "detail": "Contresignature du contrat commercial et confirmation de commande avec un acompte de 30 % par virement bancaire (T/T) ou lettre de crédit irrévocable (L/C)."
          },
          {
              "step": "04",
              "title": "Expédition sécurisée",
              "summary": "Emballage d'usine et documentation d'exportation complète",
              "detail": "Équipements scellés d'usine renforcés dans des caisses en bois conformes aux normes d'exportation, accompagnés de la facture commerciale, de la liste de colisage, du certificat d'origine (CO) et des documents de garantie."
          },
          {
              "step": "05",
              "title": "Support tout au long du cycle de vie",
              "summary": "Procédure RMA accélérée et assistance technique",
              "detail": "Approvisionnement en pièces de rechange d'origine, traitement rapide des retours (RMA), livres blancs techniques et assistance à la mise en service à distance par des ingénieurs confirmés."
          }
      ],
      "companySectionTitle": "Informations sur l'entreprise et contact direct",
      "companySectionSubtitle": "Fournisseur d'ingénierie basé à Hangzhou, dédié aux partenariats durables avec les contractants et donneurs d'ordre internationaux",
      "companyInfo": {
          "legalNameLabel": "Raison sociale",
          "legalName": "Hangzhou Ricewind Technology Co., Ltd.",
          "brandLabel": "Marque commerciale",
          "brand": "RICEWIND",
          "locationLabel": "Siège social",
          "location": "Hangzhou, province du Zhejiang, Chine",
          "websiteLabel": "Site officiel",
          "websiteUrl": "https://ricewind.com",
          "emailLabel": "E-mail professionnel",
          "email": "lee@ricewind.com",
          "phoneLabel": "WhatsApp / WeChat",
          "phone": "+86 17621197907",
          "hoursLabel": "Heures d'ouverture",
          "hours": "Lun–Ven 9:00–18:00 (GMT+8 / Permanence 24/7 pour les appels d'offres critiques)"
      },
      "ctaTitle": "Prêt à acquérir des équipements certifiés pour votre projet ?",
      "ctaSubtitle": "Échangez directement avec un ingénieur d'application. Obtenez des calculs vérifiés et des conditions commerciales sous 24 heures.",
      "ctaButtonText": "Envoyer votre demande"
  },
  de: {
      "slogan": "Verbindungen stärken, kritische Infrastrukturen sichern.",
      "title": "Über RICEWIND",
      "lead": "RICEWIND (Hangzhou Ricewind Technology Co., Ltd.) ist ein spezialisierter Vertriebspartner und Systemintegrator für VERTIV, Huawei, Delta, ELTEK und ZTE. Mit Hauptsitz in Hangzhou, China, sind wir auf die Belieferung internationaler B2B-Beschaffungspartner und Infrastruktur-Auftragnehmer mit originaler, werksversiegelter Ausrüstung für unterbrechungsfreie Stromversorgungen (Critical Power), Präzisionsklimatisierung sowie Telekommunikations- und Rechenzentrumsinfrastruktur spezialisiert.",
      "stats": [
          {
              "value": "56",
              "suffix": "+",
              "label": "Länder & Regionen beliefert",
              "description": "Im Einsatz bei Telekommunikationsanbietern, Banken, Energieversorgern und Rechenzentren"
          },
          {
              "value": "6",
              "suffix": "+",
              "label": "Tier-1-Markenportfolio",
              "description": "Autorisierte Vertriebskanäle für VERTIV, Huawei, Delta, ELTEK und ZTE"
          },
          {
              "value": "100",
              "suffix": "%",
              "label": "Original & werksversiegelt",
              "description": "Individuell verifizierbare Seriennummern (S/N) und neueste offizielle Hersteller-Firmware"
          },
          {
              "value": "24",
              "suffix": "h",
              "label": "Engineering-Reaktionszeit",
              "description": "Elektrische Lastberechnungen, thermische Verlustleistungsanalysen & optimierte Stücklisten (BOQ)"
          }
      ],
      "scenariosTitle": "Missionskritische Einsatzszenarien",
      "scenariosSubtitle": "Bereitstellung und Integration hochzuverlässiger Industrie-Hardware für anspruchsvolle Betriebsumgebungen",
      "scenarios": [
          {
              "id": "dc",
              "iconName": "server",
              "title": "Edge- & mittelgroße Rechenzentren",
              "specs": "5–500 m² | 5–500 kW Kapazität | Strenge PUE-Optimierung",
              "description": "Modulare USV-Systeme, Rack-Stromverteilung (PDUs) und Reihen-/Raum-Präzisionsklimageräte, ausgelegt auf maximale Verfügbarkeit und engste Temperaturtoleranzen."
          },
          {
              "id": "telecom",
              "iconName": "tower",
              "title": "Telekom-Vermittlungsstellen & BTS-Standorte",
              "specs": "-48-V-DC-Stromversorgungssysteme | Übertragungsknoten | Makro-BTS",
              "description": "Hocheffiziente Einbaugleichrichter, intelligente Batterielebensdauer-Controller und zentrale Umgebungsüberwachung für geschäftskritische Mobilfunk- und Glasfaserknoten."
          },
          {
              "id": "industry",
              "iconName": "cpu",
              "title": "Industriesteuerung & Energieversorgung",
              "specs": "Smart Manufacturing | Bahn- & Schienenverkehr | Energieversorgungsunternehmen",
              "description": "Robuste Stromversorgungssysteme, konzipiert für extreme Netzspannungsschwankungen, elektromagnetische Störfelder und weite Betriebstemperaturbereiche."
          },
          {
              "id": "cleanroom",
              "iconName": "shield",
              "title": "Medizinische Einrichtungen & Labore",
              "specs": "Konstante Temperatur & Feuchte | Bildgebungsräume | Zero-Transfer-USV",
              "description": "Unterbrechungsfreie Stromversorgung ohne Umschaltzeiten sowie hochpräzise Klimatechnik für bildgebende Großgeräte, Reinräume und Analyselabore."
          }
      ],
      "commitmentsTitle": "Echtheitsgarantie & direkte Engineering-Kompetenz",
      "commitmentsSubtitle": "Industrielle Verlässlichkeit: Fabrikneu & Geprüfte Gebrauchtware Grade A mit 100 % Volllast-Prüfung",
      "commitments": [
          {
              "id": "authenticity",
              "tag": "Lieferketten-Integrität",
              "title": "Fabrikneu & Geprüfte Gebrauchtware (Grade A) · Duale Lagerhaltung",
              "description": "Unsere etablierten Beschaffungskanäle garantieren, dass jedes Modul, jede USV und jedes Klimagerät in ungeöffneter Originalverpackung und mit voller Audit-Konformität geliefert wird.",
              "highlights": [
                  "Duales Liefermodell: Fabrikneu (Brand New) und Gebrauchtware Grade A für flexible Projektbudgets",
                  "100 % Volllast-Belastungstest auf dedizierten Prüfständen vor jeder Auslieferung",
                  "Schneller weltweiter Expressversand zur Sicherung unterbrechungsfreier Netzwerke"
              ]
          },
          {
              "id": "engineering",
              "tag": "Technische Projektabwicklung",
              "title": "Dedizierte Fachingenieure · Keine ausgelagerten Callcenter",
              "description": "Wir sind weit mehr als ein gewöhnlicher Zwischenhändler. Jedes Produktportfolio wird direkt von erfahrenen Elektro- und HLK-Applikationsingenieuren betreut.",
              "highlights": [
                  "Direkte 1-zu-1-Fachberatung durch spezialisierte Vertriebsingenieure bei jeder Anfrage",
                  "Detaillierte Lastanalysen und Wärmeverlustberechnungen innerhalb von 24 Stunden",
                  "Optimierte Leistungsverzeichnisse (BOQ) inklusive vollständiger technischer Dokumentation und Whitepapern"
              ]
          }
      ],
      "projectsTitle": "Weltweit bewährte Projekterfolge",
      "projectsSubtitle": "Hardware und schlüsselfertige Systeme im weltweiten Einsatz an missionskritischen Standorten",
      "projects": [
          {
              "id": "p1",
              "sector": "Finanzinfrastruktur",
              "region": "Naher Osten",
              "title": "Modernisierung der Stromversorgung im Hauptrechenzentrum einer regionalen Geschäftsbank",
              "description": "Lieferung hochzuverlässiger modularer USV-Systeme und In-Row-Präzisionsklimatisierung zur Gewährleistung von 100 % Systemverfügbarkeit während der Migration des Kernbankensystems."
          },
          {
              "id": "p2",
              "sector": "Schwerindustrie & Fertigung",
              "region": "Asien-Pazifik",
              "title": "Integration industrieller Gleichrichter und kritischer Batterie-Notstromsysteme",
              "description": "Bereitstellung robuster DC-Stromverteilungseinheiten und Batterieschutzfelder zum zuverlässigen Schutz automatisierter Fertigungslinien vor Netzstörungen."
          },
          {
              "id": "p3",
              "sector": "Telekommunikation",
              "region": "Südostasien",
              "title": "Backbone-POP-Infrastruktur für einen multinationalen Telekommunikationsbetreiber",
              "description": "Ausstattung kritischer POP- und Landestationen mit standardisierten Hochfrequenz-DC-Schaltsystemen inklusive technischer Fernunterstützung bei der Inbetriebnahme."
          }
      ],
      "processTitle": "Standardisierter 5-Stufen-Beschaffungsprozess",
      "processSubtitle": "Transparente, auditierbare Projektabwicklung von der ersten Stücklistenprüfung (BOQ) bis zur technischen Abnahme nach der Lieferung",
      "steps": [
          {
              "step": "01",
              "title": "Anfrage einreichen",
              "summary": "Stückliste (BOQ) oder Zielmodelle übermitteln",
              "detail": "Übermitteln Sie Ihre Geräteliste, Systemparameter oder Projektspezifikationen bequem per Webformular, geschäftlicher E-Mail oder WhatsApp."
          },
          {
              "step": "02",
              "title": "Technisches Angebot",
              "summary": "Technisches & kaufmännisches Angebot binnen 24 Stunden",
              "detail": "Sie erhalten maßgeschneiderte Datenblätter, thermische/elektrische Lastberechnungen und ein formelles kaufmännisches Angebot (Proforma-Rechnung) innerhalb von 24 Stunden."
          },
          {
              "step": "03",
              "title": "Auftragsbestätigung",
              "summary": "Vertragsunterzeichnung & Kontingentsicherung",
              "detail": "Gegenzeichnung des Kaufvertrags und Bestätigung des Auftrags mit einer 30%igen Anzahlung per Banküberweisung (T/T) oder unwiderruflichem Akkreditiv (L/C)."
          },
          {
              "step": "04",
              "title": "Sicherer Versand",
              "summary": "Werksverpackung & vollständige Exportdokumentation",
              "detail": "Fabrikneue, versiegelte Einheiten in verstärkten Übersee-Holzkisten, geliefert mit Handelsrechnung (Commercial Invoice), Packliste, Ursprungszeugnis (CO) und Garantiezertifikaten."
          },
          {
              "step": "05",
              "title": "Lifecycle-Support",
              "summary": "Express-RMA & technischer Engineering-Support",
              "detail": "Zugang zu Originalersatzteilen, beschleunigter RMA-Abwicklung, technischen Whitepapern und Fernunterstützung bei der Inbetriebnahme durch leitende Ingenieure."
          }
      ],
      "companySectionTitle": "Unternehmensdaten & direkter Kontakt",
      "companySectionSubtitle": "Ingenieurgeführter Fachlieferant mit Sitz in Hangzhou – Ihr verlässlicher Partner für internationale Generalunternehmer und Einkäufer",
      "companyInfo": {
          "legalNameLabel": "Offizielle Firmenbezeichnung",
          "legalName": "Hangzhou Ricewind Technology Co., Ltd.",
          "brandLabel": "Handelsmarke",
          "brand": "RICEWIND",
          "locationLabel": "Hauptsitz",
          "location": "Hangzhou, Provinz Zhejiang, China",
          "websiteLabel": "Offizielle Website",
          "websiteUrl": "https://ricewind.com",
          "emailLabel": "Geschäftliche E-Mail",
          "email": "lee@ricewind.com",
          "phoneLabel": "WhatsApp / WeChat",
          "phone": "+86 17621197907",
          "hoursLabel": "Geschäftszeiten",
          "hours": "Mo–Fr 9:00–18:00 Uhr (GMT+8 / 24/7 Rufbereitschaft für kritische Ausschreibungen)"
      },
      "ctaTitle": "Bereit für die Beschaffung zertifizierter Ausrüstung für Ihr Projekt?",
      "ctaSubtitle": "Sprechen Sie direkt mit einem Applikationsingenieur. Erhalten Sie geprüfte Berechnungen und kaufmännische Konditionen innerhalb von 24 Stunden.",
      "ctaButtonText": "Jetzt Anfrage einreichen"
  },
  es: {
      "slogan": "Impulsando conexiones, asegurando infraestructura crítica.",
      "title": "Acerca de RICEWIND",
      "lead": "RICEWIND (Hangzhou Ricewind Technology Co., Ltd.) es un socio de canal especializado e integrador de soluciones técnicas para VERTIV, Huawei, Delta, ELTEK y ZTE. Con sede en Hangzhou, China, estamos especializados en el suministro de equipos originales y sellados de fábrica de energía crítica, climatización de precisión e infraestructura para telecomunicaciones y centros de datos, orientados a socios de compras B2B internacionales y contratistas de infraestructura.",
      "stats": [
          {
              "value": "56",
              "suffix": "+",
              "label": "Países y regiones con despliegues",
              "description": "Implementaciones en operadores de telecomunicaciones, sector bancario, energía y centros de datos"
          },
          {
              "value": "6",
              "suffix": "+",
              "label": "Ecosistema de marcas Tier-1",
              "description": "Canales autorizados para VERTIV, Huawei, Delta, ELTEK y ZTE"
          },
          {
              "value": "100",
              "suffix": "%",
              "label": "Sellado de fábrica y auténtico",
              "description": "Números de serie (S/N) individuales verificables y el firmware oficial más reciente"
          },
          {
              "value": "24",
              "suffix": "h",
              "label": "Respuesta técnica de ingeniería",
              "description": "Cálculos de carga eléctrica, análisis de disipación térmica y lista de materiales (BOQ) optimizada"
          }
      ],
      "scenariosTitle": "Escenarios de aplicación de misión crítica",
      "scenariosSubtitle": "Suministro e integración de hardware industrial de alta fiabilidad para entornos operativos exigentes",
      "scenarios": [
          {
              "id": "dc",
              "iconName": "server",
              "title": "Centros de datos Edge y medianos",
              "specs": "5–500 m² | Capacidad de 5–500 kW | Rigurosa optimización de PUE",
              "description": "Sistemas UPS modulares, unidades de distribución de energía (PDU) en rack y climatizadores de precisión por fila o sala diseñados para un funcionamiento ininterrumpido y tolerancias térmicas estrictas."
          },
          {
              "id": "telecom",
              "iconName": "tower",
              "title": "Centrales de telecomunicaciones y sitios BTS",
              "specs": "Sistemas de energía de -48 V CC | Nodos de transmisión | Sitios macro BTS",
              "description": "Rectificadores embebidos de alta eficiencia, controladores inteligentes del ciclo de vida de baterías y monitorización ambiental centralizada para nodos celulares y de fibra óptica críticos."
          },
          {
              "id": "industry",
              "iconName": "cpu",
              "title": "Control industrial y servicios de energía",
              "specs": "Manufactura inteligente | Transporte ferroviario | Empresas de servicios eléctricos",
              "description": "Sistemas de energía reforzados diseñados para soportar severas fluctuaciones de la red eléctrica, interferencias electromagnéticas y amplios rangos térmicos operativos."
          },
          {
              "id": "cleanroom",
              "iconName": "shield",
              "title": "Instalaciones médicas y laboratorios",
              "specs": "Temperatura y humedad constantes | Salas de imagenología | UPS de transferencia cero",
              "description": "Respaldo eléctrico de interrupción cero y climatización ambiental de precisión para equipos médicos de alto valor, salas limpias y laboratorios analíticos."
          }
      ],
      "commitmentsTitle": "Garantía de autenticidad e ingeniería directa",
      "commitmentsSubtitle": "Integridad industrial: stock dual Nuevo & Segunda mano Grade A con pruebas al 100% de carga completa",
      "commitments": [
          {
              "id": "authenticity",
              "tag": "Integridad en la cadena de suministro",
              "title": "Nuevo de fábrica & Segunda mano Grade A · Garantía de inventario dual",
              "description": "Nuestros canales de aprovisionamiento consolidados garantizan que cada módulo, UPS y sistema de climatización se entregue en su embalaje original sellado de fábrica con total conformidad para auditorías.",
              "highlights": [
                  "Suministro dual: Nuevo (Brand New) y Segunda mano Grade A para adaptarse a cada presupuesto y plazo",
                  "100% De pruebas de carga completa en bancos dedicados antes de cualquier despacho",
                  "Despacho internacional urgente para el mantenimiento continuo de sitios y redes críticas"
              ]
          },
          {
              "id": "engineering",
              "tag": "Entrega técnica",
              "title": "Ingenieros dedicados · Sin centros de atención externalizados",
              "description": "Somos mucho más que un intermediario comercial convencional. Cada cartera de productos está respaldada y supervisada por ingenieros de aplicaciones con amplia experiencia en sistemas eléctricos y HVAC.",
              "highlights": [
                  "Atención personalizada 1 a 1 con ingenieros de ventas técnicas para cada consulta",
                  "Análisis detallado de cargas y cálculos de disipación térmica entregados en 24 horas",
                  "Lista de materiales (BOQ) optimizada con documentación técnica completa e informes especializados"
              ]
          }
      ],
      "projectsTitle": "Historial global comprobado",
      "projectsSubtitle": "Hardware y sistemas llave en mano implementados en infraestructuras de misión crítica en todo el mundo",
      "projects": [
          {
              "id": "p1",
              "sector": "Infraestructura financiera",
              "region": "Oriente Medio",
              "title": "Modernización eléctrica del centro de datos principal de un banco comercial regional",
              "description": "Suministro de suites UPS modulares de alta fiabilidad y refrigeración de precisión in-row para garantizar una disponibilidad del 100% durante la migración de cargas bancarias críticas."
          },
          {
              "id": "p2",
              "sector": "Manufactura pesada",
              "region": "Asia-Pacífico",
              "title": "Integración de rectificadores industriales y baterías para operaciones críticas",
              "description": "Despliegue de unidades de distribución de energía CC para uso pesado y bancos de protección por batería para blindar líneas de montaje automatizadas frente a fluctuaciones de la red."
          },
          {
              "id": "p3",
              "sector": "Telecomunicaciones",
              "region": "Sudeste Asiático",
              "title": "Infraestructura POP troncal para operador multinacional de telecomunicaciones",
              "description": "Equipamiento de puntos de presencia (POP) y estaciones de amarre críticas con sistemas de conmutación CC de alta frecuencia estandarizados y soporte remoto para puesta en marcha."
          }
      ],
      "processTitle": "Flujo de trabajo de aprovisionamiento estandarizado en 5 pasos",
      "processSubtitle": "Gestión transparente y auditable desde el envío de la lista de materiales (BOQ) hasta la puesta en marcha técnica posentrega",
      "steps": [
          {
              "step": "01",
              "title": "Envío de solicitud",
              "summary": "Envíe su lista de materiales o modelos requeridos",
              "detail": "Remita su lista de equipos requeridos, parámetros del sistema o especificaciones del proyecto mediante nuestro formulario web, correo corporativo o WhatsApp."
          },
          {
              "step": "02",
              "title": "Propuesta técnica",
              "summary": "Propuesta técnica y comercial en 24 horas",
              "detail": "Reciba fichas técnicas personalizadas, cálculos térmicos/eléctricos y cotización formal (PI) en un plazo de 24 horas."
          },
          {
              "step": "03",
              "title": "Confirmación de pedido",
              "summary": "Firma del acuerdo y asignación de inventario",
              "detail": "Firme el contrato de compraventa y confirme el pedido con un anticipo del 30% mediante transferencia bancaria (T/T) o carta de crédito irrevocable (L/C)."
          },
          {
              "step": "04",
              "title": "Despacho seguro",
              "summary": "Embalaje de fábrica y documentación completa de exportación",
              "detail": "Unidades selladas de fábrica reforzadas en cajas de madera para exportación, acompañadas de factura comercial, lista de empaque, certificado de origen (CO) y certificados de garantía."
          },
          {
              "step": "05",
              "title": "Soporte de ciclo de vida",
              "summary": "Gestión ágil de RMA y soporte de ingeniería",
              "detail": "Acceso a suministro de repuestos originales, tramitación prioritaria de RMA, documentación técnica y asistencia remota para comisionamiento por parte de ingenieros sénior."
          }
      ],
      "companySectionTitle": "Credenciales corporativas y contacto directo",
      "companySectionSubtitle": "Proveedor de ingeniería con sede en Hangzhou comprometido con relaciones a largo plazo con contratistas y compradores globales",
      "companyInfo": {
          "legalNameLabel": "Razón social",
          "legalName": "Hangzhou Ricewind Technology Co., Ltd.",
          "brandLabel": "Nombre comercial",
          "brand": "RICEWIND",
          "locationLabel": "Sede central",
          "location": "Hangzhou, Provincia de Zhejiang, China",
          "websiteLabel": "Sitio web oficial",
          "websiteUrl": "https://ricewind.com",
          "emailLabel": "Correo corporativo",
          "email": "lee@ricewind.com",
          "phoneLabel": "WhatsApp / WeChat",
          "phone": "+86 17621197907",
          "hoursLabel": "Horario comercial",
          "hours": "Lun–Vie 9:00–18:00 (GMT+8 / Atención 24/7 disponible para licitaciones críticas)"
      },
      "ctaTitle": "¿Listo para adquirir equipos certificados para su proyecto?",
      "ctaSubtitle": "Hable directamente con un ingeniero de aplicaciones. Reciba cálculos verificados y condiciones comerciales en menos de 24 horas.",
      "ctaButtonText": "Enviar consulta"
  },
  ar: {
      "slogan": "تمكين الاتصال، وحماية البنية التحتية الحيوية.",
      "title": "نبذة عن RICEWIND",
      "lead": "تُعد RICEWIND (شركة هانغتشو رايس ويند للتكنولوجيا المحدودة - Hangzhou Ricewind Technology Co., Ltd.) شريك توريد متخصصاً ومكاملاً للحلول التقنية لكل من VERTIV وHuawei وDelta وELTEK وZTE. يقع مقرنا الرئيسي في مدينة هانغتشو بالصين، ونختص في توريد معدات أصلية ومختومة بختم المصنع لأنظمة الطاقة الحيوية، والتبريد الدقيق، والبنية التحتية لمراكز البيانات والاتصالات، موجهة لشركاء المشتريات المؤسسية (B2B) ومقاولي البنية التحتية الدوليين.",
      "stats": [
          {
              "value": "56",
              "suffix": "+",
              "label": "دولة ومنطقة تم التوريد إليها",
              "description": "مشاريع منجزة لشركات الاتصالات، والقطاع المصرفي، والطاقة، ومراكز البيانات"
          },
          {
              "value": "6",
              "suffix": "+",
              "label": "منظومة علامات تجارية من الفئة الأولى",
              "description": "قنوات توريد معتمدة لـ VERTIV وHuawei وDelta وELTEK وZTE"
          },
          {
              "value": "100",
              "suffix": "%",
              "label": "أصلية ومختومة بختم المصنع",
              "description": "أرقام تسلسلية فردية (S/N) قابلة للتحقق مع أحدث البرمجيات الثابتة الرسمية"
          },
          {
              "value": "24",
              "suffix": "h",
              "label": "استجابة هندسية مباشرة خلال 24 ساعة",
              "description": "حسابات الأحمال الكهربائية، وتحليل التبديد الحراري، وجداول كميات (BOQ) مُحسّنة"
          }
      ],
      "scenariosTitle": "سيناريوهات التطبيقات للمهام الحرجة",
      "scenariosSubtitle": "توريد وتكامل أجهزة صناعية عالية الموثوقية لبيئات التشغيل الصعبة وذات المتطلبات العالية",
      "scenarios": [
          {
              "id": "dc",
              "iconName": "server",
              "title": "مراكز البيانات المتوسطة والطرفية (Edge)",
              "specs": "5–500 م² | سعة 5–500 كيلوواط | تحسين صارم لكفاءة استهلاك الطاقة (PUE)",
              "description": "أنظمة UPS معيارية نمطية، ووحدات توزيع الطاقة داخل الكبائن (PDU)، ومكيفات تبريد دقيقة بين الصفوف وللغرف مصممة لضمان استمرارية التشغيل وأعلى درجات التحكم الحراري."
          },
          {
              "id": "telecom",
              "iconName": "tower",
              "title": "المراكز الرئيسية للاتصالات ومواقع المحطات (BTS)",
              "specs": "أنظمة طاقة تيار مستمر 48- فولت | مراكز نقل البيانات | محطات الماكرو (Macro BTS)",
              "description": "مقومات تيار (Rectifiers) مدمجة عالية الكفاءة، ووحدات تحكم ذكية في دورة حياة البطاريات، وأنظمة مراقبة بيئية مركزية لعقد الاتصالات الخلوية وشبكات الألياف الضوئية."
          },
          {
              "id": "industry",
              "iconName": "cpu",
              "title": "التحكم الصناعي ومرافق الطاقة",
              "specs": "التصنيع الذكي | النقل والسكك الحديدية | مرافق الكهرباء والطاقة",
              "description": "أنظمة طاقة متينة ومصممة هندسياً لتحمل التذبذبات الشديدة في الشبكة الكهربائية، والتشويش الكهرومغناطيسي، ونطاقات درجات حرارة التشغيل القاسية."
          },
          {
              "id": "cleanroom",
              "iconName": "shield",
              "title": "المرافق الطبية والمختبرات المتقدمة",
              "specs": "تحكم دقيق بدرجة الحرارة والرطوبة | غرف التصوير الطبي | أنظمة UPS بدون وقت تحويل (Zero-Transfer)",
              "description": "طاقة احتياطية دون أي انقطاع زمني وتكييف بيئي دقيق لأجهزة المسح والتصوير الطبي عالية القيمة، والغرف النظيفة، والمختبرات التحليلية."
          }
      ],
      "commitmentsTitle": "ضمان الأصالة والاستشارات الهندسية المباشرة",
      "commitmentsSubtitle": "موثوقية صناعية متكاملة: مخزون مزدوج جديد ومستعمل فئة A مع اختبار تشغيل بنسبة 100% تحت أقصى حمل",
      "commitments": [
          {
              "id": "authenticity",
              "tag": "نزاهة سلاسل الإمداد",
              "title": "جديد المصنع وأجهزة مستعملة فئة A · ضمان المخزون المزدوج",
              "description": "تضمن قنوات التوريد المعتمدة لدينا تسليم كل وحدة طاقة، ونظام UPS، وجهاز تكييف في عبوة المصنع الأصلية مع الامتثال الكامل لمتطلبات التدقيق والفحص.",
              "highlights": [
                  "توريد بمسارين: جديد بختم المصنع ومستعمل فئة A لتلبية متطلبات الميزانية وسرعة الإنجاز",
                  "اختبار تشغيل وإجهاد كامل بنسبة 100% على منصات مخصصة قبل الشحن والتسليم",
                  "شحن دولي فوري وسريع لضمان استمرارية تشغيل محطات وشبكات الاتصالات"
              ]
          },
          {
              "id": "engineering",
              "tag": "التنفيذ والدعم الهندسي",
              "title": "مهندسون متخصصون · دون مراكز اتصال خارجية",
              "description": "نحن نتجاوز دور الوسيط التجاري التقليدي؛ حيث يشرف على كل محفظة منتجات مهندسو تطبيقات متمرسون في الأنظمة الكهربائية وأنظمة التكييف والتهوية (HVAC).",
              "highlights": [
                  "استشارة فنية مباشرة (1 إلى 1) مع مهندس مبيعات تقني لكل استفسار",
                  "تحليل تفصيلي للأحمال وحسابات التبديد الحراري خلال 24 ساعة",
                  "جدول كميات (BOQ) مُحسّن مدعوم بكامل الوثائق الفنية والدفاتر التقنية"
              ]
          }
      ],
      "projectsTitle": "سجل إنجازات عالمي مثبت",
      "projectsSubtitle": "أجهزة وأنظمة متكاملة تم تشغيلها بنجاح في مواقع حيوية حول العالم",
      "projects": [
          {
              "id": "p1",
              "sector": "البنية التحتية المالية",
              "region": "الشرق الأوسط",
              "title": "تحديث نظام الطاقة لمركز البيانات الرئيسي لبنك تجاري إقليمي",
              "description": "توريد منظومات UPS نمطية عالية الاعتمادية ووحدات تبريد دقيق بين الصفوف لضمان استمرارية الخدمة بنسبة 100% أثناء ترحيل بيانات العمليات المصرفية الحيوية."
          },
          {
              "id": "p2",
              "sector": "الصناعات الثقيلة",
              "region": "آسيا والمحيط الهادئ",
              "title": "مكاملة مقومات التيار الصناعية وأنظمة طاقة البطاريات للمهام الحرجة",
              "description": "نشر وحدات توزيع طاقة تيار مستمر (DC) للخدمة الشاقة ومصفوفات حماية البطاريات لعزل خطوط التجميع الآلية وحمايتها من تذبذبات شبكة الطاقة."
          },
          {
              "id": "p3",
              "sector": "الاتصالات وتكنولوجيا المعلومات",
              "region": "جنوب شرق آسيا",
              "title": "تطوير البنية التحتية لنقاط التواجد (POP) للشبكة الأساسية لمشغل اتصالات دولي",
              "description": "تجهيز نقاط التواجد ومحطات الإنزال الحيوية بأنظمة تحويل طاقة تيار مستمر (DC) قياسية عالية التردد مع تقديم الدعم الكامل للتشغيل التجريبي عن بُعد."
          }
      ],
      "processTitle": "آلية توريد معيارية من 5 خطوات",
      "processSubtitle": "إجراءات شفافة وقابلة للتدقيق من تقديم جدول الكميات الأولي وحتى التدشين الفني",
      "steps": [
          {
              "step": "01",
              "title": "تقديم الطلب",
              "summary": "إرسال جدول الكميات (BOQ) أو الطرازات المطلوبة",
              "detail": "أرسل قائمة المعدات المستهدفة، أو مواصفات النظام، أو متطلبات المشروع عبر النموذج الإلكتروني، أو البريد التجاري، أو عبر WhatsApp."
          },
          {
              "step": "02",
              "title": "العرض الفني والتجاري",
              "summary": "مقترح هندسي وتجاري خلال 24 ساعة",
              "detail": "استلم وثائق المواصفات الفنية التفصيلية، وحسابات الطاقة والتبديد الحراري، وعرض الأسعار التجاري الرسمي (PI) في غضون 24 ساعة."
          },
          {
              "step": "03",
              "title": "تأكيد الطلب",
              "summary": "توقيع الاتفاقية وتثبيت الحصة",
              "detail": "توقيع عقد البيع وتأكيد الطلب بسداد دفعة مقدمة قدرها 30% عبر تحويل مصرفي (T/T) أو اعتماد مستندي غير قابل للإلغاء (L/C)."
          },
          {
              "step": "04",
              "title": "الشحن الآمن",
              "summary": "تغليف المصنع وتوفير كامل مستندات التصدير",
              "detail": "شحن المعدات المغلفة بختم المصنع في صناديق خشبية معززة مخصصة للتصدير، مصحوبة بالفاتورة التجارية، وقائمة التعبئة، وشهادة المنشأ (CO)، ووثائق الضمان."
          },
          {
              "step": "05",
              "title": "دعم دورة الحياة",
              "summary": "مسار سريع لخدمات الضمان (RMA) والدعم الهندسي",
              "detail": "الحصول على قطع الغيار الأصلية، والمعالجة السريعة لطلبات الضمان (RMA)، وتوفير الوثائق الفنية، ودعم التشغيل التجريبي عن بُعد بواسطة كبار المهندسين."
          }
      ],
      "companySectionTitle": "بيانات الشركة والتواصل المباشر",
      "companySectionSubtitle": "مورّد هندسي يتخذ من هانغتشو مقراً له، ملتزم ببناء شراكات طويلة الأمد مع المقاولين والمشترين الدوليين",
      "companyInfo": {
          "legalNameLabel": "الكيان القانوني",
          "legalName": "Hangzhou Ricewind Technology Co., Ltd.",
          "brandLabel": "العلامة التجارية التشغيلية",
          "brand": "RICEWIND",
          "locationLabel": "المقر الرئيسي",
          "location": "هانغتشو، مقاطعة تشجيانغ، الصين (Hangzhou, Zhejiang Province, China)",
          "websiteLabel": "الموقع الرسمي",
          "websiteUrl": "https://ricewind.com",
          "emailLabel": "البريد الإلكتروني التجاري",
          "email": "lee@ricewind.com",
          "phoneLabel": "WhatsApp / WeChat",
          "phone": "+86 17621197907",
          "hoursLabel": "ساعات العمل",
          "hours": "الإثنين–الجمعة 9:00–18:00 (GMT+8 / جاهزية تامة على مدار الساعة 24/7 للمناقصات والمشاريع العاجلة)"
      },
      "ctaTitle": "هل أنت مستعد لتوريد معدات معتمدة لمشروعك القادم؟",
      "ctaSubtitle": "تحدث مباشرة مع مهندس تطبيقات متخصص. احصل على الحسابات الفنية الدقيقة والشروط التجارية خلال 24 ساعة.",
      "ctaButtonText": "أرسل استفسارك الآن"
  },
};
