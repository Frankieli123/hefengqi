# Ricewind Phase2 WP01 技术 SEO 实施报告

日期：2026-11-07。范围：当前隔离工作树 `/mnt/vscode/ricewind-wp01-pr`；基线 HEAD 与 origin/main 均为 `81ae163`。

**状态：代码与 mock/SSR 回归已实现；Hermes 报告沙箱外标准构建及全量测试通过，并提供七语本机 HTTP 冒烟与单次 lab 观察值；真实 CMS/完整 lab trace 验收尚未完成，不能标记为全部完成或可发布。** 本代理沙箱内有一项已在原始 main 复现的测试环境失败，构建/浏览器启动也受限。以下明确区分自行运行和外部提供的证据。没有部署、提交、暂存、推送或数据库写入。

## 1. 边界与依据

- 已完整阅读 `AGENTS.md`、`docs/site-change-standard.md`；并阅读设计系统以及本地 Next 16 的 metadata、robots、sitemap、notFound、redirect 文档。
- 保留 CMS 业务内容权威、七语、既有 slug、语言选择、SSR、SQL 分页、产品卡预取策略和询盘渠道。没有改动生产/缓存/部署配置，故没有扩展部署工作。
- 没有读取真实 `.env`、安装依赖、迁移、购买 API、连接真实数据库或更改原分析工作树。没有从旧分析工作树复制文件。
- 本代理未修改原有 `node_modules` 符号链接或共享依赖。后续 Hermes 在沙箱外准备独立既有依赖副本并替换本工作区依赖目录（见第 4 节），不是本代理安装/升级依赖。构建只指定 `next-wp01-check`。收到工作区 `.wp01-host-verification.txt`，其记录宿主机为 `192.168.31.50` 后才启动构建；该文件与 `.wp01-review-note.txt` 均非本次代码产物，没有修改。
- 基线比较使用 `git archive origin/main` 解包到 `/tmp/ricewind-wp01-baseline-9t4i9C`，复用现有依赖，不触碰其他工作树。

## 2. 范围映射

