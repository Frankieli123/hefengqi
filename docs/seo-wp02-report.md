# WP02 SEO/GEO 数据管道实施报告

## 2026-11-08 显式本机 SSH 隧道选项（当前实现，live pending）

本节补充下节的精确逐事件路径，不替代原有 GSC、Umami 身份与 API 契约。修改仅限离线 CLI、模型、采集/证据校验及测试/说明；没有修改公开网页、CMS、生产配置、镜像、端口映射、认证或部署。

### 安全门禁与操作者确认

- 默认 Umami origin 仍只接受原有 HTTPS 规则。HTTP 例外**必须同时显式指定** `--umami-tunnel-local --umami-tunnel-port PORT`，`PORT` 为十进制整数 1024..65535（不接受前导零、小数、指数或空白）。运行时 `UMAMI_API_URL` 必须逐字等于 `http://127.0.0.1:PORT`；3008 没有特殊豁免，文档使用本机 13008。只给 URL、只给同意 flag、只给端口或端口不匹配全部拒绝。隧道参数不能用于 GSC，也不能与 HTTPS origin 混用。
- 不允许 hostname、其他 HTTP host、其他 loopback 表示（含 localhost、IPv6、127.1、整数/十六进制 IP）、尾斜杠、路径、userinfo、query 或 fragment；原始字符串先精确比较，不经 URL 标准化放宽。所有 token 请求仅发向所声明的字面 loopback origin，沿用 `redirect: "error"`，并拒绝 3xx、已重定向响应及响应 URL/端口不一致；不允许借此选择任意 SSRF 目标。
- **安全确认：`--umami-tunnel-local` 表示操作者确认 CLI 必须通过已授权的 SSH 本地转发，在 CLI 进程自己的主机上运行。** 本地 `127.0.0.1` 是 CLI 主机，不是生产主机；当前构建主机不能直接访问生产 localhost。操作者必须先使用既有已批准 SSH 认证在 CLI 主机建立转发，再运行 CLI；不需要也不允许开放生产 Umami 公网端口。
- 此 flag 只是**操作者声明，不是隧道或 SSH 会话验证**。恶意本机进程可以占用端口、模拟 API 或读取收到的 token；loopback 限定避免任意目标，但不认证本地监听者。操作者须确认本机监听者及 SSH 目的主机可信，固定版本/镜像声明不能证明监听者身份。CLI 不创建 SSH 子进程、不建立/探测/声称隧道已建立，也不管理 SSH 凭据。
- 保留唯一支持的 Umami 3.4.0 / 固定镜像 digest 与官方 `event=eq.<name>` 过滤先于分组的契约。每次精确执行都重新运行阳性与随机阴性 API 探针，不能因 tunnel flag 省略；dry-run 只规划，不验证 API。未知身份保持 partial；探针失败不会升级 complete。探针只能证明观察到的 API 行为，不能认证 SSH 会话或抵御恶意本地 API 伪装。
- 成功与失败探针 scope 保留字面 origin/property/runId/identity/contract，并附 `umamiTunnel: { local: true, port: PORT }` 操作者声明；存储层复核匹配 origin/port、检查与能力证据一致性及 collect 签发摘要。不完整 run 仍不替换 last-good 观测或 checkpoint，不把不同端口的 origin 当同一来源。

### 操作示例（文档命令，本轮未执行）

在**将运行 CLI 的同一台主机**单独开终端，使用已有 SSH 配置/agent/认证，把 `APPROVED_SSH_HOST` 替换为已批准的 SSH 主机别名，不在命令中加入密码、token 或私钥内容：

```sh
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:13008:127.0.0.1:3008 APPROVED_SSH_HOST
```

该命令仅监听 CLI 主机 `127.0.0.1:13008`，远端目标是 SSH 主机的 `127.0.0.1:3008`。不要改成 `0.0.0.0`、`-g`，不要添加生产端口暴露规则。转发创建失败则停止，不继续采集；操作者核对该 SSH 会话及远端身份，不能把 `ExitOnForwardFailure` 当作 Umami 已可用的证明。

