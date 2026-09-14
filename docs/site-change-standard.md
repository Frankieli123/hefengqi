# RICEWIND 独立站内容与界面修改标准

更新日期：2026-09-14
适用对象：参与本仓库工作的 AI 模型、自动化脚本与开发人员。
适用范围：公开官网、内容后台、三语内容、媒体、SEO 以及与内容发布直接相关的代码。

本文件回答两个问题：**一次需求应该修改哪里，以及哪些区域不能顺手修改。**

## 1. 强制执行顺序

任何修改开始前，必须按以下顺序执行：

1. 完整阅读仓库根目录 `AGENTS.md`。
2. 阅读本文件；视觉任务还必须阅读 `docs/design-system.md`。
3. 只检查与需求相关的路由、组件、内容来源、测试和当前工作区状态。
4. 先判断内容属于数据库后台、三语消息、静态内容、页面结构还是基础设施，再选择修改入口。
5. 保留用户现有改动；工作区非干净状态不是删除或重置文件的理由。
6. 修改后执行与风险相称的检查，并在交付说明中列出未验证项。

规则冲突时的优先级为：用户本轮明确要求 > 系统和仓库强制规则 > 当前数据库模型、API 契约与运行代码 > 本文件 > 其他项目文档。发现文档与代码不一致时，先报告差异，不能凭旧文档覆盖当前实现。

## 2. 先判断修改类型

### A. 业务内容修改

产品、分类、品牌、参数、Hero、新闻、方案等已经有后台管理入口时，**后台和数据库是唯一权威来源**。不得为了快速看到效果而把同一份内容重新写死在页面组件、演示数据或 CSS 中。

### B. 全站固定文案修改

导航名称、按钮、通用提示和固定页面文案优先修改 `src/content/messages/zh.json`、`en.json`、`ru.json`。三种语言键结构必须一致。

### C. 页面结构或视觉修改

修改对应路由组件、领域组件或 `src/app/globals.css`。先复用现有类、组件和设计令牌；不得用大量页面内联样式绕开设计系统。

### D. 功能、数据模型或发布方式修改

这不再是普通“内容修改”。只有用户明确要求功能变化时，才能修改 API、Server Action、Prisma、认证、缓存或部署配置，并必须扩大测试范围。

## 3. 内容归属与正确入口

| 要修改的内容 | 首选入口 / 权威来源 | 代码位置（仅在需要改变能力或版式时） | 禁止做法 |
| --- | --- | --- | --- |
| 产品资料、三语名称、型号、摘要、参数、FAQ、应用场景、主图及排序 | `/admin/products` | `src/components/products/`、`src/lib/content-repository.ts` | 在产品页面或 `demo-data.ts` 写死线上产品 |
| 一、二、三级产品分类及三语名称、顺序、状态 | `/admin/categories` | `src/components/products/category-tree.tsx`、`src/lib/category-tree.ts` | 在导航或产品页复制一套独立分类树 |
| 品牌、参数定义和参数单位 | `/admin/taxonomy` | `src/lib/product-ingest.ts`、Prisma 模型 | 猜测品牌授权、参数或单位 |
| 通用媒体及产品媒体 | `/admin/media`、产品编辑页 | `src/lib/uploads.ts`、`src/app/media/[...path]/route.ts` | 手改数据库 `storageKey`；把上传文件散放进源码目录 |
| 首页 Hero 图片、焦点、顺序及三语文案 | `/admin/settings#home-hero`，数据模型 `HomeHeroSlide*` | `src/components/home-hero-carousel.tsx`、`src/lib/home-hero*.ts` | 在首页组件重新写死轮播内容；绕过媒体门禁 |
| 首页固定标题、按钮、产品系列说明 | 三语 `messages/*.json` | `src/app/[locale]/page.tsx` | 只改中文；随意改变产品系列既定布局 |
| 首页产品系列对应分类与静态图片 | 分类后台 + `src/app/[locale]/page.tsx` 中映射；静态图在 `public/images/product-series/` | 首页组件与全局 CSS | 使用不存在的分类路径或外站热链图片 |
| 新闻、解决方案、案例的正文和 SEO 字段 | `/admin/editorial` | `src/components/editorial/`、`src/lib/content-repository.ts` | 为单篇文章在页面代码里加特例 |
| 新闻分类名称、列表固定提示 | 三语消息及 `src/content/news-feed.ts` | `news-category-feed.tsx`、`news-feed.module.css` | 根据标题在客户端临时猜分类 |
| 新闻相关产品 | 新闻后台手动选择最多 4 个；系统自动补足 | 新闻详情查询与 `news-related-products` 逻辑 | 在详情组件写死产品 ID |
| 解决方案场景固定资料和配图映射 | 优先后台；当前静态补充位于 `src/content/industry-*.ts` 与 `public/images/industries/` | `industries-landing.tsx`、详情组件 | 复制竞品图片、文案、Logo 或无法核实的成绩 |
| 技术支持与故障排查内容 | 当前内容源 `src/content/support.ts`，相关静态资源在 `public/support/` | `src/components/support/`、`src/app/[locale]/support/` | 生成虚假告警代码、步骤、备件或参数 |
| 在线客服开关、在线状态、WhatsApp、离线文案、Webhook | `/admin/settings#customer-service`；消息收件箱 `/admin/customer-service` | `src/lib/customer-service.ts`、`src/components/online-customer-service.tsx` | 把密钥写进客户端；把 `mailto:` 伪装成站内在线回复 |
| 导航、页脚、语言、通用按钮 | 三语 `messages/*.json` | `site-header.tsx`、`site-footer.tsx`、相关交互组件 | 只在某个页面复制一份导航；破坏三语路径 |
| 公司介绍 | `src/content/about.ts` 与三语消息 | `src/app/[locale]/about/page.tsx` | 编造公司规模、认证、客户和覆盖数据 |
| 联系方式、隐私和条款 | 已核实资料；对应三语页面和站点设置 | `contact/page.tsx`、`privacy/page.tsx`、`terms/page.tsx` | 擅自替换法律主体、邮箱或电话 |
| Metadata、canonical、hreflang、JSON-LD、sitemap、llms.txt | 后台 SEO 字段 + `src/lib/seo.ts` | 各路由 metadata、`src/app/sitemap.ts` 与相关 route | 固定假 Schema；添加正文没有的事实 |
| AI 产品录入接口与字段字典 | `/api/admin/products/schema`、`docs/ai-product-api.md` | `src/app/api/admin/products/`、`src/lib/product-ingest.ts` | 只改文档不改契约，或只改接口不更新文档和测试 |

