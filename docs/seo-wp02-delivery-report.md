# WP02 人工 webhook 告警交接 CLI

## 范围与事实边界

依赖 PR6（本树基线 `89a4eec`）的私有 runner 审计。只增加手动单次 transport、独立 receipt、离线测试；未改 runner-files 现有 API、collector、CMS、公开页面、七语内容、数据库、部署或调度配置。没有队列或新增依赖。

**transport 代码不是飞书送达。Hermes/飞书自动投递、真实宿主 webhook 验收、恢复通知和长期调度均未完成。** 本次没有调用真实 API、网络、凭据或生产 DB，没有注册 cron、启动服务、触碰 3000/3008/3108、build、commit 或 push。不读取 `config` 或 `.env`。宿主要求的 CPA `gpt-6.1-sol` 配置未读取、修改或验证，不能据本报告声称已切换模型。

## 使用约定

首先只查看帮助：

```sh
TSX_DISABLE_CACHE=1 node --import tsx scripts/seo-data/delivery.ts --help
```

默认无参数输出 help；提供参数但不带 execute 等同 dry-run。以下命令只校验文件和计划，不读取环境凭据、不联网、不写文件：

```sh
TSX_DISABLE_CACHE=1 node --import tsx scripts/seo-data/delivery.ts \
  --audit-dir /absolute/private/runner-UUID \
  --state-dir /absolute/private/delivery \
  --webhook-env WP02_WEBHOOK_URL --token-env WP02_WEBHOOK_TOKEN --dry-run
```

目录必须由操作者预先创建、当前 UID 所有、权限恰为 0700，位于仓库外，彼此不得重叠；所有路径组件拒绝 symlink。输入 `{started,result,diff,alert}.json` 必须是单硬链接、当前 UID 所有、0600 普通文件，单文件最多 64 KiB；严格 schema 与相互内容一致性校验，目录名须与 runner id 一致。不读 ledger/raw dimensions/property。

只接受 `report.evidenceKind=live_api` 且具备当前 scope/encoding/coverage/时间的结果。PR6 未形成当前 manifest 时会输出 null evidenceKind：本 CLI 保守拒绝，不能把它推断为 live。fixture 即使加 `--allow-test` 仍拒绝；测试中的合成 live metadata 仅用于注入 fake fetch 的离线验证，不得交给真实 webhook 或当作生产 runner 证据。本地私有审计是可信操作者输入，不提供密码学来源证明。

仅显式 `--execute` 才从 `--webhook-env` 指定的进程环境变量读取 endpoint；可选 `--token-env` 指定 Bearer token 环境变量名，指定但缺值时拒绝。值不通过 argv、不写盘、不输出、不自动发现其他变量。成功且 reasons 空时返回 `not_required`，无凭据读取、网络或写入；不一致的空 reasons 拒绝。

宿主独立授权验收时，才可在上述命令移除 dry-run 并增加 execute。`--execute --allow-test` 仅用于基于真实合格审计的显式送达演练，payload 标为 `delivery_test_not_production_alert`，与 `live_alert` 分开幂等域；不是伪生产告警。CLI 没有内建飞书签名/卡片协议，不保证任意飞书机器人接受通用 JSON。

## Transport 与安全限制

- 注入 `fetcher`/`resolveHost`/`sleep` 供离线测试。真实入口默认使用 fetch，生产 DNS 预检全部解析地址；测试只用 fake fetch 与假 DNS，无真实网络。
- 仅 HTTPS 公网 IPv4 或域名；无 userinfo/query/hash（含空 `?`/`#`）、非443端口，拒绝回环、私有、链路本地、共享地址、保留地址及本地域名；IPv6 保守全拒绝。请求 `redirect=error`，不跟随跳转，`credentials=omit`。
- DNS 校验和 HTTP 请求共用 deadline；默认 5000ms，可显式 10..30000ms。默认仅尝试一次，`--max-attempts 1..3`；仅408/425/429/500/502/503/504、超时和列举的临时连接错误重试，100/200ms 有界等待。401/永久错误/重定向拒绝不重试。晚到的 DNS 结果不会触发发送；忽略 abort 的 transport 可能在超时后完成，不能保证取消远端效果。
- 不读取响应正文，取消响应 body，不输出响应错误/endpoint/token/raw dimensions/property。stdout、payload、receipt 仅脱敏枚举、窗口、hash、receipt 状态；pending 不能称为送达。
- **不担保 DNS 重绑定**：预检后 fetch 会独立解析；没有地址钉扎，宿主仍需出站网络策略和可信目标。也不保证同 UID 恶意并发进程、上级目录恶意替换或文件系统故障下的绝对隔离。