另一个终端仍在相同 CLI 主机，使用**专用新私有 evidence 目录**；HTTPS origin 的旧账本不能改成 loopback origin 混写。先安全提供 `UMAMI_WEBSITE_ID`；真实采集所需短期只读 `UMAMI_ACCESS_TOKEN` 只能由既有安全机制注入 CLI 进程环境，不作为 CLI 参数、不打印、不写入 shell 历史、仓库、`.env*` 或报告，禁用 shell tracing。以下不含任何凭据：

```sh
export UMAMI_API_URL=http://127.0.0.1:13008
node --import tsx scripts/seo-data/cli.ts --source umami --start 2026-11-01 --end 2026-11-02 --events inquiry-click,inquiry-success,product-view --umami-version 3.4.0 --umami-image sha256:85909afc45bdcda1917394594a087421fdbb05610fded0fa9f6fb861abb2f367 --probe-event inquiry-click --probe-date 2026-11-01 --umami-tunnel-local --umami-tunnel-port 13008 --output /tmp/wp02-umami-tunnel-evidence --dry-run
```

确认请求计划、已结束上海日期及实际有数据的 probe-event/date 后，在授权进程环境已安全注入 token 的前提下，移除 `--dry-run` 才实际读取 API 并运行新双探针。CLI 不读取仓库 secrets、不自动获取或刷新 token。示例不会自动运行 SSH；本轮没有运行上述 SSH 或真实采集命令，**未验证隧道/会话、生产 API 双探针、生产聚合结果或镜像身份**，不宣称 live verified。`researchReady=false` 与原始 GSC query/page 的哈希研究缺口不变。

### 本轮离线验收

- RED：新文件 43 项中 **11 failed / 32 passed**，原代码不接受 tunnel flag；`/tmp/wp02-tunnel-red.log`。GREEN：3 个相关测试文件 **119 passed**；`/tmp/wp02-tunnel-green.log`。覆盖匹配端口/明确同意、HTTPS 回归、bare HTTP/非 loopback/别名/路径/端口范围拒绝、3xx/redirected/响应端口不一致、每次新探针、固定身份、失败保留 last-good，以及 token 不出现在结果或账本。
- 外部配置全量 unit 实测：`NODE_DISABLE_COMPILE_CACHE=1 TSX_DISABLE_CACHE=1 pnpm exec vitest run --config /tmp/wp02-validation.config.mjs --configLoader native --cache=false`，**375 passed / 1 failed（51 files：50 passed / 1 failed）**；`/tmp/wp02-tunnel-full.log`。唯一失败仍为未修改的 `src/components/brand-marquee.test.tsx:68` 子进程断言：期望 stderr 包含 `Failed to copy standalone assets`，实际为空。未修复无关测试，不宣称全量通过。external config 沿用仓库相同的 React 插件、alias、setup、环境及测试 include；使用 native loader 避免 external config bundle 的依赖解析启动错误，无依赖安装或共享依赖写入。
- 最终相同外部配置与缓存禁用下 focused **119 passed**（43 tunnel + 33 exact + 43 原有回归）；包括缺 token 不替换 last-good、另一字面端口不能混入已有来源账本。`pnpm exec tsc --noEmit --incremental false` **退出 0**；首轮发现的新测试 mock 类型错误已修正。`pnpm exec eslint . --no-cache` **退出 0，0 errors / 8 既有 warnings**。日志分别为 `/tmp/wp02-tunnel-green.log`、`/tmp/wp02-tunnel-typecheck.log`、`/tmp/wp02-tunnel-lint.log`。
- `NODE_DISABLE_COMPILE_CACHE=1 TSX_DISABLE_CACHE=1 node --import tsx scripts/seo-data/cli.ts --help` **退出 0**，输出已包含 SSH 示例、安全确认、操作者声明非会话验证与 token 仅进程环境要求；`/tmp/wp02-tunnel-help.log`。只执行离线测试/帮助/typecheck/lint，未联网、启动浏览器、build、建立 SSH、读取真实 secrets、访问生产或 commit/push。

## 2026-11-07 Umami 精确逐事件切片（当前实现，live pending）