如果一个页面显示的是数据库内容，模型应先检查查询条件、发布状态、语言发布状态和关联数据，不能用静态假内容遮盖数据问题。

## 4. 文件区域分级

### 4.1 可按内容需求修改的绿色区域

- `src/content/messages/*.json`：全站三语固定文案。
- `src/content/*.ts`：明确仍由代码维护的静态内容。
- `src/app/[locale]/**/page.tsx`：页面组合与服务端数据读取。
- `src/components/editorial/`、`products/`、`support/`：对应领域的展示结构。
- `public/images/`、`public/support/`：经过确认的仓库静态素材。
- 与本次修改直接相关的测试和说明文档。

绿色不代表可以任意重构。仍须保持既有 API、三语、响应式和设计系统。

### 4.2 只有明确功能需求才能修改的黄色区域

- `src/app/globals.css`、`src/components/ui/`：全站影响面大；优先局部类，基础组件变更必须检查所有调用方。
- `src/lib/content-repository.ts`：公开内容查询和可见性门禁。
- `src/app/admin/actions.ts`、`src/app/api/`：权限、校验、审计和外部契约。
- `prisma/schema.prisma` 与新 migration：需要数据模型设计、迁移和回滚评估。
- `src/i18n/`、`src/proxy.ts`：三语路由核心。
- `src/lib/seo.ts`、sitemap、robots、llms 路由：搜索引擎全站行为。
- `next.config.ts`、Caddy、systemd、发布脚本：生产运行边界。
- `package.json`、锁文件：只有明确需要新增或升级依赖时才能改。

不得把黄色区域的顺手重构混进纯文案或单页排版任务。

### 4.3 禁止直接修改的红色区域

- `.env*` 中的真实值、密码、API Key、Cookie Secret、Webhook Secret。
- `.next/`、`next-build/`、`current`、`.releases/`：生成物和运行中的发布版本。
- `node_modules/`、覆盖率、Playwright 报告等工具生成物。
- `/data/media`、`/data/private`、`public/uploads/media` 中已有文件；媒体必须走规定上传或可审计导入流程。
- 已执行的 `prisma/migrations/*/migration.sql`；需要变化时新增 migration，不能改写历史。
- 数据库中的产品、分类、媒体和文章记录，除非任务明确要求数据操作且已有备份或可回滚方案。
- 用户未授权范围内的现有未提交文件和修改。

