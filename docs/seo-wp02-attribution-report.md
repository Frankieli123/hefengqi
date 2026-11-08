# WP02 询盘归因基础与只读运行预演报告

## 结论

工作目录：`/mnt/vscode/ricewind-wp02-attribution`；基线 HEAD：`e48ee4ff80c7d91683d572883ab6694b4c9788e9`；日期：2026-11-08。

本切片实现了可审查的最小基础能力，但没有宣称生产研究就绪：`researchReady=false`。询盘新增三个 nullable 字段，随首次 `Inquiry` 创建写入；既有记录保持 `NULL`，不会被回填为 `direct`。`NEW`、`PROCESSING`、`CLOSED`、`SPAM` 仍是现有状态，均不等于销售 `qualified`。没有修改 CMS 内容、七语文案、公开视觉、销售状态机、现有 PII CSV 列，也没有新建 HTTP 入口。

## 归因边界

- `/api/inquiries` 只在服务端读取 `_hfq_sid`；按 `id.lastActivity` base36、严格两段格式、未来时间拒绝、30 分钟有效期验证。`/u/api/send` 复用同一解析器，cookie 仍由它设置为 HttpOnly；询盘接口不新建 cookie。
- 保存的是同 `analytics-page-view` 命名空间 `analytics-session:<id>` 的 HMAC-SHA256 `sessionKey`，沿用服务端 `IP_HASH_SECRET`，不返回原始 cookie/id，不发送 Umami。cookie 缺失/无效时 key 为 `NULL`；有 cookie 仍只是候选，不意味着 tracking 已产生 pageview。没有实际匹配查询，`pageViewMatches=null`；绝不查 AnalyticsPageView 全表或做 IP 近似关联。
- `submissionPath` 为前端 `window.location.pathname` 显式可选提示；服务端固定 hostname 白名单 `ricewind.com`、`www.ricewind.com`、`hefengqi.nasl.cc`，不信任请求 Host 扩大范围；仅允许现有七语公开路由，输入最多 2048 字符、最终 path 最多 512 字符。去掉 query/hash；userinfo、非 HTTP(S)、端口、私有片段、编码路径和越界路径拒绝。保守拒绝所有百分号编码，不猜测编码后的私有路径。异常归因为 `NULL`，不阻断合法询盘。
- 前端把 `document.referrer` 先缩减成 HTTP(S) origin，不传 path/query/hash；服务端再仅保存 hostname，拒绝含空 userinfo 在内的 userinfo、非 HTTP(S)、IP（含规范化整数/十六进制地址）、localhost/内部域名。没有 referrer 为 `NULL/unknown`，不推断 `direct`。不按业务词、搜索引擎品牌词等硬编码分类 source。
- 不新增正文、邮箱、电话、IP、完整 URL、query、UTM 自由文本；客户端不能伪造 `sessionKey`、资格或来源认证。
- 来源自报与未签名匿名 cookie 都是关联线索，不是认证来源、独立访客标识或因果证明；HttpOnly 并不能证明 cookie 本身不可伪造。密钥实际配置与留存策略仍需授权生产验收，本次没有读取密钥。

### 字段与 API 契约

| 字段 | 类型 | 数据来源与 NULL 含义 |
| --- | --- | --- |
| `Inquiry.attributionSessionKey` | nullable TEXT | 服务端 cookie 校验后 HMAC；旧记录/无效或缺失 cookie 为 NULL；不证明 pageview 存在 |
| `Inquiry.attributionPath` | nullable TEXT | 客户端自报当前 pathname，服务端公开路由白名单；缺失/非法为 NULL |
| `Inquiry.attributionReferrerDomain` | nullable TEXT | 客户端来源 origin 经服务端域名清洗；缺失/非法为 NULL，而非 direct |

