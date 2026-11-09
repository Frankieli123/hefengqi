# WP02 手动只读采集执行器

日期：2026-11-09。工作目录：`/mnt/vscode/ricewind-wp02-runner`。基线：`9af1db9cb27fe32795f386ac205e835acb4baa11`，本轮未 commit/push/merge。PR5 hosted CI 全绿是用户提供的基线背景，不是本候选已经通过 hosted CI 的证明。

## 结论

本次交付新增一个**手动触发、单次、有限窗口、只读**的 runner。它复用现有 `scripts/seo-data/cli.ts`、适配器、隐私编码、成熟度、scope、exactness、last-good 和 ledger 契约；没有复制适配器，也没有 shell 任意命令、cron、队列、worker、应用数据库、邮件或 webhook 发送。

`runner 可运行 ≠ 持续运行 ≠ production accepted`。runner 只表示本地代码路径可按规则执行；它不是持续服务，不是生产验收，不代表真实 GSC 授权、宿主配置、数据最终性或业务增长。当前 `qualified` 固定为 `unknown`，fixture 证据永远不会冒充 live。

## 使用边界

先看帮助（无网络、无写入、无环境/凭据读取）：

```sh
TSX_DISABLE_CACHE=1 node --import tsx scripts/seo-data/runner.ts --help
```

预演必须显式完整参数和 `--dry-run`；它不会建立目录、锁、审计文件或读取 token：

```sh
TSX_DISABLE_CACHE=1 node --import tsx scripts/seo-data/runner.ts \
  --source gsc --start 2026-03-07 --end 2026-03-08 \
  --output /private/operator/wp02-evidence --dry-run
```

真实执行必须额外显式 `--execute`。GSC token 只允许来自进程环境 `GSC_ACCESS_TOKEN`，Umami token 只允许来自 `UMAMI_ACCESS_TOKEN`；不使用 dotenv、不扫描文件、不从 argv 接收 token。真实授权 GSC 由宿主人工另行运行，本任务没有调用真实 API。

`TSX_DISABLE_CACHE=1` 用于同时关闭启动器自身的磁盘缓存；runner 库的 help/dry-run 路径本身不写入。库入口为 `runBounded(input)`，CLI 入口为 `runnerCli(args, environment?, fetcher?, now?)`。显式注入 HTTP fixture fetch 时，沿用 collector 的 `evidenceKind=fixture`，不可作为 live 授权或采集证明。预演只做参数/日期/私有路径验证，不检查实际配置和凭据。

`--gsc-research` 仅沿用已有私有 raw page/query 路径，必须使用仓库外私有目录；普通模式仍为 SHA-256 identity。GSC 与 Umami 的既有 privacy、scope、成熟度、exactness、last-good 和不确认空数据规则不变。

## 状态、并发与恢复

- 输出目录必须是绝对路径、仓库外、owner-only `0700`；ledger、锁和 runner 审计文件为 `0600`，拒绝 symlink、hardlink 和宽权限。审计文件绝不覆盖；ledger 仍按原契约原子更新，而非禁止正常更新。
- `.seo-runner.lock` 是 fail-closed 互斥锁；已有 `.seo-data.lock` 也在请求前阻断并记录人工复核原因。竞争锁或崩溃残留不会自动删除，必须人工核查；没有宣称目录断电持久性。
- 每次执行产生 `runner-UUID/{started,result,diff,alert}.json`；审计发布使用独占临时文件、文件 sync 和原子 link，不覆盖其他执行结果，只清理本次创建且 inode 匹配的文件。临时 link 清理失败时撤下仍属于自己的未完成发布，残留仅供人工复核，不自动清扫其他文件。
- `result.json` 是最后发布的完成记录。Hermes 必须拒绝缺失结果、`started` 未完成状态、非私有/非普通文件、symlink/hardlink 或有发布残留的记录；仅凭 diff、alert 或目录存在不能计成功。目录需专用于此 runner，勿让另一个 standalone collector 同时写入。
- `complete` 以外的 `partial`、`unavailable`、`unconfigured`、失败和未知都不能算成功；锁所有权丢失也输出失败，而非成功。失败/partial 会保留原有 observations/checkpoints，ledger 可追加失败运行审计，不等于整个 ledger 文件字节不变。`successful=true` 只表示本次采集完整，不表示 live/生产验收。
- collector 已有 HTTP 重试；runner 不重试整次采集，`--max-http-attempts 1..3` 只是共享该总尝试预算，避免重试乘法。重试限于 HTTP 408/429/500/502/503/504 与明确列举的临时 transport/timeout 错误；401/403、501/505、payload 错误及未知异常不重试。每次 HTTP 有既有 15 秒 timeout、最大退避 5 秒；仍保留 366 来源日、分页、行数和 exact Umami 请求上界。

人工恢复：先暂停该目录的新触发，核对锁的 id/PID/startedAt、宿主进程及审计结果，检查 ledger 完整性和权限；确认不再有持有者后，由操作者备份并处理残留锁/临时文件，再以新执行 id、显式窗口重跑。runner 不代替人工执行清锁操作；不得因锁旧就假设可删。私有目录须由可信操作者维护，不提供对抗同 UID 恶意进程或目录断电丢失的保证。