| 要求 | 实现与检查 | 限制 |
| --- | --- | --- |
| metadata/canonical/真实翻译 | `seo.ts` 仅为明确的静态七语路由自动生成 alternates；动态路由使用已发布翻译真实路径；x-default 选择实际存在语言 | 不查询或伪造未发布翻译 |
| 产品分页 | 列表和分类 `?page=2` 自引用 canonical；page=1 canonical 归一为无参数页；正整数严格校验，重复 page、空值、负数、小数、溢出数字和越界页走 notFound | 第 2 页起只声明本语言 alternate，避免假定其他语言具有相同页数；不额外查询七语全表 |
| 搜索/比较 | q/compare 参数出现即 noindex（包括空参数）；既有 `/search`、`/products/compare` noindex 保留 | robots 抓取限制不等同于撤销已收录 URL，未查询搜索引擎后台 |
| robots | 通用、搜索/用户检索、训练用途三个规则组共享完全相同的限制；保留原有 accepted bots 与 allow 策略 | Google-Extended 属用途控制 token，不等同于 Googlebot 搜索抓取；没有新增 AI 禁令 |
| sitemap | URL 去重，缺失/非法日期省略；排除 compare 保留路由；图片 sitemap 同步去重、日期处理及 XML 转义 | 静态页无伪造 lastmod；没有以请求时间代替更新日期 |
| 发布与语言门禁 | 产品 sitemap 和 hreflang 增加共享轻量分类树检查，排除祖先分类未发布/缺少目标翻译的不可达路径；继续使用现有产品/品牌/翻译发布门禁 | 查询为分类结构投影和既有最小产品投影，不加载产品详情图谱；实际 CMS 数据未验证 |
| RFQ Product Schema | 删除整个无来源 Offer，包括 USD、InStock、动态有效期及固定报价规格；无价格零值替代；缺失更新时间不再用 now | 不承诺 Product 富媒体结果资格，询价型内容继续保留真实产品事实 |
| Organization | 统一稳定 `https://ricewind.com/#organization`（根据 SITE_URL 生成），移除 Organization 的 HEFENGQI alias；Article publisher/Service provider 引用同一 ID | 保留真实 `/brand/hefengqi-mark.png` 资产 URL；没有批量替换 CMS 作者或业务文案 |
| Article/Breadcrumb | 新闻署名与页面复用原有本地化格式；不创造作者或日期；案例不再输出页面未展示的修改时间；案例、方案补齐可见层级面包屑，分类面包屑包含祖先 | 没有全局 HowTo，既有 Article/TechArticle 分类保留 |
| JSON-LD 安全 | 审计发现所有结构化数据统一经 JsonLd；已有 `<` 转义保持；增加脚本闭合攻击字符串、Unicode、数组 graph 的序列化回归 | `dangerouslySetInnerHTML` 仅用于安全序列化 JSON-LD，未增加任意 CMS HTML 注入 |
| 内链、SSR、404/跳转 | 七语产品/新闻/案例/方案 SSR 测试；保留已有分类、分页、产品、近期新闻、相关产品和联系链接；缺失资源 404 与历史 slug 目标回归 | 现有历史 slug 跳转是 307，未声称为 301；没有改 slug 或批量跳转策略 |
| 自动验证 | `seo-validation.ts` 纯检查器及两个 scripts：最多 12 个显式本机 URL 的 SEO 检查、单页本机移动 lab trace | 不递归抓取链接，不访问生产；浏览器测量脚本禁止第三方请求及 API 请求 |
| CWV | 检查现有 Playwright、Lighthouse 配置和已安装 Chromium；实际尝试启动测量 | 本代理沙箱阻止 Chromium 启动；外部提供单次 demo LCP/CLS，未提供 trace；field CWV/field INP 均不可用 |

## 3. 保留的现有实现

产品列表本来就使用 SQL count + skip/take（每页 12 条），搜索也在 SQL 中分页；没有将其替换为全表读取。仓库原本把越界请求钳制到最后一页，本次由页面检测 pageCount 后返回 404；最多读取一页产品，没有增加全表查询。

产品详情已有真实 alternate slug、分类祖先面包屑和推荐产品；新闻已有 Article/TechArticle、真实发布日期和语义正文。现有 ProductCard、Catalog、EditorialDetail 的服务端链接足以连接首页/分类/产品/文章/联系页，未为 SEO 堆叠无来源链接。语言切换与已有预取策略没有改动。

静态七语页面沿用原 metadata，公开页面仍为 Server Component；没有转成客户端加载 SEO 内容。本代理未能运行服务器；后续外部提供有限路径的七语 HTTP 与 404 验证，范围见下表，不能外推真实 CMS 所有详情页和响应头。

## 4. 实际验证结果

所有新行为先补失败回归，再修改代码。首批 Schema/robots/dynamic alternate 4 项失败；分页和 sitemap 13 项失败；分类发布门禁 2 项失败；compare sitemap 保留路径 2 项失败；案例日期与可见正文 7 项失败，修复后均通过。验证器文件在实现前以缺失模块失败启动，随后补齐实现。