POST `/api/inquiries` 仅新增可选字符串 `submissionPath`、`referrer`；类型/长度异常也会被可选字段 schema 丢弃，不影响必填业务字段。`sessionKey`、`qualified`、`attribution`、正文中的 `_hfq_sid` 等未知字段不会成为服务端授权 context。成功 DTO 仍只有 `referenceId/submittedAt`；新增字段不入公开响应、邮件、webhook 或 Umami 事件，`inquiry-success` 仍只是浏览器表单反馈。错误日志不记录可能包含 PII 的异常文本，仅记固定错误码和耗时/结果。

## 持久化与证据

`prisma/migrations/202611080001_inquiry_attribution/migration.sql` 仅为未执行迁移文件。事务继续包含询盘与 email outbox；幂等重试先读既有键，竞态唯一键也只返回已持久化结果，不覆盖归因、不重复 webhook。事务内不做外部网络调用；现有反垃圾、分类和邮件路径保留。

离线 `summarizeInquiries` 只接受严格的匿名最小快照、必选 UTC `Z` 时间戳 `[start,end)` 区间、`fixture/operator_snapshot` 标识与 `complete/partial` 覆盖声明。每行仅 `key`（64 位十六进制不透明快照去重键，应随机生成而非传真实询盘 ID 或邮箱的无盐哈希）、`createdAt`、四态 `status`、`sessionCandidate`（true/null，不接收 sessionKey/raw ID）和 `referrerDomain`（严格域名/null）；最多 100000 行。格式验证不能证明匿名化质量，调用方仍须确保快照不包含可反查标识；不得传真实 Inquiry 对象。重复键（包括完全相同重复和状态冲突）、越界、PII/资格等额外字段拒绝。不实现读取 DB 或任意输入文件的导出工具。

所有计数范围标记 `supplied_snapshot_only`；coverage 是调用方声明，不证明生产库完整性。partial 覆盖的总体 total 为 null，未观测状态/候选/来源计数为 null，不补零；有观测时计数只是快照观测数量。来源 unknown 独立于 cookie candidate，cookie 存在但无 referrer 仍不能断言来源。状态单独计数。没有明确销售证据时 `qualified=null`、来源闭环 `unsupported`、转化率 `null`，不把 inquiry-success、Umami、GSC 拼成个人或混合口径，也不拿不同口径作除法。fixture 的 complete 只表示内置样例完整，不表示真实持久化上线验收。

## 只读预演

`scripts/seo-data/schedule-plan.ts --help` 先说明约束；执行必须显式 `--dry-run --now --start --end --source --review-start --review-end`。输出包含：

- GSC `America/Los_Angeles` 成熟 3 个 PT 日、每个来源日 +7 PT 日复查提示；成熟不是 finality 保证。
- Umami `Asia/Shanghai` 完整日边界；DST 边界复用现有 `dayBounds` 逻辑。
- 缺配置、unknown/partial 覆盖阻断完整性声明；不调用网络、shell、文件、数据库，不注册 cron。
- 日采集、显式回补、周报告警的授权任务队列接入建议，但无伪造成功状态或持续运行声明。

`--configured` 与 `--coverage` 都仅为操作者声明，不会触发环境发现或验证；即使声明 complete，plan 的 `completeClaimsAllowed=false`，不冒充 live evidence。review 窗口同样强制完整来源日、顺序与最多 366 天边界。GSC 输出每一天的 +7 PT 日复查日期及 review 窗口到期提示；Umami 标记重跑仍需 fresh probes。

未来经单独授权可由独立 runner 将显式 source/range 交给 `scripts/seo-data/cli.ts`，保留原账本 dedup、partial 和 exactness 门禁；日采集用来源时区完整日，回补用显式重叠区间，周报告警覆盖缺配置、partial/unavailable、陈旧运行与 GSC 复查。现有 `src/worker/index.ts` 会处理 email/CrawlJob 并写 heartbeat，不是本切片可直接启动的只读 runner；本次未导入/运行它，未把 SEO 冒充已有任务类型，队列 schema/重试/权限/告警送达需另立授权实现。