本节是当前能力边界；后文纠正/候选记录为历史。任务提供此前外部 **300 unit + typecheck + lint、独立安全审查通过** 的基线结论，本次没有重新执行独立审查，不将旧审查结论冒充本次审查。候选和 GSC 修正继续保留，`researchReady: false`，原始 GSC query/page 仍只有哈希键，研究缺口未解决。

### 契约与身份信任边界

- 本次依据任务提供的官方固定源码证据：Umami **3.4.0**，commit `ec0ff50388c264ed8ce46f00967e92f7e71476ae`。`metrics/route.ts`、`lib/params.ts`、Prisma/ClickHouse operators、`queries/sql/events/getEventMetrics.ts` 的契约是 `event=eq.<name>` 精确过滤 **先于 GROUP BY / COUNT(*) / LIMIT**。`limit=1` 只限制事件分组行，不截断计数；只要求实际字段 `x,y`，不强求 `t`。本次不联网重查源码或生产 API。
- 唯一受支持身份为显式参数 `--umami-version 3.4.0 --umami-image sha256:85909afc45bdcda1917394594a087421fdbb05610fded0fa9f6fb861abb2f367`。镜像/版本由任务提供的独立只读核验确认，但 CLI 中这些参数仍只是**受信任本地操作者的身份声明，不是运行时能力证明，也不证明镜像逐字等于官方源码**。不接受 `verified=true` 作为证据，不需要签名身份认证。
- 程序不能自动知道宿主镜像/版本是否改变；操作者每次执行前须在外部重新核对 origin 对应宿主身份，不能把旧参数当永久保证。每次执行仍重新实测双探针，不能复用旧 run 的能力记录。未知/缺失版本或镜像继续走旧聚合路径并保持 partial，不凭空升级 complete。

### 双探针和精确范围

- `--probe-event` 必须显式指定已知实际有数据的 `product-view / inquiry-click / inquiry-success` 之一；探针日默认为明确请求的 `--start`，或使用显式 `--probe-date YYYY-MM-DD`（允许范围外）。必须是上海已结束历史完整日，不接受当天/未来；没有声称任意历史日永不迟到或修订。
- 阳性：唯一 `x===probeEvent` 且 `y>0`；阴性：每次生成新 `wp02-control-<randomUUID>`、从未主动埋点的控制名，必须 `[]`。UUID 碰撞概率极低，**不是数学不可能**，不能复用固定“不可能名”。二者同 origin/property/日期/毫秒窗口/参数模板，只有事件名不同。双空不通过；HTTP 200 本身不通过。
- 通过后，对每个配置事件、每个日期独立请求 `GET metrics?type=event&event=eq.<name>&limit=1&offset=0&startAt=...&endAt=...&timezone=Asia%2FShanghai`。只用一次 `URLSearchParams` 编码，不带 search、segment、cohort 或其他过滤。只允许上述三个白名单事件的非空子集；不采访客、session、IP、事件属性或 PII。
- 每个响应只接受 `[]` 或唯一同名 `x,y` 行；`y` 是非负安全整数。通过门禁后，`[]` 仅在**该日期/该配置事件**解释为 measured 0，非所有事件零。完整性是 `configured_events_exact`，不是全站所有事件完整。阳性若与日查询窗口相同，重复读取必须一致。本实现不复用阳性请求，保留独立日查询证据。
- 所有计数包含实际重复发送的事件，`inquiry-success` 是表单成功事件次数，**不等于有效询盘**、唯一访客、RFQ 或销售。沿用内部历史 `contactClicks` 计数字段，按 `event` 解释，不能将 product-view 误标为联系点击。
- 任一请求/形态/错名/多行/计数/探针错误使整次 partial，不替换任何事实或推进 checkpoint；可持久化部分 run manifest 供审计。成功能力证据包含 origin、property、版本/镜像身份、固定源码契约、schema、runId、阳/阴性事件身份、窗口、rowCount/count，以及每事件每日的测量证据，不含 token。
- 存储层重新校验完整证据的身份、范围、窗口、事件、测量/观测一一对应；还核对当前进程内 collect 签发的对象及其摘要，拒绝伪造 complete、缺证据、修改或克隆后冒充 collect 的 run。不提供从任意 JSON 导入 complete 的旁路。历史 ledger 可继续读取，但旧 aggregate_below_limit 不再用于制造新完整夹具；完整快照测试使用实测双探针的 typed capability。
- 上限：366 日、最多 3 个不同事件，固定双探针，共最多 **1100 个逻辑请求 / 3300 次 HTTP 尝试**（429/5xx 每请求最多三次尝试；403/transport 不重试），每次超时 15 秒、响应 8 MiB、账本 64 MiB。无浏览器、构建、调度器或隐式增量请求。

