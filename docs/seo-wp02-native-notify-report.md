# WP02 一次性原生飞书告警 CLI

日期：2026-11-10。基于 PR7；仅新增 CLI、一个固定传输辅助模块、专项测试和本文。
不修改 PR7 runner / delivery / schema / files API，不接入页面、数据库或七语内容。
Hermes 应显式调用这个 bounded CLI，不是 worker、队列、cron 或自动恢复系统。

## 使用边界

```sh
TSX_DISABLE_CACHE=1 node --import tsx scripts/seo-data/native-notify.ts --help
TSX_DISABLE_CACHE=1 node --import tsx scripts/seo-data/native-notify.ts \
  --audit-dir /private/seo/runner-UUID \
  --state-dir /private/native-notify-state \
  --chat-id oc_APPROVED_CHAT --dry-run
```

以上路径与 chat 均为占位符。目录必须由宿主预先建立：仓库外、当前用户所有、0700、
无 symlink、互不重叠；输入文件与回执必须为0600、单硬链接、当前用户所有。
默认无参数仅 help；指定参数但不带 `--execute` 等同 dry-run。
help / dry-run 不访问环境凭据、不解析 DNS、不发请求、不加锁、不写文件。
dry-run 会读取并校验显式输入目录，不会创建缺失目录。

真正执行须在同一命令显式提供 `--audit-dir`、`--state-dir`、`--chat-id` 与 `--execute`。
凭据只能由宿主安全注入环境 `FEISHU_APP_ID` / `FEISHU_APP_SECRET`，不放 argv，
不读取 dotenv、凭据文件、其它 profile 或默认 chat。不要把真实值写入本文或日志。
本次开发与测试未读取任何真实凭据、未发真实网络请求。

不接受 endpoint / token-env / allow-test / raw / max-attempts 等绕过参数。
固定请求为飞书官方域名 `open.feishu.cn` 的两个 HTTPS API：
`/open-apis/auth/v3/tenant_access_token/internal` 与
`/open-apis/im/v1/messages?receive_id_type=chat_id`。
禁止 redirect；只解析固定 host，保守拒绝空、私网、混合和 IPv6 DNS 结果。
DNS 预检不提供地址绑定，也不宣称能防 DNS 重绑定；TLS 仍校验官方 hostname。
单次总网络 deadline 默认5000ms，`--timeout-ms` 范围10..30000，覆盖 DNS、
锁复核、token、send 和两者响应体；不是每一步重新计时。
每个响应体上限64KiB；异常文本、响应 `msg`、token、endpoint、卡片和搜索词不输出或持久化。

## 审计与卡片

完全复用严格 `validateDeliveryAudit` 和私有文件读取：`started.json`、`result.json`、
`diff.json`、`alert.json` 必须一致，目录名必须匹配 runner ID。
只接受可确认的 `live_api`；fixture / null / 未知证据拒绝，即使是测试也无生产豁免开关。
额外拒绝 `raw_page_query_private`，不会读取私有搜索账本。
源 alert 保持 pending / sent=false，不被通知程序修改；通知确认只在独立回执中。

卡片用纯文本元素展示真实 `reasons`、source、status、window、告警 ID、scopeHash、
auditHash 和 coverage；明确“数据缺失不等于零”“平台接收不代表已读”。
不发送原始查询/页面、原始响应或恢复结论。无 reasons 直接 `skipped_no_reasons`，
不读取凭据、不发网络、不写状态，也不能把它解释为故障已恢复。

## 幂等与确认

- 告警 ID 取严格校验的 runner `result.id`；目标摘要为 chat ID 的 SHA-256。
- key 由告警 ID + 目标摘要 + 固定协议种类派生，uuid 为该 SHA-256 的前32个十六进制字符。
- payloadHash 绑定卡片、uuid 与目标摘要；同 ID/target 但 payload 变化拒绝，不能覆盖旧回执。
- `native-KEY.pending.json` 必须原子发布并 fsync 后才允许 token/send。
- token 必须 HTTP200、数值 `code=0` 且 token 非空；失败不能调用 send。
- send 必须 HTTP200、数值 `code=0`、有效 `om_` message_id 且 chat_id 精确匹配目标。
- HTTP200 业务非0、其它 HTTP 状态、坏 JSON、缺字段、超大响应、超时、网络异常均保留 pending，绝不套用 PR7 HTTP2xx ack。
- 确认回执包含 `messageId`、`businessCode: 0`、时间与 `platform_accepted_not_read`，不是 human_read。
- 同 payload/target 已确认时，不读取凭据、不解析 DNS、零网络返回 `already_acknowledged`。
- 不同目标独立 key/uuid/回执；pending 重试保留原 createdAt、payloadHash 和 uuid。

不做整轮或请求自动重试（最多一次 token + 一次 send）。发送结果未知时可以由宿主在复核后
重新调用同一输入，复用 uuid；平台去重窗口及跨窗口行为须宿主核实，不承诺 exactly-once。
退出码：0=planned/skipped/platform_accepted/already_acknowledged；
2=未获平台确认、pending；1=参数/审计/凭据/状态拒绝，可能需人工复核。
所有 JSON 输出均带 `recovery: not_evaluated`，CLI 不输出原始异常细节。