### 可复现命令（先 help）

```sh
TSX_DISABLE_CACHE=1 node --import tsx scripts/seo-data/schedule-plan.ts --help
TSX_DISABLE_CACHE=1 node --import tsx scripts/seo-data/schedule-plan.ts --dry-run --now 2026-11-08T12:00:00Z --start 2026-11-01 --end 2026-11-07 --source gsc --review-start 2026-11-01 --review-end 2026-11-07
TSX_DISABLE_CACHE=1 node --import tsx tests/fixtures/wp02-attribution-cli.ts --help
TSX_DISABLE_CACHE=1 node --import tsx tests/fixtures/wp02-attribution-cli.ts --dry-run
```

命令只向 stdout 输出 JSON/帮助；报告文件重定向属于验证外壳，不是 plan 写文件。使用 `node --import tsx` 避免 tsx CLI 的 IPC socket；`TSX_DISABLE_CACHE=1` 禁用 loader 缓存文件。fixture CLI 仅内置匿名数据，不支持任意文件/DB 输入，明确输出 `liveValidated=false`。

## 验证与未验收

### 实际验证结果

| 验证 | 结果 |
| --- | --- |
| TDD RED | 先新增归因/摘要/plan 测试，实际因缺少实现失败；之后新增并发重试测试复现多余读取问题；空 userinfo 补测也先失败后修复 |
| 定向 `vitest run ... --cache=false` | 4 文件、21 项全部通过（mock/fixture，不连接 DB） |
| 原候选全量验证（宿主已提供） | **主代理与独立复核均 436/436 通过**；独立审查 `issues=[]`。这是本轮新增 DB artifact 之前的候选证据，本轮不重跑全仓 |
| 原候选 build/typecheck/lint（宿主已提供） | 均已通过；本轮不重新构建。构建成功不等于生产发布或浏览器验收 |
| 本轮新增 DB artifact 定向验证 | 新增离线 27/27 + 原迁移静态 1/1 通过；`tsc --noEmit --incremental false` 退出 0；两个新增文件 ESLint 退出 0、无 warning；未连接 DB |
| `pnpm exec tsc --noEmit --incremental false` | 退出 0 |
| `pnpm exec eslint .` | 退出 0；0 error、8 个既有 unused-vars warning，未改无关文件 |
| 本地 `prisma generate` | 成功，v6.19.3；只用合成 `postgresql://wp02_synthetic:fixture_only@127.0.0.1:1/wp02_offline`，未连 DB；未运行任何 migrate 命令 |
| plan/fixture CLI | 均先 `--help`，再 `--dry-run` 成功；GSC/Umami 两种计划与匿名摘要由内置 fixture 校验，明确 `executed=false/enabled=false/liveValidated=false/researchReady=false` |
| 副作用单测 | help、错误路径、GSC/Umami plan 上 spy 检查无 fs 读写、fetch、shell、socket 或 interval；CLI 运行时使用无 IPC 的 loader 且禁缓存 |
| `git diff --check` | 通过；HEAD 未变 |

定向测试覆盖 cookie canonical/base36/过期/未来/多段/长度、客户端伪造、路径/来源清洗（含编码私有路径、userinfo/IP/localhost）、旧客户端 nullable、重试不覆盖、事务/outbox、反垃圾/分类、错误无 PII 日志、最小快照/冲突拒绝/unknown、四态不等于 qualified、UTC 半开边界、缺配置/partial、上海完整日与 PT 春季 23 小时/秋季 25 小时/DST 日历减法。

历史记录曾在受限外壳出现 `src/components/brand-marquee.test.tsx:68` 子进程 stderr 断言失败和独立 `spawnSync` 的 `EPERM`。当前宿主提供的主代理及独立复核结果均为 436/436 通过，已取代旧的“435 通过、1 失败/全量不全绿”结论；本轮未修改无关测试或脚本。独立审查 `issues=[]` 是原候选审查结果，不冒充对新增 DB artifact 的独立复核。