### CLI 示例与本轮验证

只读 bearer 和默认 HTTPS origin 规则不变；2026-11-08 新增的显式本机隧道例外见报告开头。无自动凭据发现/登录/刷新。由操作者提供运行时 `UMAMI_API_URL`、`UMAMI_WEBSITE_ID`，实际采集另提供短期 `UMAMI_ACCESS_TOKEN`；dry-run 不需要 token、不请求 token、不联网、不写目录/账本，只列举两条探针与逐事件计划。dry-run 中随机控制名仅为该计划，实际执行重新生成。

```sh
node --import tsx scripts/seo-data/cli.ts --source umami --start 2026-11-01 --end 2026-11-02 --events inquiry-click,inquiry-success,product-view --umami-version 3.4.0 --umami-image sha256:85909afc45bdcda1917394594a087421fdbb05610fded0fa9f6fb861abb2f367 --probe-event inquiry-click --probe-date 2026-11-01 --output /tmp/wp02-umami-evidence --dry-run
```

本轮全部网络行为均为注入 mock；**生产双探针、真实逐事件聚合对照、宿主身份再次核对仍 live pending**。未读取真实凭据或访问生产 API/DB，未安装、build、浏览器、commit/push/merge/deploy。

本轮验收（不是外部基线的重复声明）：

- TDD RED：新增精确路径测试 **5 failed**，原实现拒绝 identity/probe 参数；`/tmp/wp02-umami-red.log`。GREEN 后补齐阳/阴性、未知/缺失身份、非法计数、多行、错误事件、随机控制与同窗、窗口变化、失败保留 last-good、完整证明篡改/伪造、请求重试界限、dry-run 与 mock CLI 测试。
- 最终 focused：原文件 **43 passed** + 新文件 **33 passed** = **76 passed**；`/tmp/wp02-umami-focused.log`。旧历史完整快照夹具改成由 collect 实际生成 typed capability，不再手工把 partial 改成 complete；保留原来的 500 行反例、scope 失效/区间尾部和 GSC 回归。
- 全量：**332 passed / 1 failed（50 files）**；`/tmp/wp02-umami-full.log`。唯一失败仍是未修改的 `src/components/brand-marquee.test.tsx:68` 子进程测试，期望 stderr 含 `Failed to copy standalone assets`，实际为空；不修复无关测试，不宣称全量通过。
- TypeScript `--noEmit --incremental false` 通过；focused ESLint `--no-cache` 通过；全仓 ESLint `--no-cache` 退出 0、0 errors、8 个既有 warnings。日志 `/tmp/wp02-umami-types.log`、`/tmp/wp02-umami-lint.log`、`/tmp/wp02-umami-full-lint.log`。Vitest 均 `--cache=false`，最终运行另禁用 Node/tsx compile cache。
- `umamiChecks` 也把失败探针的请求身份、窗口、rowCount（未得到数组时为 null）、passed/rejected/not_requested 状态与固定身份/契约写入 manifest；不会把“未请求”当通过。错误返回的原始事件名、响应体与传输错误不落盘。成功 capability 还须与这些检查记录一致，单个 passed 标记本身不能授权 complete。

## 历史：2026-11-07 独立审查失败与纠正

独立审查结论为 **`passed: false`**，不是 PR ready。外部普通权限环境曾通过 287/287 unit、typecheck、focused lint；授权方也报告 GSC 2026-11-01 只读 CLI 返回 1 行、重跑无重复、缺 token 保留 last-good。这些是此前版本的外部证据，不推翻本轮 P1/P2 缺陷，也不是本轮重新执行的 live 验证。本轮不访问真实 API、数据库或密钥，不安装、不提交、不发布；没有 Umami live verified 声明。

