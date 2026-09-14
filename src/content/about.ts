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
      "杭州禾风起技术有限公司（品牌：RICEWIND / 禾风起）是 VERTIV（维谛）、Huawei（华为）、Delta（台达）、ELTEK（安腾）与 ZTE（中兴）的专业供应链与技术服务商。我们深耕工业级关键能源与通信领域，专注为全球 B2B 客户提供原厂原封、性能可靠的数据中心供配电、高频直流开关电源、精密制冷空调及一体化基础设施设备。",
    stats: [
      {
        value: "89",
        suffix: "+",
        label: "覆盖国家与地区",
        description: "交付覆盖金融、能源、电信运营商与大型数据中心",
      },
      {
        value: "5",
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
    commitmentsSubtitle: "坚守工业级交付底线，拒绝翻新假冒，杜绝外包转包",
    commitments: [
      {
        id: "authenticity",
        tag: "供应链基准",
        title: "100% 原厂原封 · 全链路追溯",
        description:
          "依托稳固的品牌原厂直供渠道，我们确保交付的每台设备与整流模块均为原厂密封包装，杜绝任何假冒、翻新或散件拼装风险。",
        highlights: [
          "独立出厂序列号（S/N），支持原厂溯源核验",
          "预装官方最新版本稳定固件，保障安全合规",
          "随货提供正规原厂合格证明与完整质保承诺",
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
    projectsSubtitle: "产品与方案已成功部署至全球 89+ 国家和地区的关键基础设施",
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
      legalName: "杭州禾风起技术有限公司",
      brandLabel: "运营品牌",
      brand: "RICEWIND / 禾风起",
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
        value: "89",
        suffix: "+",
        label: "Countries & Regions Deployed",
        description: "Deployed across telecom carriers, banking, energy, and data centers",
      },
      {
        value: "5",
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
    commitmentsSubtitle: "Upholding industrial-grade integrity: strictly authentic hardware and direct technical communication",
    commitments: [
      {
        id: "authenticity",
        tag: "Supply Chain Integrity",
        title: "100% Factory-Sealed · Full Traceability",
        description:
          "Our established procurement channels ensure that every module, UPS, and air conditioner is delivered in factory-sealed packaging with full audit compliance.",
        highlights: [
          "Individual traceable serial numbers (S/N) for official origin verification",
          "Pre-flashed with the latest official vendor firmware for security and stability",
          "Accompanied by authentic warranty paperwork and quality certificates",
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
      brand: "RICEWIND / 禾风起",
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
        value: "89",
        suffix: "+",
        label: "Стран присутствия",
        description: "Поставки для телекоммуникаций, банковского сектора, энергетики и ЦОД",
      },
      {
        value: "5",
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
    commitmentsSubtitle: "Строгий контроль оригинальности оборудования, отсутствие посредников и внешних колл-центров",
    commitments: [
      {
        id: "authenticity",
        tag: "Надежность поставок",
        title: "100% Заводская упаковка · Отслеживаемость",
        description:
          "Прямое взаимодействие с дистрибьюторскими каналами гарантирует поставку оборудования в заводской опломбированной упаковке.",
        highlights: [
          "Проверяемые заводские серийные номера (S/N) по базам производителей",
          "Актуальные официальные прошивки для стабильной и безопасной работы",
          "Официальная гарантия и полный комплект экспортной документации",
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
    projectsSubtitle: "Успешно реализованные проекты в более чем 89 странах мира",
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
      brand: "RICEWIND / 禾风起",
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
  fr: { ...coreAboutData.en, title: "À propos de RICEWIND" },
  de: { ...coreAboutData.en, title: "Über RICEWIND" },
  es: { ...coreAboutData.en, title: "Acerca de RICEWIND" },
  ar: { ...coreAboutData.en, title: "حول RICEWIND" },
};