依赖使用本 worktree 的 pnpm 离线冻结锁安装，1039 包复用、下载 0；原缓存写保护后复制到 `/tmp/wp02-pnpm-store`，未建立指向外部 node_modules 的 symlink，未改锁文件。Prisma engine 缓存同样隔离 `/tmp`；首次切换 XDG 缓存时 Corepack 尝试下载 pnpm，网络受限失败、未下载成功，之后使用已安装的本地 Prisma 二进制并禁用网络完成生成。`tsx` CLI 的 IPC 在此环境 EPERM，实际可运行命令改为 `TSX_DISABLE_CACHE=1 node --import tsx`。这些工具环境失败不等于应用 live 验收。

外壳验证日志位于 `/tmp/wp02-attribution-full-tests-final.log`、`/tmp/wp02-attribution-types-final.log`、`/tmp/wp02-attribution-lint-final.log`、`/tmp/wp02-attribution-fixture-final.json`；日志/重定向是验证外壳行为，plan 本身不创建文件。

### 迁移、回退与上线门禁

1. **真实 live DB 与 migration 未验收**：没有 migrate status/deploy/dev，没有数据库连接或真实落库/锁耗时/备份恢复验证。SQL 无 DEFAULT/NOT NULL/回填/索引/外键，仅 additive nullable；真实 PostgreSQL 行为仍需授权隔离验收，不把 mock 事务当真实事务提交/回滚证明。
2. 将来发布须先单独授权、验证备份可恢复、审查并在隔离库执行迁移与旧数据 NULL 验收，再在受控窗口迁移，最后启用依赖新增列的新版本；旧版本忽略新增列，新版本在迁移前不可发布。应用回退可保留新增 nullable 列，避免删列数据损失；若需物理 DROP 列，须另行备份、授权与迁移，不自动执行。
3. 本地 build 已由宿主确认通过，但生产发布、完整浏览器七语/真实 cookie-pageview-询盘链、tracking 缺失场景的 live 行为、生产 outbox/邮件送达、Sales qualified 证据、真实 GSC/Umami 配置/探针、队列/日采集/回补/周报告警送达仍未验收。没有启用机制或持续运行，不能声称调度已完成。
4. 没有 commit/push/merge/deploy，没有动原工作树或 3000 服务，没有读取真实凭据、调用真实业务 API、生产 DB 或生产 cron。CMS 内容与七语文案未修改，无新公开 HTTP/PII 导出入口。
5. **`whole researchReady=false`，发布必须单独授权**。当前只是基础归因写入设计、离线摘要与纯只读 plan 的本地验证切片，不是生产归因闭环。

### 模型宿主记录

按本轮宿主记录：runner 启动前已断言实际宿主 `provider=cpa`、`model=gpt-6.1-sol`，且显式传入 CLI；宿主再次只读取 `model/provider`，结果匹配。该记录是**宿主配置/调用证据，不是服务端模型身份认证**；不能再将工具自身不暴露身份核验泛称为“未使用指定模型”。本轮未读取模型凭据或调用外部模型 API。



### 新增真实隔离 PostgreSQL artifact（待宿主执行）

`tests/fixtures/wp02-attribution-db.ts` 使用现有 `postgres` 依赖直连真实 PostgreSQL，不导入应用 `createInquiry`、env、worker 或通知模块；`createInquiry` 成功后有 webhook 路径，因此此处准确限定为 **SQL 迁移/事务边界回归，不是直接业务函数 E2E**。原 mock 应用测试另行验证业务编排，不能代替真实 PostgreSQL 的提交/回滚证据。