真实缺陷：Umami 把响应小于请求 limit 当作已穷尽；GSC 把 final 暂缺空响应当作完整空日；重叠 events scope 改写全局行但留下旧 scope checkpoint。先补测试在原实现上复现 **6 failed / 31 passed**，包含服务端只返回 500 行但请求 1000 的反例、近期及历史 final 空响应、空/非空重叠 scope。此 mock 反例不证明目标 Umami 实例实际存在 500 行限制。

该次纠正后的能力边界：Umami 当时始终保守 partial（当前新增有门禁的精确路径见首节），GSC 空日始终 unconfirmed/incomplete；只接受成熟候选且非空的 GSC API 快照。历史 ledger 可读取，旧行、旧 manifest 和 partial 时的 checkpoint 原样保留；旧记录缺少新策略元数据不表示已经过新策略认证，不自动重写历史证据。

## 历史纠正切片的范围与语义（Umami 当前扩展见首节）

- 本实现仅位于 `scripts/seo-data/`，不修改网页、公开 SEO 路由、CMS、Prisma、生产接口或部署内容。网络读取通过调用方注入的 fetch 执行；CLI 是唯一读取运行时 token 环境变量的模块，无凭据发现、登录和保存 token。
- GSC 使用 Webmasters API v3 `searchAnalytics/query`，固定 web、`dataState=final`、洛杉矶日，使用 `sites/{encoded property}`。日内按 `rowLimit/startRow` 分页，429/5xx 最多重试两次，403 不重试。分页耗尽只表示当前 API 可见结果已读完，不表示完整属性总量、匿名查询覆盖或不可变 final；支持 date/page/query/country/device。page/query 仍只以 SHA-256 键保存。
- Umami 请求 `/api/websites/{websiteId}/metrics?type=event`，上海完整日；仅保留白名单事件的聚合计数。**本地没有目标 Umami 服务实现或已证明的逐事件精确聚合契约**，不能声称端点能力已核验。请求 limit 不构成服务端穷尽性契约，即使返回 0 行、少于 limit、或所有白名单事件都出现，也始终 `partial / incomplete / aggregate_exhaustiveness_unverified`，不替换观测或推进 checkpoint。观测只作为本次 run 的候选统计摘要，缺失事件不是 0。`aggregate_below_limit` 仅保留作历史格式兼容和历史快照回归模拟，新采集不产生它。contact click 不是 RFQ、询盘或销售。
- 每个来源分别保留 timezone、property、dataState、状态、完整性、来源、scope/checkpoint 和完整日期覆盖。测得零、无行、不可用分开表达；无行不生成零行。GA4 状态固定为 `blocked_unconfigured`。
- 不完整、不可用、未配置 run 进入 run manifest，但不替换观测或 checkpoint。fixture 与 live evidence 不可混写。输出仅允许用户明确提供的私有 evidence 目录（仓库内须在 `evidence/` 或 `.evidence/`）；不允许源码、public、运行时目录、符号链接、宽权限目录、仓库根目录或 `.env*`。账本以 lock directory 排斥并发写入，canonical JSON、fsync、同目录 rename 原子替换，SHA-256 校验和幂等 upsert。
- 存储选择**全局最新事实表，不是 scope 独立快照**：行 key 为 source/property/date/维度值/event。完整快照仅替换相同维度集合、日期和事件的行；对其他重叠事件集合的 checkpoint，显式扣除被改写的日期交集，保留前后区间及无交集事件/维度的 checkpoint。历史 manifest 的 observationDigest 证明当时结果，不承诺等于当前事实表。GSC 维度顺序不产生新 scope；请求顺序用于正确映射 keys，集合排序用于身份判定。测试模拟历史 `{contact,other}` 后 `{contact}` 空/非空完整快照，检查失效与区间拆分；当前实际 Umami run 均 partial，因此不会改写任何旧行或 checkpoint。
- checkpoint 是可修订的 API 快照覆盖索引，**不是 final 成熟性认证、属性总量或以后无需复查的证明**；不跨日期缺口。GSC 每页最多 25000 行、每日最多 100 页、每次最多 366 天/100000 观测；响应体 8 MiB、账本 64 MiB，超限不提交。账本不是无限增长的平台，需要时由操作者另选私有目录归档。