| 命令/检查 | 实际结果 |
| --- | --- |
| `pnpm exec vitest run src/lib/seo-wp01.test.tsx src/lib/seo.test.ts src/lib/seo-validation.test.ts src/lib/content-repository.test.ts src/app/sitemap-wp01.test.ts 'src/app/[locale]/products/wp01.test.tsx' 'src/app/[locale]/products/[slug]/seo.test.tsx' 'src/app/[locale]/news/[slug]/page.test.tsx' 'src/app/[locale]/editorial-seo.test.tsx'` | 最终实际聚焦运行：9 文件、75 测试全部通过，退出 0 |
| `pnpm typecheck` | 最终退出 0 |
| 对全部 24 个修改/新增 TS/TSX/MJS 文件执行 `pnpm exec eslint ...` | 最终退出 0，无 warning |
| `pnpm test` | 最终 45 文件：44 通过、1 失败；221 测试：220 通过、1 失败，退出 1 |
| `pnpm --dir /tmp/ricewind-wp01-baseline-9t4i9C test`（原始 origin/main） | 39 文件：38 通过、1 失败；179 测试：178 通过、1 失败；与本次同一失败，退出 1 |
| `env -i PATH="$PATH" HOME="$HOME" NEXT_DIST_DIR=next-wp01-check DEMO_MODE=true SITE_URL=https://ricewind.com NEXT_TELEMETRY_DISABLED=1 pnpm build` | 退出 1：Turbopack 拒绝指向项目文件系统根外的 node_modules 符号链接 |
| 上述隔离环境下 `pnpm build --webpack` | 退出 1：无法解析 TypeScript `--showConfig` 输出，输出为空；未进入成功构建/运行验收 |
| 最小 Node `spawnSync` 诊断 | 明确返回 `spawnSync .../node EPERM`，stderr/stdout 为空；用于解释基线测试失败与子进程环境限制 |
| `node scripts/measure-seo-wp01.mjs http://127.0.0.1:3101/en` | Chromium 启动即失败，`sandbox_host_linux.cc:41 ... Operation not permitted`；未导航、未生成 lab 数据 |
| `git diff --check` | 退出 0 |

唯一全量测试失败是未修改的 `src/components/brand-marquee.test.tsx` 中 `copy-standalone-assets` 子进程失败消息断言。没有跳过、放宽或修改该断言来制造绿灯。main 基线已完整复现，属于当前沙箱环境失败。所有 WP01 相关测试均通过，但全量测试仍不是通过状态。

### 后续外部核验（与本代理自行运行分开）

工作区新增 `.wp01-external-results.txt` 记录：**Hermes 在沙箱外使用独立既有依赖副本，标准 `NEXT_DIST_DIR=next-wp01-check DEMO_MODE=true SITE_URL=https://ricewind.com pnpm build` 成功，包含 postbuild；全量测试 45 文件、221 测试通过。** 本代理没有修改共享依赖，也没有重新启动重叠构建。

本代理只读确认了 `next-wp01-check/BUILD_ID`、`standalone/server.js`、`standalone/next-wp01-check/server/pages-manifest.json` 存在，BUILD_ID 时间为 08:53:35 UTC，晚于本次运行代码修改。外部说明中的完整日志路径为 NAS 上 `workspace/seo-geo-phase2/wp01/build-independent.log` 和 `full-tests-independent.log`；本沙箱已尝试定位但无法读取这些路径，因此成功结果按 **Hermes 提供的外部证据** 引用，不声称本代理直接运行成功。

外部构建自动更新了 `next-env.d.ts` 和 `tsconfig.json` 的隔离构建 types 路径。生成的 include/next-env 改动予以保留。构建后 `pnpm typecheck` 曾因扫描 standalone 内被追踪复制的测试文件失败；本代理仅在 tsconfig.exclude 新增 `next-wp01-check/standalone`，没有删除产物或排除源码/生成路由类型，随后 typecheck 恢复退出 0。后续本代理尝试 `env -i PATH="$PATH" HOME="$HOME" NEXT_DIST_DIR=next-wp01-check DEMO_MODE=true SITE_URL=https://ricewind.com NEXT_TELEMETRY_DISABLED=1 pnpm start --hostname 127.0.0.1 --port 3101`，仍因 `listen EPERM` 退出 1，日志 `/tmp/wp01-local-server.log`。因此本代理没有自行取得 HTTP 或 lab 指标；后续收到的外部结果如下。

### 后续外部 HTTP 与浏览器观察（Hermes 提供）

