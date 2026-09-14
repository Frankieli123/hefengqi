# AI 产品与说明文档上传 API 接入指南

本 API 专为外部大语言模型（AI 智能体）、数据采集与自动化工作流设计，用于自动向合丰旗平台上传产品基本信息、七语说明文档（定义/这是什么/解决问题/核心优势/应用领域/FAQ）、技术规格参数及产品手册/图纸。

---

## 1. 认证机制 (Authentication)

调用所有产品与媒体接口时，需在 HTTP 请求头中提供 API 密钥或携带已登录的管理会话 Cookie。

### 请求头示例：
```http
Authorization: Bearer <AI_API_KEY>
```
或：
```http
x-api-key: <AI_API_KEY>
```

> **密钥配置**：
> - 环境变量：在 `.env` 中配置至少 32 个字符的 `AI_API_KEY=your-secret-key`。服务器环境变量优先级最高。
> - 网页后台：管理员可在 **系统设置 (`/admin/settings`)** -> **AI API 接入与密钥管理** 中设置或更换密钥。系统只保存摘要，原始密钥不会再次回显。
> - 本地开发模式：未配置密钥时，开发环境默认支持使用 `hfq-ai-dev-token-2026` 进行测试。

---

## 2. 核心接口概览 (API Endpoints)

| 动作 | 方法 | 端点 | 说明 |
| :--- | :--- | :--- | :--- |
| **查询接口规范** | `GET` | `/api/admin/products/schema` | 获取当前品牌、分类树、可用参数模板及 JSON 模板 |
| **批量/单件上传** | `POST` | `/api/admin/products` | 上传产品、七语说明、规格参数及关联素材 |
| **产品列表检索** | `GET` | `/api/admin/products` | 分页与关键字筛选已有产品 |
| **产品详情查询** | `GET` | `/api/admin/products/:id` | 获取产品完整内容及发布门禁校验状态 |
| **部分更新** | `PATCH` | `/api/admin/products/:id` | 增量更新说明、规格参数、FAQ 或发布状态 |
| **归档产品** | `DELETE` | `/api/admin/products/:id` | 归档指定产品 |
| **素材/手册上传** | `POST` | `/api/admin/media` | 支持图片及 PDF 产品说明书/手册上传并关联产品 |

---

## 3. 接口详细调用示例

### 3.1 获取分类与参数规范：`GET /api/admin/products/schema`

AI 上传前必须先调用此接口，获取当前数据库中的分类树、品牌列表以及预定义的规格参数键。后台分类可以调整，因此客户端不应把分类 ID、父级关系或显示名称写死在程序中。

```bash
curl -X GET "http://localhost:3000/api/admin/products/schema" \
  -H "Authorization: Bearer <AI_API_KEY>"
```

分类对象中的重要字段：

| 字段 | 含义 |
| :--- | :--- |
| `id` | 数据库分类 ID，用于根据 `parentId` 还原目录树 |
| `key` | 稳定的内部分类键；上传产品时填写到 `category` |
| `level` | 分类级别，值为 `1`、`2` 或 `3` |
| `parentId` | 上级分类 ID；一级分类为 `null` |
| `name.zh/en/ru/fr/de/es/ar` | 后台维护的七语显示名称 |

当前默认的一、二级目录如下；第三级为对应品牌，以 Schema 接口实时返回的数据为准：

| 一级分类 | 一级 `key` | 二级分类及 `key` |
| :--- | :--- | :--- |
| 电源管理 | `power` | 直流电源系统 `dc-power-systems`、UPS 电源 `battery`、室内电源系统 `indoor-power-systems`、室外电源系统 `outdoor-power-systems`、站点能源系统 `site-energy-systems`、太阳能供电系统 `solar-power-systems`、通信蓄电池 `telecom-batteries` |
| 热管理 | `thermal-management` | 精密空调 `precision-air-conditioning`、机柜空调 `cabinet-air-conditioning` |
| 光通信与光网络 | `optical-communications` | SFP 光模块 `sfp-modules` |
| 数据中心基础设施 | `integrated-solutions` | 一体化机柜 `integrated-cabinet`、PDU（电源分配单元）`distribution`、KVM 系统 `kvm-systems` |

> **UPS 分类说明**：UPS 不再是独立一级分类。它位于“电源管理”下，稳定内部键仍为 `battery`。例如山特三级分类键为 `battery-santak`。不要再提交已归档的 `ups-systems`。

上传时优先使用与品牌匹配的第三级 `key`，例如中兴直流电源使用 `zte`；如果后台尚未建立匹配的第三级节点，才使用对应的二级分类键，并由管理员复核分类归属。

---

### 3.2 上传产品及七语说明：`POST /api/admin/products`

支持单件对象、数组批量或 `{ items: [...] }` 格式。