## 文件安全与异常处理

复用 PR7 `privateDirectory` / `readPrivateJson` / `deliveryLock` / `publishReceipt`：
O_NOFOLLOW、O_EXCL、owner/mode/nlink/大小/身份检查、锁身份内容复核、
临时文件 fsync、硬链接不可覆盖发布、目录 fsync。
沿用 `.seo-delivery.lock`，与同状态目录的 PR7 delivery 互斥；建议使用单独 native 状态目录。
每次 HTTP 请求前（含 DNS 等待后）、确认发布前和正常释放锁前重验锁。
正常未确认可释放锁但保留 pending；锁替换、目录替换、坏回执、发布碰撞或残留临时文件
fail-closed，不自动删除或修复证据。人工核实平台消息和文件身份后再决定恢复，
不要盲删锁、pending 或 acknowledged，也不要修改源 alert 伪造已送达。
回执与审计仅在本地信任边界内校验，不是平台签名证明。

## 测试接口与验收

导出 `nativeNotifyCli(args, {fetcher, resolveHost, environment, now})`，
其中 resolver 只能接收固定 hostname，不能返回其它 endpoint。
真实入口不接受测试开关；`tests/fixtures/seo-native-notify-cli.ts` 独立注入 fake fetch、
fake DNS、fake env 与固定时间，并将 global fetch 替换为拒绝函数。
测试中的 live_api 元数据是合成的校验样本，只配合 fake transport，绝非真实送达证据。

TDD：先新增测试、确认缺失入口 RED（`/tmp/native-notify-red.log`），再实现。
首次子进程测试遇到管道 EPERM，沿用既有测试的私有文件描述符方式，不跳过断言。
未运行 build，未生成 Next.js / Prisma 产物补齐检查。

### 本树实际验证结果

| 检查 | 结果 |
| --- | --- |
| `TSX_DISABLE_CACHE=1 pnpm exec vitest run tests/seo-data-native-notify.test.ts tests/seo-data-delivery.test.ts tests/seo-data-delivery-io.test.ts tests/seo-data-runner.test.ts tests/seo-data-runner-io.test.ts tests/seo-data-runner-safety.test.ts --cache=false` | 6文件、171/171通过；其中 native 49 项；`/tmp/native-notify-focused.log` |
| `pnpm exec eslint scripts/seo-data/native-notify.ts scripts/seo-data/native-notify-transport.ts tests/seo-data-native-notify.test.ts tests/fixtures/seo-native-notify-cli.ts` | 退出0，无 errors/warnings；`/tmp/native-notify-lint.log` |
| `pnpm exec tsc --noEmit --incremental false` | 退出0；本树未遇到生成类型缺失，无需 build；`/tmp/native-notify-tsc.log` |
| 默认 help / dry-run / 缺凭据 execute、独立 fake fixture execute / duplicate | 真实 CLI 子进程断言通过；无真实网络 |

专项覆盖：成功/重复、业务失败/HTTP失败/token失败、坏响应/超大响应、凭据与响应
secret 不泄漏、fixture/未知/raw 拒绝、不同 target 隔离、payload 变化拒绝、锁替换/
原地破坏、目录替换、权限/ownership/symlink/hardlink、坏/孤立回执、原子发布碰撞残留，
以及 resolver/fetch/body 超时、token+send 共享 deadline、未知发送后同 uuid 重试。
未跑全量、build 或真实飞书；通过 fake 测试不代表 production accepted。

## 待宿主独立验收

1. 审查源码与本报告；重跑 focused / 定向 lint / 非增量 tsc，必要时由宿主另行全量验收。
2. 本次禁止真实网络，未联网核对飞书最新契约；宿主须确认应用权限、机器人入群、
   目标 chat、卡片兼容性、message_id/chat_id 返回和 uuid 去重有效期。
3. 在获授权的隔离真实 live 审计上先 dry-run，检查目录权限与摘要，再受控调用 execute，
   核对群内卡片和平台 message_id / businessCode0 回执；这不等于成员已读。
4. Hermes 只显式调用 bounded CLI，按退出码处理，不接入轮询、后台 worker 或无界重试。
5. 本次不做恢复判定。必须具备先前**已送达故障**，以及**同 scope/window 真实恢复证据**，
   才能作为另一项任务设计和独立验收恢复通知；空 reasons、无历史或 fixture 均不成立。

未 commit/push/build、未配置 cron、未访问生产 DB、未读真实凭据或真实网络。

## 宿主最终验收
64文件656/656测试、定向lint、标准build及standalone验证、构建后非增量tsc均通过。首次因跨树node_modules软链触发Turbopack拒绝；复制本树依赖后原样重跑成功。真实hash审计dryrun通过；raw研究审计拒绝。真实历史日级partial审计首次execute平台接受，重复already_acknowledged；独立pending/ack均0600，ack业务code0，平台读取API已验证message_id及当前chat一致。仅证明历史告警已发送与重复抑制，不代表已读、最新网站故障、恢复通知或长期调度；无cron、生产DB写入或部署。凭据仅通过SSH stdin临时注入env，未复制配置或写入argv/磁盘。