## GSC 成熟候选与复查策略

- `--gsc-min-age-days` 默认 3，可配置 3..30，按 America/Los_Angeles 的**日历日龄**判断（不是固定小时数，跨 DST 仍以 PT 日期为准）。小于阈值不请求该日，标记 `partial / gsc_maturity_pending`；`days.recheckOn` 为达到阈值的日期。此下限是保守操作策略，**任意 lag 都不保证服务端 final 已可用**。
- 达到日龄后请求 final：整日无任何行（`{}` 或 `rows: []`）标记 `unavailable / finalAvailability: unknown`，run 为 `partial / gsc_final_unconfirmed`。不把暂缺与真空数据合并，不生成零、不删除旧行、不推进 confirmed coverage。本实现没有独立验证空日的能力，因此不提供 measured-empty 或空日完整性声明。分页中的终止空页只有在该日此前已拿到非空数据时才是正常耗尽信号。
- 非空响应允许 `finalAvailability: observed_nonempty`，测得 0 与没有行不同。run 的 `gscPolicy` 记录 `minAgeDays`、`recheckAfterDays`、`finality: not_guaranteed`；这只证明 API 当时返回数据，不证明不再修订。
- `--gsc-recheck-after-days` 默认 7，可配置 1..30。已请求的非空日和 unknown 空日均记录“本次 PT 日期 + 复查间隔”的 `days.recheckOn`。操作者须在该日期或之前显式 rerun 原范围，使用中数据仍需周期复查，不能只导入 checkpoint 之后的日期；旧范围也允许回填。没有 scheduler、后台自动请求或自动转成 final 的逻辑。
- 多日 run 中只要一天未确认，整个 run 不提交任何观测或 checkpoint；可用日仅在 run manifest 记录计数/摘要。存储层也拒绝伪装为 complete 的 GSC 空日。历史非空观测及旧 checkpoint 不因暂缺被破坏，但其含义仍是历史快照覆盖，不是本次已经重新确认。

## 页面 / 关键词研究缺口（未达生产研究就绪）

强制 SHA-256 保留身份关联，但无法查看/还原关键词、检索原始词文本、按语义聚类或搜索意图分析，也无法直接定位 canonical 页面做逐 URL 内容研究。这是实际功能缺失，不能把仅有哈希的统计称为可用的生产关键词/页面研究。CLI 明示 `researchReady: false`。

本次明确**延期 research mode**，不静默扩大采集，不增加原始 query 默认落盘或旁路映射。后续若单独授权，页面模式至少须限定经过验证的自有域名、canonical 公共页面且去除/拒绝 query string、fragment、身份信息及非公开路径；原始聚合搜索文本另需明确 opt-in、PII 处理/留存/访问策略后独立评审。当前不存在可开启此收集的 CLI flag，仍拒绝原始 page/query 写入。

## CLI

从仓库根目录显式传入参数；dry-run 不写文件、不联网：

```sh
node --import tsx scripts/seo-data/cli.ts --help
GSC_SITE_URL=sc-domain:fixture.example node --import tsx scripts/seo-data/cli.ts --source gsc --start 2026-11-01 --end 2026-11-05 --output /tmp/wp02-dry-evidence --dry-run
```

CLI 只读取所选来源的运行时环境变量；无 `--dry-run` 才请求读取接口。GSC 使用 `GSC_SITE_URL`、`GSC_ACCESS_TOKEN`；Umami 使用 `UMAMI_API_URL`、`UMAMI_WEBSITE_ID`、`UMAMI_ACCESS_TOKEN`，且必须通过 `--events` 明示已配置事件名称。token 应为调用时短期、只读授权；程序不获取或刷新 token。输出路径必须是专用用户私有目录，权限 `0700`，账本为 `0600`。支持显式 overlap/backfill 日期范围，不自动调度，也不会读取 checkpoint 后自行发请求。未经核验真实事件名称时，不应猜测。退出码：0 为成功完整读取或有效 dry-run，2 为未配置/不可用/partial，1 为参数或存储等拒绝；错误细节统一脱敏。