来源 `.wp01-rendered-results.txt`，`RENDERED_SEO_EXIT 0`：`/en`、`/zh`、`/ru`、`/fr`、`/de`、`/es`、`/ar`、`/en/products`、`/sitemap.xml` 的检查器 errors 均为空。

| 本机 HTTP 路径 | 外部记录 |
| --- | --- |
| `/en/products?page=99999999` | 404 |
| `/en/products?page=0` | 404 |
| `/en/nonexistent-wp01` | 404 |
| `/en/industries` | 307 → `http://127.0.0.1:3197/en/solutions` |
| `/en/support` | 307 → `http://127.0.0.1:3197/en/support/troubleshooting` |

外部 `BROWSER_EXIT 0`、`LAB_LOCAL_DEMO` 记录：LCP **404 ms**、CLS **0.0006916918240542204**、H1 数量 1、overflow=false。这是 **Hermes 提供的单次本机 demo 观察值**，不是本代理测量脚本成功输出；该摘要没有完整 URL、viewport、节流配置或 trace 文件，不能用于生产性能结论或与其他环境横向比较。**field CWV、field INP 仍不可用，也没有 Lighthouse 分数。**

构建后最终再次运行：`pnpm typecheck` 退出 0；24 文件 focused lint 退出 0；`pnpm test` 在本沙箱仍为 220 通过、同一基线 EPERM 测试失败。相应日志为 `/tmp/wp01-types-postbuild-final.log`、`/tmp/wp01-lint-postbuild-final.log`、`/tmp/wp01-tests-postbuild-final.log`。不能把外部全绿替换成本沙箱全绿的声明。

日志保留在 `/tmp/wp01-*.log`，其中 `wp01-full-tests-final.log`、`wp01-baseline-full.log`、`wp01-types-final.log`、`wp01-lint-final.log`、`wp01-build.log`、`wp01-build-webpack.log`、`wp01-lab.log` 分别对应最终结果。日志是临时诊断文件，不是发布资产。

## 5. 可复用的非破坏性验证入口

在允许启动浏览器与子进程、已有隔离 demo 服务的环境中执行：

```sh
pnpm exec tsx scripts/validate-seo-wp01.ts http://127.0.0.1:3101 https://ricewind.com /en /en/products /sitemap.xml /image-sitemap.xml
node scripts/measure-seo-wp01.mjs http://127.0.0.1:3101/en /tmp/ricewind-wp01-lab
```

前者只 GET 明确指定的最多 12 个本机公开 URL，检查 canonical、hreflang URL 形态、单 H1、标题、安全 JSON-LD、站内链接语言前缀以及 sitemap URL/日期/重复项，不递归探测链接目标。真实翻译存在性由仓库 mock 回归验证，不能把语法检查冒充线上 hreflang 完整性验证。

后者使用已有 Playwright/Chromium、375×812 viewport、4 倍 CPU 降速、150ms latency、固定吞吐率，保存 CDP timeline trace 与单次导航 LCP/CLS 到 `/tmp`。拦截 API/第三方流量，适用于隔离 demo 导航诊断，不能代表生产完整业务负载。**没有测量 field INP，也没有拿 lab TBT/事件时间替代 field INP。** 本代理脚本执行未成功；上文只引用有来源的外部观察值，不提供任何估计分数。

## 6. 剩余验收与风险