## 差异与告警

差异报告只包含来源、窗口、scope hash、encoding、evidenceKind、coverage、计数和内容 hash。只有相同 source/scope/encoding/evidenceKind/窗口/完整性才比较；不兼容窗口不比较。新增、缺失、内容变化只表示 presence/content change，不表示增长；partial 不计算伪变化。token、raw page/query、property、labels、完整 URL 和个人级数据不进入报告或 stdout；GSC aggregate 不 join 个人。

内容 hash 排除随机 runId；比较前验证两边完整快照的行数和 digest。原 ledger 不是历史观察快照库：如果中间一次重叠回补已经替换旧运行的部分行，返回 `snapshot_not_available`，不会拿混合时间的行冒充旧快照。

告警是本地待交付 manifest：`delivery=pending`、`transport=not_sent`、`sent=false`。缺配置、partial、failed、unknown、stale 使用实际 ledger 时间，不接受 `--configured` 声明。本任务不调用飞书、webhook 或其他通知渠道；后续 Hermes 可读取 manifest 后发送，并不得把 pending 宣称为已送达。

## 验证记录

TDD：先新增失败用例确认 runner 模块缺失（`/tmp/wp02-runner-red.log`），再实现；随后新增永久 HTTP 状态、锁所有权丢失、collector 残留锁和文件发布故障的 RED 测试，再修复。未修改、skip 或削弱既有测试/应用源码来规避失败。

| 检查 | 本轮实际结果 |
| --- | --- |
| CLI `--help` | 现有 collector 和新 runner 均先执行；真实 CLI 子进程亦覆盖 help/dry-run/缺 token 非 0 退出 |
| 离线依赖 / Prisma | `/tmp` 离线 pnpm store，本树安装，未跨树 symlink node_modules；Prisma 使用复制到 `/tmp` 的引擎缓存生成，未连接 DB；初始只读缓存错误日志保留 |
| 最终 focused | 8 文件 **220/220 passed**，含 runner **50/50** 及既有 GSC/research/Umami exact/tunnel/attribution；`/tmp/wp02-runner-collector-focused.log` |
| `pnpm typecheck` | 通过；`/tmp/wp02-runner-typecheck.log` |
| `pnpm lint` | 通过，0 errors / 8 既有 warnings；最终修改文件另做 focused lint 通过，见 `/tmp/wp02-runner-lint.log`、`/tmp/wp02-runner-focused-lint.log` |
| `pnpm test` | 仅跑一次：**525 passed / 1 failed**（526 总计）。唯一失败为既有 `brand-marquee` 的子进程沙箱 EPERM/空 stderr；随后补充的故障用例由最终 focused 验证，不为重复撞 EPERM 再跑 full；`/tmp/wp02-runner-full-unit.log` |
| 标准 `pnpm build` | 使用独立 `NEXT_DIST_DIR=next-wp02-runner-build`、清空业务配置的 env、Node heap 4096 MiB；停留在 Turbopack `Creating an optimized production build` 无后续进展，人工中断退出 **130**。未通过，未确认根因，必须宿主复跑；`/tmp/wp02-runner-build.log`。本轮新生成的隔离构建目录已清理，既有记录未删除 |
| `git diff --check` | 通过；未提交、推送、合并或触发 hosted CI |

runner 50 用例覆盖 dry-run 无凭据读取/写入、显式 execute、HTTP fixture evidence、两次去重、重叠回补、partial 保留 last-good、缺 token、Umami 每次重新 probes、日期 DST、锁竞争/崩溃/所有权丢失、发布/sync/open/cleanup 故障、权限/symlink/hardlink、脱敏与总重试预算。真实 Node 子进程由私有临时文件捕获输出，避免本沙箱 pipe 丢输出，不替换或跳过真实入口断言。

本轮没有连接真实 API/DB、读取真实凭据、启动 worker、使用 3000/3008/3108、修改生产、安装 cron 或发送告警。保留原树记录及 `/tmp/wp02-runner-*.log`、本次 fixture 审计目录。宿主下一步：复跑 full unit 与标准 build，按授权配置人工运行真实 GSC，再由 Hermes 审阅报告并单独交付通知。本次未验证或改变宿主默认 provider `cpa/gpt-6.1-sol`；该宿主校验仍待 Hermes/操作者完成，不能据此声称生产 accepted。

## 最新宿主与独立审查验收

宿主外部完整单元61文件535/535通过，标准pnpm build与standalone资源验证、构建后非增量typecheck通过。此前沙箱全量失败和构建中断保留为历史，不再是当前门禁结果。独立只读审查无阻断；独立禁缓存runner50/50、相关208/208通过，三个runner源码SHA256与审查一致。真实授权API runner、告警送达及持续运行尚未验收，pending/not_sent不等于送达；未启用cron、未生产迁移或部署。