- 连接前要求显式 `WP02_DISPOSABLE_DB=1`；URL 唯一数据库 `ricewind_wp02_attribution`、合成用户 `wp02_fixture`、显式端口，host 仅 `127.0.0.1`/`localhost`。Unix socket 使用 `localhost` 加唯一 `host` 查询参数，值必须为绝对目录路径。拒绝其他数据库/host、额外/重复 URL 参数及所有 `PG*` 环境配置，避免驱动回退到外部配置；无 dotenv 或生产文件读取。
- 宿主提供新空隔离 PostgreSQL 的容器映射端口或 Unix socket 与仅供 fixture 的合成口令。Codex 不启动 Docker、不连接 DB、不执行 `--run`。连接后再次核对数据库/用户，拒绝已有用户对象的库；失败保留现场，重跑由宿主重新提供全新空库。finally 关闭连接，不 DROP/TRUNCATE/清理外部数据库。
- 按文件名顺序执行完整历史 Prisma migration，排除最后本次 migration；每个 SQL 文件整段 `unsafe` 执行，不按分号拆 SQL。旧 schema 插入合成 Inquiry 后才执行本次 SQL；验证旧行三个 NULL、三列 nullable/TEXT/无 default。
- 真实事务提交匿名归因 Inquiry + 两条 EmailOutbox；第二条 outbox 故意违反现有外键约束，验证 Inquiry/第一条 outbox 一并回滚且无残留；两连接事务屏障并发提交同一 idempotencyKey，严格验证一个成功、一个 `23505` 且约束为 `Inquiry_idempotencyKey_key`，仅一 Inquiry/两 outbox；不同归因重试仍唯一冲突且保留首次归因。
- 仅输出 JSON 状态/计数与匿名验证布尔值，错误只输出固定 `failed`，不输出 URL、SQL 错误、邮箱、行对象或其他 PII；无 email/webhook/外部网络调用（仅宿主指定本地 PostgreSQL）。成功预期总数为 3 Inquiry、4 outbox；不是生产数据统计。
- 不创建 Prisma `_prisma_migrations` 账本；重复 `Prisma migrate deploy` 行为留给后续 CI，不把原始 SQL 重复执行当作 deploy 幂等验收。**本轮没有任何生产 migration；真实 DB 门禁仍待宿主运行，不声称已经通过。**

仓库根目录命令（本轮已先运行 help；下面 `--run` 仅供宿主随后执行，环境只注入 fixture 合成配置，不加载 `.env*`）：

```sh
TSX_DISABLE_CACHE=1 node --import tsx tests/fixtures/wp02-attribution-db.ts --help
# 宿主先提供新空隔离库并设置 WP02_DISPOSABLE_DB=1、DATABASE_URL；不得注入 PG*。
TSX_DISABLE_CACHE=1 node --import tsx tests/fixtures/wp02-attribution-db.ts --run
```

离线门禁见 `tests/wp02-attribution-db-fixture.test.ts`：27 项，覆盖非法数据库/host/参数/PG* 拒绝且不构造驱动、help/参数错误无 runner、错误脱敏、身份/迁移异常仍关闭连接、完整历史 SQL 保留及 schema 必填合成字段。本轮最终 27/27 + 原迁移静态测试 1/1 通过，typecheck 与两个新增文件 lint 通过；这些离线检查不证明真实 SQL 已在 PostgreSQL 执行。开发阶段曾遇到 Vitest 对 `new URL(..., import.meta.url)` 的资源重写及 Next 对 `ProcessEnv.NODE_ENV` 的类型增强，均已修正并复跑通过；不改应用或全局测试配置。原候选全部保留，未 commit/push/merge/部署/启用 cron。

## 宿主隔离 PostgreSQL 实测补充

全新 PostgreSQL16 一次性容器，仅回环端口连接，未连接生产数据库。CLI --help 后 --run 成功：21个历史迁移；旧行三个新增字段均NULL且列nullable无default；提交1Inquiry/2outbox；外键失败回滚0/0；并发仅1Inquiry/2outbox且首次归因保留。容器清理后残留0。新增fixture后外部57文件463/463通过，非增量typecheck通过。此为真实SQL事务门禁，非业务浏览器E2E、生产迁移或持续调度验收。