## Receipt、重试与人工恢复

稳定 idempotency key 来自规范化审计摘要、目标 URL hash 和模式（不含 token）；Bearer token 轮换不改变 key，目标或模式变化会产生新 key。POST 同时携带 `Idempotency-Key` 与 payload key。**语义为 at-least-once，不是 exactly-once**；接收端必须自行实现幂等。请求成功后、写 ack 前崩溃可能造成重复。

使用 state 目录 `.seo-delivery.lock` 独占锁，并持续持有 fd 防止 inode 被快速复用；每次请求及发布前后复核 owner/mode/inode。先原子发布 `<key>.pending.json`，只有 HTTP 2xx 才另建 `<key>.acknowledged.json`。`acknowledged` 仅代表 HTTP 接收，不代表飞书业务成功、人已读或已处置。保留 pending 是追加审计，不覆盖旧 receipt；重复有效 ack 不发送。**不会改写 runner 原始 alert.json**。

正常 HTTP 失败保留 pending、释放自身锁，下次同审计/目标/模式重用 key。读取损坏 receipt、锁替换、发布/sync 错误等异常保留锁/临时证据，fail-closed；绝不自动按 PID/时间清理崩溃锁。操作者须暂停该 state 新触发，核查持有进程、锁、pending/ack、临时文件与接收端幂等记录，备份后人工处理，才能同键重试。无法确认远端接收时不能直接宣称未送达。文件写入 fsync 后硬链接不覆盖发布，目录 fsync；不作跨设备/掉电/宿主文件系统持久性保证。

退出码：0 表示计划、无需告警或已 HTTP acknowledged；2 表示尝试后仍 pending；1 表示参数/安全/审计/状态拒绝，需要人工核查，可能已存在远端效果。

## 验证记录

先运行既有 runner help；新 CLI 实现后首先运行 delivery help。TDD 首次 RED 为模块缺失（`/tmp/wp02-delivery-red.log`）；PR6 coverage 词表与非临时 TypeError 重试测试先 RED 再 GREEN（`/tmp/wp02-delivery-contract-red.log`）；损坏 null ack 测试先 RED 再修复缺失值/JSON null 混淆（`/tmp/wp02-delivery-receipt-red.log`）。未修改或跳过既有测试来规避失败。

验证命令（均不 build，不调用生产依赖）：

```sh
./node_modules/.bin/vitest run tests/seo-data-delivery.test.ts tests/seo-data-delivery-io.test.ts tests/seo-data-runner.test.ts tests/seo-data-runner-safety.test.ts tests/seo-data-runner-io.test.ts
./node_modules/.bin/tsc --noEmit --incremental false
./node_modules/.bin/eslint scripts/seo-data/delivery*.ts tests/seo-data-delivery*.test.ts tests/fixtures/seo-delivery-cli.ts
git diff --check
```

覆盖 first/repeat/fail+retry、401不重试、timeout、并发锁/换锁/真实子进程崩溃、秘密响应脱敏、fixture拒绝、默认dry-run无凭据访问、真实 CLI spawn help/dry-run/无凭据execute，以及注入transport的真实子进程execute/repeat。另覆盖DNS私网/混合解析/超时、所有权、宽权限、symlink、硬链接、超大/schema不符、原子发布失败、损坏receipt等。

额外换锁 RED（`/tmp/wp02-delivery-lock-red.log`）确认 DNS 等待后应再次验证锁，锁内容原地损坏也必须拒绝；实现已补身份内容校验与实际 fetch 前的锁复核。

最终结果记录在本文验收结果小节；日志保留 `/tmp/wp02-delivery-{focused,typecheck,lint,help}.log`。未跑 full suite，不反复触发历史 full EPERM；build 与真实 Hermes/飞书接入由宿主后续独立验收。

## 验收结果