这里的 GSC“完整读取”仅指符合上述策略的非空 GSC API 可见快照，不保证 final 永不修订。dry-run 生成未经认证的请求计划，不验证来源能力；当前 Umami 只有首节规定的固定身份与双探针及逐事件全部通过才退出 0，否则保持非完整，不因计划可生成而成为 complete。

安全边界：Umami 仅接收显式 HTTPS origin（不允许路径、查询、userinfo、自定义端口、IP literal 或保留本地域名），来源请求固定到 aggregate 端点；fetch 使用 `redirect=error`，不接受跳转响应。部署者必须信任并核实配置域名及其 DNS；此处不实现 DNS pinning 或不可信同 UID 本地进程的沙箱。锁不自动过期；中断留下锁时，须先人工确认无写入进程，再处理私有目录中的 `.seo-data.lock`。无凭据读文件、无真实 IP/session/访客资料或原始搜索文本输出。

## 本轮纠正验证（2026-11-07）

- RED：新增回归先在旧实现得到 **6 failed / 31 passed**，日志 `/tmp/wp02-corrective-red.log`。修正 fixture 参数展开后，重叠 scope 的失败明确落在旧 checkpoint 未失效断言，而非无关输入错误。
- GREEN：**43/43 定向测试通过**，覆盖假定服务端钳制、GSC 新近/历史 final 暂缺、成熟候选/复查 PT 午夜边界、混合可用与 unknown 日的整批不提交、重叠事件空/非空快照失效及区间尾部保留、真实 partial 重叠 run 保留全部历史、GSC 维度顺序和 CLI 隐私边界。均为 fixture/mock，非 live 验收。
- 全量：**299 passed / 1 failed，49 files**。唯一失败仍是未修改的 `src/components/brand-marquee.test.tsx:68` 子进程测试：stderr 为空，未包含期望的 `Failed to copy standalone assets`。没有修复无关测试，也不把此前外部 287/287 覆盖成本轮通过。日志 `/tmp/wp02-corrective-unit.log`。
- TypeScript：`node node_modules/typescript/bin/tsc --noEmit --incremental false`，退出 0；focused lint：`node node_modules/eslint/bin/eslint.js scripts/seo-data tests/seo-data.test.ts --no-cache`，退出 0。
- 定向/全量最终命令均为 `node node_modules/vitest/vitest.mjs run [tests/seo-data.test.ts] --cache=false --config /tmp/wp02-validation.config.mjs --configLoader native`。临时配置仅把现有配置的 `__dirname` 换为同一仓库绝对路径，保持 React 插件、alias、环境、setup 和 test include；不用 bundle 配置加载器，避免共享 node_modules 临时写入。直接在原配置使用 runner 因 `__dirname is not defined` 启动失败，未修改项目测试配置。验证未安装依赖；TypeScript 禁用 incremental，ESLint/Vitest 禁用缓存，最终全量另设 `NODE_DISABLE_COMPILE_CACHE=1 TSX_DISABLE_CACHE=1`。
- 未执行真实 GSC/Umami/生产 DB 请求，未读密钥，未 build、commit、push、merge、deploy。外部旧版本验证仍单独记在报告开头；独立重审未执行，不宣称审查通过、Umami live verified 或 PR ready。

## 旧候选阶段验证记录（不是本轮验收）