```bash
curl -X POST "http://localhost:3000/api/admin/products" \
  -H "Authorization: Bearer <AI_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "ZXDU68 S501",
    "sku": "ZXDU68-S501-48V",
    "brand": "zte",
    "brandNames": {
      "zh": "中兴通讯",
      "en": "ZTE",
      "ru": "ZTE",
      "fr": "ZTE",
      "de": "ZTE",
      "es": "ZTE",
      "ar": "زد تي إي"
    },
    "category": "zte",
    "status": "DRAFT",
    "origin": "AI",
    "upsert": true,
    "translations": {
      "zh": {
        "name": "中兴 ZXDU68 S501 嵌入式通信直流电源系统",
        "directDefinition": "ZXDU68 S501 是一款高效嵌入式通信直流电源系统，为通信宏基站与核心机房提供可靠的-48V直流稳定供电与智能备电管理。",
        "shortDescription": "高效嵌入式直流电源系统，支持 50A 整流模块并联，具备蓄电池智能管理与远程监控功能。",
        "whatItIs": "ZXDU68 S501 是标准 19 英寸机架安装电源系统，内置高效率整流模块与智能监控单元，适用于各型通信站点。",
        "problemSolved": "解决基站供电效率低、机架空间紧张与电池备电状态难监控的问题。",
        "suitableFor": "适用于 4G/5G 宏基站、机房接入层设备及工业通信不间断直流供电场景。",
        "advantages": [
          "整流模块效率高达 96% 以上，降低能耗",
          "标准 19 英寸 3U/5U 紧凑架构，节省机房空间",
          "全数字化控制与智能电池温度补偿管理"
        ],
        "applications": [
          "4G/5G 宏基站与室内分布系统",
          "边缘计算汇聚节点机房",
          "电力与轨道交通专用通信网络"
        ],
        "seoTitle": "中兴 ZXDU68 S501 直流电源系统 - 规格参数与技术方案",
        "seoDescription": "合丰旗提供中兴 ZXDU68 S501 嵌入式通信直流电源系统参数、说明与技术方案咨询。",
        "sourceNote": "AI 整理自中兴通讯官方技术白皮书",
        "faqs": [
          {
            "question": "该系统最大输出电流是多少？",
            "answer": "标准配置支持多路 50A 模块并联，系统输出电流最高可达 300A。"
          }
        ]
      },
      "en": {
        "name": "ZTE ZXDU68 S501 Embedded DC Power System",
        "directDefinition": "The ZTE ZXDU68 S501 is a high-efficiency embedded DC power system designed for telecommunication base stations, delivering reliable -48V power with intelligent battery management.",
        "shortDescription": "High-efficiency embedded DC power system supporting 50A rectifier modules with battery management and remote monitoring.",
        "whatItIs": "Standard 19-inch rack-mounted DC power system equipped with high-efficiency rectifiers and centralized monitoring.",
        "problemSolved": "Resolves power efficiency, rack footprint, and complex battery lifecycle management issues in telecom environments.",
        "suitableFor": "Ideal for mobile communication macro stations, enterprise networks, and industrial DC power applications.",
        "advantages": [
          "Peak rectifier efficiency exceeds 96%",
          "Compact standard 19-inch footprint",
          "Intelligent battery temperature compensation and monitoring"
        ],
        "applications": [
          "4G/5G telecom macro base stations",
          "Edge computing and aggregation facilities"
        ]
      }
    },
    "attributes": [
      { "key": "nominal-voltage", "label": "额定电压", "value": "-48V", "unit": "VDC", "featured": true, "featureOrder": 0, "displayLabel": { "zh": "额定输出电压", "en": "Rated output voltage", "ru": "Номинальное выходное напряжение" } },
      { "key": "output-current", "label": "输出电流", "value": "300", "unit": "A", "featured": true, "featureOrder": 1, "displayLabel": { "zh": "最大输出电流", "en": "Maximum output current", "ru": "Максимальный выходной ток" } },
      { "key": "efficiency", "label": "整流效率", "value": "96.5", "unit": "%" }
    ]
  }'
```

#### 特性与容错机制：
1. **自动补齐多语言**：字段支持 `zh`、`en`、`ru`、`fr`、`de`、`es`、`ar`。如果 AI 仅提供了中文（或顶层扁平字段），系统会为缺少语言生成待复核内容；正式发布前仍应由编辑确认七语准确性。
2. **定义字数校验保证**：合丰旗发布门禁要求核心中英俄直接定义不少于 40 字符；法、德、西、阿内容同样可通过后台和 API 独立完善。
3. **动态参数建表**：如果提交了分类中尚未配置的全新规格参数（如“浪涌防护等级”），接口会自动在该分类下安全新建参数定义并入库。
4. **幂等更新**：指定 `upsert: true`（默认开启）时，重复提交相同型号会智能执行增量更新，便于 AI 反复补充打磨说明或追加 FAQ。

#### 关键参数展示字段

产品详情页的黑色关键参数区最多显示 6 项。参数数组中的 `featured: true` 表示展示该项，`featureOrder` 控制顺序（`0`–`5`），`displayLabel` 用于单独修改该产品上的展示标题，不会改动同分类其他产品的参数名称。`displayLabel` 可填写单个字符串，也可填写由 `zh/en/ru/fr/de/es/ar` 组成的部分语言映射。未提交任何 `featured` 配置的旧产品默认展示排序最前的 6 项，后台保存一次“关键参数展示”后即以人工选择为准。

---

### 3.3 上传说明书/手册文档或图片：`POST /api/admin/media`

使用 `multipart/form-data` 上传，可直接关联到产品：

关联产品的图片会校验扩展名、Magic Bytes 和图像可解码性，但不执行 ClamAV 扫描，也不需要授权确认；选择关联图片作为主图后即可参与产品发布。PDF 等产品文档仍执行安全扫描。未携带 `productId` 的通用媒体库上传维持原有扫描与授权流程。

```bash
curl -X POST "http://localhost:3000/api/admin/media" \
  -H "Authorization: Bearer <AI_API_KEY>" \
  -F "file=@/path/to/ZXDU68_User_Manual.pdf" \
  -F "productId=prod_cuid..."
```

---

### 3.4 增量更新说明与参数：`PATCH /api/admin/products/:id`

```bash
curl -X PATCH "http://localhost:3000/api/admin/products/prod_cuid..." \
  -H "Authorization: Bearer <AI_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "translations": {
      "zh": {
        "whatItIs": "更新补充的产品详细说明：支持扩展远程通信网管接口，支持 SNMPv3 协议。",
        "advantages": ["优势1", "优势2", "新增优势3"]
      }
    },
    "status": "READY"
  }'
```