绝不能使用重置、覆盖或批量删除的方式“清理工作区”。

## 5. 内容真实性标准

1. 型号、规格、告警代码、兼容关系、认证、库存、授权、项目数量和国家覆盖均属于事实，必须有可靠来源。
2. 缺少资料时使用中性表达或留空，不根据相似产品补值。
3. 品牌名、型号、数字和单位在中、英、俄版本中保持一致；翻译的是说明，不是事实标识。
4. AI 可整理、压缩和翻译已有材料，但不得创造产品性能、客户案例或故障结论。
5. 来源说明和内部审核信息不能默认展示给访客；是否公开由现有字段和页面规则决定。
6. 学习竞品只能用于信息层级和交互节奏，不能复制其文案、图片、Logo、代码或专属视觉资产。

## 6. 三语规则

- 公开页面固定支持 `zh`、`en`、`ru`，路径始终带语言前缀。
- 新增消息键时必须在三个 JSON 文件同时新增，层级和键名完全一致。
- 不用中文占位英文或俄文；长英文、长俄文必须实际检查换行和按钮宽度。
- 品牌、型号、单位和 URL 不做无意义翻译。
- 数据库内容必须确认对应翻译记录已发布；不能因为中文存在就让其他语言静默回退到中文。
- 每种语言页面只能有一个 H1，并保持 canonical、hreflang 与实际路径一致。

## 7. UI/UX 不可破坏项

完整视觉规范见 `docs/design-system.md`。所有模型至少遵守以下底线：

- 使用现有白、石墨黑、冷灰和 `#C7000B` 体系，不引入新的主色或彩色渐变。
- 普通卡片无重阴影；标准圆角为 `8px`，大内容卡片通常为 `12px`。
- 不通过缩小整体字号解决排版问题；保持现有标题层级、容器宽度和留白节奏。
- 不随意改变产品详情主区域、Hero、Header 或全站容器尺寸。用户说“只优化排版”时，只处理对齐、间距、换行和局部层级。
- Hover 只增强反馈，不能隐藏关键信息；触屏操作不依赖 Hover。
- “查看详情”等行动箭头 Hover 右移 `4px`；产品标题本身不随意添加箭头。
- 不能用 `outline: none` 移除键盘焦点而不提供等效的 `:focus-visible`。
- 最小触控目标 `44px × 44px`；移动端不得出现横向溢出。
- 遵守 `prefers-reduced-motion`，不使用滚动劫持、无意义视差或全页飞入。
- 复用现有 Header、Footer、面包屑、页面标题、产品卡片和相关产品组件，不建立相似但不一致的第二套组件。

## 8. 媒体与图片规则

- CMS 内容图片优先进入媒体库；仓库静态图片只用于固定页面装饰和明确的代码管理素材。
- 不热链第三方网站图片，不复制竞品素材，不使用带竞品水印或商标的图片。
- 产品图默认按现有 `1:1` 画布规则；新闻与场景图按对应组件的既定比例，不用 CSS 强行拉伸。
- 图片必须有正确尺寸、用途明确的三语 `alt`；装饰图片使用空 `alt`。
- 更换媒体时使用新哈希文件，不覆盖旧哈希文件，以免 CDN 长缓存显示旧内容。
- 不绕过路径归一化、文件类型检查和已有媒体门禁。若用户明确要求改变门禁，应作为安全/发布功能单独处理。

## 9. SEO 与路由规则

- 不修改既有公开 URL，除非需求明确包含改名或迁移；改动 slug 时同步建立重定向。
- 不删除 canonical、hreflang、Open Graph、Breadcrumb 和 sitemap 入口。
- JSON-LD 必须与用户可见正文一致。普通新闻使用 `Article`/`TechArticle`，不得给所有文章拼接固定 `HowTo` 步骤。
- 搜索引擎所需正文必须在服务端 HTML 中存在，不能只在客户端加载。
- 不把草稿、后台、API、搜索参数页加入 sitemap。
- 站内链接使用当前本地化导航方式；原生完整路径用于明确需要在水合前可操作的入口。

## 10. 后台、API 与数据库规则

- 后台保存必须保留权限检查、Zod 校验、事务、审计日志和路径重新验证。
- 公开客户端只能接收专用 DTO，不能直接序列化 Prisma 数据库对象。
- API 字段变化必须同步更新验证 Schema、类型、接口文档、字段字典和测试。
- 不在客户端包或公开响应中返回内部来源、密钥、访客令牌摘要或审核信息。
- Prisma 模型变化必须生成新的有序 migration，并先确认备份、升级顺序和旧版本兼容性。
- 不用临时脚本直接改生产数据来掩盖代码或后台流程缺陷。