- `pnpm exec vitest run tests/seo-data.test.ts --cache=false`：**30 passed**。含 PT/中国午夜、美国/欧洲/半小时 DST、分页、重复、403、429 重试上限、坏数据、无行/零/不可用、隐私键、原子 rename 失败、并发锁、区间缺口、digest 损坏和 dry-run 无网络/无写入/不泄漏 token（mock fixture，无 live 调用）。
- `pnpm exec tsc --noEmit --incremental false` 和最终 `pnpm typecheck --incremental false`：通过。
- `pnpm exec eslint scripts/seo-data tests/seo-data.test.ts`：通过。
- 首轮 `pnpm test --cache=false`：275 tests 中 274 passed、1 failed。失败位于未修改的 `src/components/brand-marquee.test.tsx` 的 copy-standalone-assets 子进程测试：断言期望 stderr 包含 `Failed to copy standalone assets`，实际 stderr 为空。未对无关测试或发布脚本作修改；不臆测失败根因。
- 最终 `pnpm test --cache=false`：**286 passed / 1 failed（49 files，48 passed / 1 failed）**，仍只有上述既有子进程测试失败；`pnpm exec vitest run src/components/brand-marquee.test.tsx --cache=false` 单独执行也复现同一失败（2 passed / 1 failed）。未宣称全量测试通过。
- `pnpm exec tsx scripts/seo-data/cli.ts --help`：当前 sandbox 拒绝 tsx IPC pipe (`listen EPERM /tmp/tsx-0/...pipe`)。改为 `node --import tsx scripts/seo-data/cli.ts --help` 成功；上述实际 GSC fixture property dry-run 命令成功生成五天请求计划，状态为无 token 的 `unconfigured`，`network=false,writes=false`，确认 `/tmp/wp02-dry-evidence` 不存在。没有伪装成真实数据。
- 未使用凭据、未调用 live GSC/Umami；代表性真实 API 集成仍待 Hermes 在授权环境外部执行并核对 Umami `event` 聚合响应形态、GSC property 权限以及输出路径权限。这不是已验证的 live sync 或生产发布。
- 初始 WP02 无 node_modules。本地仅创建 `node_modules -> /mnt/vscode/ricewind-wp01-pr/node_modules` 链接复用既有依赖；无安装、升级或共享依赖写入，Vitest 禁用 cache，TypeScript 禁用 incremental。该链接为本地验证辅助，不属于交付源码。没有 build、浏览器/E2E、commit、push、merge、cron 或 deploy。

## 旧候选阶段外部验证计划（历史记录）

以下是原计划：其中 GSC 2026-11-01 的外部只读验证已由授权方报告完成（见开头），不是本轮执行；Umami 能力仍未核实。即使后续 live 返回少于 limit，也不能据此解除本轮 partial 限制，必须另有目标版本的穷尽性证明和回归测试。

1. 在仓库外获得既有只读权限的短期 token，不把 token 写入命令行参数、报告、仓库或输出账本，也不读取 repo `.env`。
2. 在授权进程环境中设置所选来源的上述变量；先以真实 property/website 和一个确定已完整的历史日执行 dry-run，再移除 `--dry-run` 运行同一命令。至少一个代表性真实 API 必须完成，当前 fixture 测试不能代替这一步。
3. 检查 run status、timezone、dataState、days、completeness、观测计数及 CLI 输出 digest；对照来源后台和 API 的同范围/同维度结果。GSC 不用维度表求和当属性总量；Umami 复核 `endAt` 毫秒闭区间和 limit 行为。连续重跑验证相同 canonical key 无重复，再测试无 token 不覆盖 last-good。
4. 如果现有 Umami 仅提供内部 HTTP 或 username/password 登录，当前安全契约不会降级，也不会发现密码或登录。需由 Hermes 提供已授权 HTTPS origin 和 bearer token，或另行明确授权后续安全设计；本次不扩展范围。


## Hermes 外部验收补充（候选切片，非 WP02 整包完成）

- 正常权限外部全量376/376单元测试（51 files）、非增量typecheck、三份管道测试与实现定向ESLint通过。
- 使用严格主机密钥校验和现有授权建立短时SSH本地隧道，实际CLI读取2026-11-01上海完整日：product-view7、inquiry-click0、inquiry-success0。first/repeat均configured_events_exact，3观测1检查点；去token返回unconfigured/exit2且last-good和checkpoint不变；ledger0600。本次隧道已关闭。
- 三个明确白名单事件不代表所有事件、有效询盘、实际详情页浏览或成交。researchReady=false；原始page/query研究仍延期；GSC真实验收仅date维度样本，不宣称分页维度全量真实验收。
- 隧道切片独立复核覆盖显式opt-in/端口/redirect/dryrun/capability/失败保护/报告。唯一尾点URL疑点经独立Node22纯函数复现实测撤回：两例HTTPS尾点域名均被拒绝，URL解析保留尾点；未为误报修改代码。
- 本候选仅基础组件，未启用cron、未合并或部署；提交PR不授权生产发布。
