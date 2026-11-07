# WP01 自审记录

日期：2026-11-07。结论：实现可审阅；Hermes 报告沙箱外构建及全量测试通过，外部七语 HTTP 冒烟通过，但真实 CMS/完整 lab trace 验收仍有缺口，不建议据此直接发布。

## 关键正确性

- canonical：分页显式保留 page；page=1 合并到列表根地址。非法参数不静默 parseInt，越界不会把最后一页重复挂到任意 URL。
- 多语言：静态路由七语保留；动态翻译来自真实发布记录。分页第 2 页起故意只输出当前语言，避免对翻译产品数量作无来源假设。
- 可见性：新增分类祖先门禁解决 sitemap/hreflang 与详情页 404 不一致；查询复用缓存的最小分类结构，不读取产品全详情或全表做分页。
- Schema：移除整个 RFQ Offer，未填 0、库存、运费、退货或成色；Organization alias 修正但真实 Logo URL 保留。新闻作者与可见署名共享函数，既有 CMS 作者内容没有被覆盖。案例不再暴露未展示的修改时间。
- 面包屑：分类祖先、产品详情、新闻、案例和方案层级与页面一致。未更改既有 slug。
- JSON-LD：所有输出仍走单一 JsonLd；恶意闭合 script 字符串只能成为 JSON 数据。没有新增任意 HTML 输出。
- robots：各具体 bot 不再绕过通用限制；训练与检索只是用途分组，没有新增拒绝政策。
- sitemap：缺失时间省略、重复 URL 合并，compare 保留路径排除；没有生成 now lastmod。

## 业务与性能风险

- 新分类图查询在请求内通过 React cache 复用，但仍有分类元数据读取成本；未以真实数据库评估查询计划。产品分页、SQL 搜索、媒体投影和预取代码未重构。
- 越界页现在为 404，这是有意修复的用户可见行为；总数为零时第 1 页仍保留合法空状态。
- 第 2 页起 hreflang 较保守，未做七语分页数量查询；牺牲跨语分页发现覆盖，换取不生成不存在地址。
- URL 检查脚本只做明确本机请求及静态链接检查，不能证明所有目标在线可达。不得将其通过等同线上爬取通过。
- lab 脚本为无 API 的单次移动导航测量，不能衡量询盘交互，也不能声称真实用户 INP。
- 历史 slug 仍是 307；测试确认既有目标保护，没有把 307 描述为 301。

## 验证证据与阻断

- 最终 typecheck 与 24 文件 focused lint 通过；9 文件聚焦回归共 75 项通过。
- 最终全量测试：220 通过、1 失败；原始 origin/main 基线：178 通过、同一项失败。失败测试及实现未被修改，Node 子进程 EPERM 已独立诊断。
- 默认 build：外部 node_modules 链接触发 Turbopack 文件系统边界错误。Webpack fallback：TypeScript showConfig 子进程输出为空，仍失败。
- 后续 Hermes 提供外部证据：独立既有依赖副本下标准构建（含 postbuild）成功、45 文件 221 测试通过。本代理只读确认隔离 BUILD_ID/standalone 文件存在，但无法访问其 NAS 完整日志；不得混同为本代理自行执行成功。外部构建自动改动 next-env.d.ts/tsconfig.json 的 types 路径，已保留。
- 本代理利用现有产物尝试启动本机隔离服务，listen EPERM；没有本代理自行取得的 HTTP 验收结果。后续 Hermes 提供七语首页、产品列表、sitemap、404 与 307 跳转检查通过的摘要。
- Chromium 在本代理沙箱启动失败，未取得 lab trace。Hermes 后续提供单次 demo LCP 404 ms、CLS 0.0006916918240542204、H1=1、无 overflow；摘要缺少完整测试条件/trace，只作外部观察记录。field CWV/INP 仍不可用，没有编造性能分数。
- 构建后类型检查曾误扫 standalone 内测试副本；仅排除 next-wp01-check/standalone 后再次 typecheck、focused lint 通过。生成路由 types 和全部源文件仍受检查；没有删除构建目录。构建后全量测试在本沙箱仍 220 通过、同一项 EPERM 失败。
- 未访问真实秘密或数据库；未修改依赖、生产配置、部署脚本、原工作树，未提交或推送。

## 发布前必须补齐

归档并审阅外部成功构建/测试日志，在允许构建机的正常工具权限环境执行本机浏览器与 HTTP 检查，补齐动态详情完整 Next HTML/head、响应头、真实 CMS 发布数据与可复查的实验室 trace；已有七语首页/404/跳转外部摘要需随日志归档。本报告不授权部署，不扩展到下一 WP。

## Hermes最终复验

正常权限下221/221测试、typecheck、24文件lint、标准构建/postbuild通过；正式移动demo测量脚本成功，完整trace已归档NAS。具体条件和指标见实施报告最终补充。该证据补足沙箱限制，不代表真实CMS或线上field CWV通过。

## 独立审阅修复复验（2026-11-07，本轮最新证据）

本节覆盖上文旧快照的验收结论。本轮仅继续 WP01，保留原 27 文件暂存内容及所有既有未跟踪产物；新增修复未暂存、未提交。本轮没有构建、启动服务、部署、安装依赖、读取 secrets 或连接/写入数据库。Hermes 之前正常权限下的 221/221、标准构建及 postbuild 成功属于**修复前快照**，不能代替本轮修复后构建。

### 修复与边界