1. 本沙箱全量测试仍受 EPERM 影响；Hermes 已报告沙箱外全量通过，完整外部日志尚未由本代理读取。不要改测试掩盖 EPERM。
2. 原依赖链接触发的默认 Turbopack 阻断，已由 Hermes 的独立依赖副本及外部标准构建成功说明补充。Webpack 仍仅是本代理的失败诊断尝试；没有修改 next.config。
3. 无真实 DB 凭据，因此没有验证真实发布数据、数据库查询计划、后台到前台流程和完整运行时状态；构建尝试使用无 DB 的 demo 环境，不是生产数据验收。
4. 外部已提供七语首页、产品列表、sitemap 和 404/历史跳转 HTTP 冒烟证据；生产 CMS 数据、响应头、动态详情完整 head 和真实 lab trace 仍未验收，不宣称 Lighthouse 通过。
5. Field CWV 需要 CrUX/Search Console/RUM 的真实访问数据与足够采样周期，本次不可用。
6. 历史 307 跳转保持原样。是否全站迁移为 301/308 需单独检查映射生命周期和缓存影响，本次没有扩展到 URL 迁移任务。

## 7. 回滚

未部署、未提交，不需要生产回滚。若决定撤回，按本次文件清单反向应用工作区 patch：恢复 SEO helper、robots/sitemap、相关页面和 repository 变动，并移除本次新增验证文件以及本代理添加的 standalone 排除项（若不再保留该构建目录）；保留用户新增的 `.wp01-*` 说明、Hermes 准备的独立依赖、外部构建生成的类型配置及其他用户改动。不要使用全树 reset/clean，不要删除或修改其他工作树。无数据库或 CMS 内容变更，无需数据回滚。

`next-wp01-check/` 最初包含本代理失败构建的产物，之后由 Hermes 的成功隔离构建更新；未手工编辑、未纳入源代码交付，也未触碰 `.next/`、`next-build/` 或生产运行目录。

## Hermes最终独立验收补充

构建后最终在沙箱外复跑：pnpm typecheck退出0；45个测试文件221项全部通过；24个源码/测试/脚本文件ESLint退出0且无警告。标准Turbopack pnpm build和postbuild成功，不是webpack替代。七语首页、英文列表、Sitemap及404/307已实际验证，服务仅绑定127.0.0.1:3197，完成后已关闭。

正式执行 scripts/measure-seo-wp01.mjs 成功，保存CDP trace（777950字节）及metrics。路径/en/products；375×812；4倍CPU降速、150ms延迟、200000 B/s下载、93750 B/s上传；仅本地GET，API与外部请求被阻断。单次LCP=1584ms，CLS=0.0006916763100900289。NAS归档workspace/seo-geo-phase2/wp01/lab/。这是demo单次实验室导航，不是生产CWV、field INP或完整业务测量，不能保证线上同等性能。早期未节流404ms样本不用于正式对比。

PR准备使用27文件窄diff，不含生成next-env.d.ts、依赖、构建目录和工作区说明。tsconfig仅包含隔离类型路径及standalone排除，代码来源origin/main；不是现有release完整替代物。保留的真实logo路径可含历史文件名，但Organization品牌alias仅RICEWIND/禾风起。未完成真实CMS端到端和上线后验收；禁止直接发布。

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

## Hermes审查修复后独立验收（当前最终状态）

修复后在正常工具权限环境重新执行：全量46文件243/243测试通过；pnpm typecheck通过（包括构建后再验）；26个修改/新增源码/测试/脚本ESLint零错误零警告；标准Turbopack pnpm build及postbuild成功。证据在NAS workspace/seo-geo-phase2/wp01/review-fix-gates.log 和 review-fix-lint.json。

重建后的隔离服务再次验证七语首页、英文列表、Sitemap；七语首页明确传入完整七语+x-default预期集合均通过。检查器明确liveReciprocalChecked=false、publicationChecked=false；此次没有全站互返/真实CMS验收。非法/超界页与不存在页面404，旧入口307目标保留。结果在rendered-explicit-hreflang.log。临时loopback服务已退出，未影响运行服务。

发布风险：现有.github/workflows/ci.yml在push main时有image/deploy任务，pull_request仅verify。本次仅push功能分支/创建PR，严禁合并、push main或触发生产发布。没有改CI。该PR用于代码审核，不等于完整现有release，真实CMS、全站内链互返、field CWV/INP及发布集成仍列为发布前验收。