| 检查 | 本树实际结果 |
| --- | --- |
| runner / delivery help | 已先后执行，退出0；无真实网络/凭据 |
| focused 5 文件 | **122/122 passed**，其中 delivery 72 项、既有 runner 50 项；包含真实 CLI 子进程与崩溃测试 |
| 非增量 TypeScript | `tsc --noEmit --incremental false` 通过 |
| 定向 ESLint | 三个新增源码、两个测试及 CLI fixture 通过，0 errors / 0 warnings |
| diff whitespace | `git diff --check` 及新增文件逐一 whitespace 检查通过 |
| 未验证 | full suite、build、真实 webhook、Hermes/飞书、生产API/DB、恢复通知、长期调度；均不属于本次已完成验收 |

源码及文档仅在本独立 delivery 树新增，未提交、推送或修改宿主生产配置。以上测试通过不等于真实送达或 production accepted。

## 2026-11-10：仅修复 timeout 测试并发时序

本节补充并更新上文 full suite 未验证的历史记录。此次仅修改
`tests/seo-data-delivery.test.ts` 的忽略 abort 超时用例及本报告；不改生产实现、
API、timeout、重试次数、测试配置或依赖，不执行 build、真实网络调用或提交。

### 复现与原因

- 宿主已报告原样全量 606/607，目标用例预期 fetch 两次、实际一次。
- 本环境修改前先执行原样 `pnpm test`：606/607，目标用例通过，未再次观察到
  宿主目标失败；唯一失败为既有 `src/components/brand-marquee.test.tsx:68`，
  stderr 为空，未包含预期的 `Failed to copy standalone assets`。不将其归因为
  已确认的 EPERM，也不修改此无关测试。
- `boundedRequest` 的 deadline 从 DNS/锁复核之前开始，覆盖 DNS、异步
  `assertLock()` 和 fetch。原用例注入 fetch 且未注入 resolver，因此不做真实
  DNS；并发负载下异步文件系统锁复核可能耗尽真实 10ms，某次尝试尚未 fetch
  就超时，故两个 attempt 不保证两次 fetch。这是测试时序假设不成立，不能用
  放宽次数断言或增加生产 timeout 掩盖。

### 隔离方式与保留断言

- 仅在目标用例内 fake `setTimeout`/`clearTimeout`，`finally` 恢复真实时钟；
  文件系统保持真实，不启用自动推进，等待每次 fetch 真正进入后才推进时钟。
- 显式注入立即返回公网地址的确定性 resolver，每次尝试验证解析/发送次数。
  每次推进 9ms 断言未 abort，再推进 1ms 断言已 abort；fetch 永不 resolve，
  仍须被 deadline 截断并重试，最终严格断言两次 fetch、同一请求 headers、
  一次 100ms retry backoff、退出码 2、pending receipt、无残留 timer。
- 独立 DNS deadline 用例原样保留：解析挂起超时，随后返回公网地址仍零发送。
  不改变生产 DNS 安全校验、锁复核或重试语义。

### 实际验证

| 命令 | 结果 / 日志 |
| --- | --- |
| 修改前 `pnpm test` | 606/607；仅上述既有 brand-marquee 失败；`/tmp/wp02-delivery-timeout-before.log` |
| `pnpm exec vitest run tests/seo-data-delivery.test.ts` | 66/66；`/tmp/wp02-delivery-timeout-focused.log` |
| 修改后原样 `pnpm test` | 606/607，63 文件中 62 通过；delivery 全部通过，仅同一既有 brand-marquee 失败；`/tmp/wp02-delivery-timeout-full.log` |
| `pnpm exec tsc --noEmit --incremental false` | 退出 0；`/tmp/wp02-delivery-timeout-tsc.log` |
| `pnpm exec eslint tests/seo-data-delivery.test.ts` | 退出 0；`/tmp/wp02-delivery-timeout-lint.log` |

全量未全绿，不宣称 607/607；宿主须在其环境重跑原样 `pnpm test` 确认。

## 最新宿主验收与旧审查收敛

宿主最终全量63文件607/607、定向lint、标准pnpm build与standalone资源、构建后非增量typecheck均通过。旧审查P1 completeness已改为runSchema.shape.completeness，P2未知TypeError不默认重试，相关回归保留；源码指纹与最终宿主门禁一致。此前沙箱brand-marquee失败和旧时序测试失败保留历史，不是最新宿主阻断。真实审计delivery dry-run已验证planned/network=false/writes=false/credentialsInspected=false，尚无真实webhook/飞书送达。HTTP2xx不代表飞书业务成功或人已读，恢复通知/持续调度/生产部署均未完成。