- JSON-LD 检查递归处理顶层数组、嵌套 `@graph` 和数组形式 `@type`；同站绝对、协议相对、相对链接统一按 canonical 解析后检查语言路径。根 `/` 是合法语言选择入口；不再整段豁免 `/support/*`、`/images/*` 等路径。
- 静态资源仅使用显式 `staticAssetPaths` 精确匹配。CLI 从仓库 `public/` 文件清单获得精确路径，不读取文件内容；动态媒体链接若需豁免，必须由调用方显式提供已知路径，不能按目录全部放行。
- `validateSeoHtml` 增加 `expectedHreflang` 映射，可核对缺失、额外语言和 URL 不一致；未传映射仅检查形态，不声称完整性。CLI 可传 `--hreflang='{"/en/products":{"en":"https://ricewind.com/en/products"}}'`（实际验收须填写该页面完整预期集合）。输出明确标注 `syntax-and-explicit-expectations`、是否提供预期、`liveReciprocalChecked:false`、`publicationChecked:false`。**不会抓取 hreflang 目标，也不验证在线可达、发布状态或互链。** Sitemap 必须有条目，空 `<urlset/>` 不通过。
- `seoDate` 仅接受 ISO 日期或带时区 ISO 时间及有效 Date；严格拒绝日历溢出、无时区时间、非 ISO 格式和未来修改时间。允许合法闰日及带偏移时间；注入时钟测试精确边界。未来修改时间省略，**不据此隐藏产品或实现定时发布**；真正发布调度需另行定义 CMS 字段/门禁。本轮没有新增调度功能。
- `site-url.ts` 统一 metadata、schema、主 sitemap、图片 sitemap 的站点基址，移除尾斜杠。测试配置使用 `https://ricewind.com/` 并核对最终 URL。
- 仓储测试用内存关系夹具执行真实仓储筛选流程，断言最终仅返回可见产品：包含未发布分类/祖先、祖先缺少语言、直接分类缺少语言、循环、孤儿、产品草稿、未发布翻译、其他语言翻译、品牌归档/未确认权限及有效对照。数据库边界仍是 mock 适配器，**不是实际 Prisma/SQL 或真实 CMS 发布验证**。Sitemap route 测试仅证明序列化与 URL 行为，不能单独证明发布门禁。
- 页面用真实 Catalog 渲染断言空搜索第一页保留空界面、第二页越界拒绝、有效第二页分页输出、page=1 无参数 canonical，以及可见 HTML 与 JSON-LD 的祖先面包屑。测试中的仓储、翻译和导航边界仍为 mock；未验证本轮 HTTP 最终状态、Next metadata 合并或实际 noindex 注入。
- **明确延期**：`getProductCatalogPage` 仍只检查直接分类发布状态，未应用 sitemap 的祖先可达门禁；这是既有差异，可能出现列表产品点击 404。本轮未扩大实现范围，后续应单独受控修复及验收。

### RED → GREEN 与实际命令结果

| 行为 / 检查 | 实际证据 |
| --- | --- |
| 验证器、日期、尾斜杠修复 | 先新增测试运行，3 文件 20 失败 / 3 通过（`/tmp/wp01-review-red.log`）；实现修复后 3 文件 23/23（`/tmp/wp01-review-green.log`） |
| 原本正确的仓储门禁 | 先补夹具，原实现通过；再临时分别移除祖先、分类发布、产品发布、品牌、语言、翻译发布门禁，均退出 1；恢复原实现后通过。证据 `/tmp/wp01-mutation-{ancestry,category-status,product-status,brand,product-locale,translation-published}.log`。这是变异 RED，不冒称原实现存在这些回归。语言/翻译发布在查询与投影双层过滤，仅移除查询仍通过，故变异同时移除两层才检验输出回归 |
| 原本正确的第一页与面包屑 | 测试先行；临时强制 page=1 带参数、删除祖先 Schema、将零结果判为 404，分别退出 1；恢复原实现后通过（`/tmp/wp01-mutation-{page1,breadcrumb,empty}.log`）。真实 Catalog 测试初次缺少 next-intl 上下文，补齐测试边界后通过；不将该夹具配置错误算作产品缺陷 RED |
| 相关回归 | `pnpm exec vitest run` 指定 SEO、仓储、sitemap、分页、产品与文章详情共 10 文件 **97/97**，`/tmp/wp01-review-regression.log` |
| 类型 | `pnpm typecheck` 无错误，`/tmp/wp01-review-typecheck.log` |
| 聚焦 lint | 本轮 12 个 TS/TSX 源码、测试和脚本 ESLint 无错误/警告，`/tmp/wp01-review-lint.log` |
| 全量（本轮只运行一次） | `pnpm test`：46 文件，45 通过 / 1 失败；**242 通过 / 1 失败**，`/tmp/wp01-review-full.log`。仍为原 `brand-marquee.test.tsx` 子进程 stderr 断言，与已知沙箱 child-process EPERM 基线一致；没有修改、跳过或放宽测试 |
| diff | `git diff --check` 通过；临时变异已全部恢复，仓储及两个页面实现相对原暂存快照无新增差异 |

本轮不启动构建或服务器，避免与 Hermes 重叠；修复后的标准构建/postbuild 由 Hermes 后续执行。真实 CMS 发布链路、hreflang 在线互链、动态分页 HTTP 状态/robots/合并 head 仍未验证。既有外部 lab 记录仅代表当时 demo 单次测量，不代表本轮生产验证；**field CWV/INP 未验证**。生成 `next-env.d.ts`、`next-wp01-check/` 和 `.wp01-*` 本地记录不纳入交付，保留原状。

补充逐行为变异复核：单独恢复图片 sitemap 未归一化基址、移除 hreflang 目标匹配、将 XML 日期退回 Date.parse，各自测试均退出 1（`/tmp/wp01-mutation-{image-origin,hreflang-target,sitemap-calendar}.log`）；全部恢复后针对 2 文件复跑 15/15（`/tmp/wp01-review-mutation-restored.log`）。用于确保同一用例中的前置断言没有遮住后续行为断言，不是第二次全量测试。