## 11. 性能与发布保护

- `src/app/[locale]/page.tsx` 等页面保持 Server Component；只有真实交互使用小型 Client Component。
- 不因简单 Hover、颜色或箭头动效引入新客户端依赖，优先使用 CSS。
- 不把后台专用 Provider 或大型 UI 库放进公开根布局。
- 首屏主图明确尺寸和优先级；非首屏图片延迟加载，不与 LCP 争抢带宽。
- 不在运行中的 `.next` 上执行生产构建。
- 当前 NAS 只能使用 `scripts/deploy-standalone.sh` 发布；该脚本隔离构建、原子切换、健康检查和回滚。
- HTML、RSC、后台和 API 必须 `no-store`；只有 `/_next/static/*` 与哈希媒体可长期缓存。
- EdgeOne 缓存规则属于外部生产配置，代码无法替代控制台规则。任何发布后都要确认 HTML 没有被强制缓存。

## 12. 修改前检查清单

- [ ] 我已定位页面真实内容来源，而不是只找到显示文本的位置。
- [ ] 若后台可编辑，我将修改后台数据/能力，没有在前端写死副本。
- [ ] 我已查看 `git status`，不会覆盖用户已有改动。
- [ ] 我明确了这次是否只是文案、排版，还是功能/API/模型变化。
- [ ] 我没有编造产品、品牌、项目或技术事实。
- [ ] 我已确定需要同步的中文、英文和俄文内容。
- [ ] 视觉任务已阅读 `docs/design-system.md`。
- [ ] Next.js 相关变更已阅读 `node_modules/next/dist/docs/` 对应版本文档。

## 13. 最低验收矩阵

| 修改类型 | 最低检查 |
| --- | --- |
| 单纯三语文案 | JSON 可解析、三语键一致、TypeScript、三个语言页面抽查 |
| 单页 UI/排版 | 相关 ESLint、TypeScript、375px / 768px / 1440px、键盘焦点、无横向溢出 |
| 公共组件或全局 CSS | 上述检查 + 所有主要页面冒烟 + reduced-motion |
| 产品、分类、新闻等查询 | 单元测试 + 草稿/发布/语言/空状态 + 后台到前台流程 |
| API 或 Server Action | 权限、输入校验、事务、审计、错误响应和契约测试 |
| Prisma 变化 | 新 migration、迁移状态、备份/回滚说明、生产构建 |
| Header、根布局或客户端依赖 | 弱网移动端首屏点击、无水合错误、客户端体积检查 |
| 发布与缓存 | `pnpm typecheck`、`pnpm lint`、`pnpm test`、生产构建、健康检查、三语 200、HTML/静态资源缓存头 |

若某项因环境或外部账号无法完成，必须明确写出“未验证”和原因，不得描述为已完成。

## 14. 交付说明格式

每次修改完成后，向用户说明：

1. **结果**：用户现在能看到或使用什么。
2. **内容来源**：改的是后台、三语消息、静态内容还是页面结构。
3. **影响范围**：哪些页面、语言、接口受到影响。
4. **验证**：实际执行了哪些检查，不能只写“应该没问题”。
5. **待办或外部动作**：例如 EdgeOne 清缓存、补充真实资料或后台重新发布。

不要把执行过程写成冗长流水账，也不要隐藏未完成的风险。

## 15. 常见错误示例

- 错误：产品前台不显示，就在页面数组里补一个产品。
  正确：检查产品、品牌、分类和三语翻译的发布条件及媒体关联。

- 错误：只修改中文按钮，英文和俄文沿用旧键。
  正确：三语同键同步修改，并实际检查长文本。

- 错误：用户要求调整对齐，同时重做主图尺寸、容器和卡片风格。
  正确：保留用户明确不允许改动的尺寸，只修复对齐和间距。

- 错误：为了暂时解决旧页面问题，关闭所有缓存或覆盖旧哈希图片。
  正确：HTML/RSC 不缓存，内容寻址静态资源长期缓存，并原子发布。

- 错误：新闻教程统一生成一套固定故障步骤和 `HowTo` Schema。
  正确：正文和 Schema 均依据该文章真实内容，普通技术内容使用 `TechArticle`。

- 错误：把竞争对手页面“参考”理解为复制素材和文案。
  正确：只学习层级、比例和交互原则，输出 RICEWIND 自有设计与内容。
