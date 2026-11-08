# WP02：GSC 私有研究切片本地报告

日期：2026-11-08。仅编码与离线本地验证，不是发布报告。

## 基线、范围及门禁

- 原 PR2 树 `/mnt/vscode/ricewind-wp02` 与本树初始 HEAD 均为用户指定的已通过 CI SHA `02aafe42362b9919aa51658255769d90abaca03b`。本树分支为 `feat/ricewind-wp02-research`，开始时干净；使用宿主已创建的 worktree，没有再次创建或修改 Git 元数据。
- 历史初始记录：原树当时仅有未跟踪 `.wp02-final.txt`，记录的 SHA-256 为 `894dce9b765101a05d0072aee53b61fa44c32af236d4eef5be9ab736392834ae`。此次独立 review 整改未读写原树，不重新确认其当前 hash，也不推断后来不同 hash 的修改者或原因；没有向原 PR2 树写入代码或依赖。
- 旧 PR2 提供默认哈希 GSC、成熟期/空 final 未确认/分页/重复/last-good 保护、Umami exact 与本地 loopback 显式授权。此次仅扩展 `scripts/seo-data/`、相关测试和本文，不改站点、CMS、API、七语内容、部署或调度。
- `researchCapable`：此切片具备显式私有 GSC 收集与离线摘要能力；`local`：下述本地验证；`mock`：fixture 证据，不是线上证据；`live`：未验证，留给 Hermes 在后续单独授权后执行。**整个 WP02 的 `researchReady` 仍为 false**，不得从本报告推断生产研究就绪。
- 未 commit、push、merge、部署、调用真实 API、读取真实凭据、操作生产数据库或 cron，也未 HTTP fetch 页面。

## 显式隐私模式

默认 `sha256_page_query` 不变。仅 GSC 允许 `--gsc-research`，启用后为 `raw_page_query_private`。**本模式保留查询/URL，可能敏感，并非匿名化**；哈希也只是身份键，不承诺不可逆匿名化。

- 原文只进入私有 `ledger.json`；收集 CLI 不输出原始响应、页面或查询，错误详情统一隐去。不将服务端返回的查询写入日志、源码或 Git。
- 研究账本不得与任何普通 GSC/Umami 记录混写，双向拒绝；包括 partial/unconfigured 记录，不能通过空跑改变目录隐私模式。不同模式必须使用不同目录。fixture/live 混写保护保留。
- 新研究编码进入 scope 与 row 身份；替换条件显式比较编码。默认 GSC/Umami 使用既有隐含编码与键格式，以保持旧账本 digest、scope、row 和 checkpoint 兼容，不迁移、不假造研究覆盖。旧哈希事实不可能恢复为明文。
- 读取同时检查 schema、digest、重复、来源/编码及观察值与 manifest 的匹配。伪装成哈希的明文或混合编码拒绝，不尝试“修复”旧文件；冲突 run ID 拒绝。digest 用于完整性校验，不是签名或对恶意本地用户的真实性证明。
- 沿用目录 `0700`、文件 `0600`、符号链接/硬链接限制、文件大小边界、写锁与原子账本替换；研究目录还必须在 Git 工作区之外。符号链接路径与源码/公共/运行时路径拒绝。宿主沙箱的空 `.git` 防护占位目录没有 HEAD，不当成实际仓库；真实 `.git` 目录有 HEAD、worktree 的 `.git` 文件均拒绝。
- 实际记录保留期限、备份和人工清理由用户掌控；没有按时间自动删除账本或报告。运行中失败写入产生的临时文件仍按既有原子写协议清理，不涉及真实历史记录 retention。

## 页面与查询边界

- page 必须是合法、标准序列化一致的完整 http/https URL，禁止 userinfo、query、hash，包括空 `?`/`#`。严格拒绝空白、反斜杠/点路径等需要 URL 规范化才能接受的形式，不偷偷 strip 或合并身份。
- `sc-domain:` 精确域名或点边界子域；URL-prefix property 要求同 origin 并匹配完整前缀。仅接受本次显式配置、API 请求所针对的 property 内的 page。授权真实性仍依赖后续真实 GSC 只读 token/API 验证，本地 mock 不证明账号权限。
- 任一异常 page 使整次 run 为 partial，清空本次观察值；不覆盖旧事实、不推进 checkpoint。该校验也适用于默认哈希收集，避免先 strip 再 hash 的错误身份。原测试中“带 query page 可 complete”的断言因此改为 partial，未修改无关测试。
- query 可保留原始字符串，不 trim、不执行；长度 1..2048，拒绝 C0/C1 控制字符。它是**不可信数据，绝不是指令**。没有硬编码关键词或 PII 正则冒充安全筛选。JSON 导出不是 HTML 页面，不应作为 HTML、Shell 或模型指令执行。
- 继续保留 GSC 成熟期、空 final unknown、分页边界、重复、重试/失败与 last-good 语义。研究 partial 不保留新观察值；历史完整观察值仍保留。Umami 收集和 loopback 授权策略未改。

## 收集、摘要与人工导出

```bash
node --import tsx scripts/seo-data/cli.ts --help
node --import tsx scripts/seo-data/research-cli.ts --help
```

收集必须显式 `--source gsc --start ... --end ... --output /外部私有目录 --dimensions page,query --gsc-research`。实际运行仍需要由操作人安全提供短期只读环境配置，本次未使用。`--dry-run` 仅校验和生成未认证计划：网络 0、写操作 0，不创建目录/锁/账本；会提示编码、敏感风险、非匿名化及用户掌控 retention。它允许只读路径检查，不代表零文件系统读取。

收集 CLI 返回安全 scope hash，可用于后续明确选择；收集内部采用注入 fetch 的离线 fixture 会标记 `fixture`，不能伪报 live。

```bash
node --import tsx scripts/seo-data/research-cli.ts \
  --ledger-dir /外部私有目录 --scope 同一scope的64位hash --source gsc \
  --encoding raw_page_query_private --evidence-kind fixture \
  --start 2026-03-07 --end 2026-03-08
```

也提供 `summarizeResearch(output, selection)` 与 `exportResearch(output, selection, destination)`。摘要是只读操作，不修改 ledger/checkpoint，不请求网络：

- 显式选择同一 scope、时间范围、GSC 来源、编码与 fixture/live；scope 包含 property、provenance 和完整维度集合。必须含 page 与 query。缺失覆盖、未知 scope、来源或编码不符即拒绝，不把未知补零。
- 只取该 scope 的当前 last-good 观察值，不把运行历史重复加总；同 scope 额外维度分组可在页面/查询内加总，不混合另一维度集合，因此不会把 page-query 表与 page-query-device 表相叠。
- 候选表给出 page/query 身份、总 clicks、总 impressions、`CTR = 总 clicks / 总 impressions`、`position = Σ(position × impressions) / Σ(impressions)`。零曝光时 CTR/position 为 null；总计非安全整数或非有限结果拒绝。
- 固定标注 `api_visible_subset_not_property_totals`：仅 API 可见子集，不是属性总量，也不保证最终不可修订。读取的是保留的 last-good，后续 partial 不会将它变成最新成功证据；输出 ledger digest 供追溯。
- 默认 `hash_only`，不自动在 stdout 输出原文；输出 strict schema 校验编码、维度、hash 标签、数学和固定隐私警告。属性仅给 hash。
- 人工显式增加 `--export /同一私有账本目录/report.json` 才生成 `private_readable_untrusted` JSON；仅 raw 研究账本可以导出。只能同一外部私有目录内新建文件，`0600`，拒绝 overwrite、符号链接、公共/源码路径。CLI 成功只返回状态，不打印可读标签。导出文件也属于用户掌控 retention 的敏感材料。

## 本地验证记录

1. TDD：先新增边界与研究测试，`/tmp/wp02-research-red.log` 实际为 23 失败、1 通过；之后摘要 schema、离线 CLI、证据类型、混库与冲突 ID 各有独立 RED 再实现。无占位 stub。
2. 本地依赖：首先 `pnpm install --frozen-lockfile --offline` 因全局 store projects 索引只读失败；将本地已缓存 store 复制至 `/tmp/wp02-pnpm-store` 后，以 `pnpm install --frozen-lockfile --offline --store-dir /tmp/wp02-pnpm-store` 成功，1039 包全部复用，下载 0。使用本树本地依赖，不使用外部 node_modules symlink，锁文件未变。
3. 离线安装默认未执行 Prisma 生命周期，首轮 typecheck 缺 Prisma 类型。随后只使用已有本地引擎缓存，在清空环境、禁更新检查、无真实连接配置下运行 `prisma generate`，未连接数据库；`pnpm exec tsc --noEmit --incremental false` 通过。没有改 Prisma schema 或应用代码。
4. 聚焦测试：`pnpm exec vitest run tests/seo-research.test.ts tests/seo-data.test.ts tests/seo-umami-exact.test.ts tests/seo-umami-tunnel.test.ts --cache=false`，149 项通过，其中本切片 30 项。覆盖默认无 raw、显式研究、交叉来源、编码隔离/旧账本、property、恶意查询不执行、加权数学、重复/空/失败保留、dry-run 无写操作及摘要 schema/导出安全。
5. 定向 lint：`pnpm exec eslint scripts/seo-data tests/seo-data.test.ts tests/seo-research.test.ts tests/fixtures/seo-research-cli.ts` 通过；`git diff --check` 通过。
6. 两个 CLI 的 `--help` 均以真实 Node 进程运行。`tests/fixtures/seo-research-cli.ts` 以注入 fetch 运行收集 CLI，随后真实运行摘要 CLI、显式导出与 dry-run；fixture 为两天同一 page/query，确认总点击 5、曝光 40、CTR 0.125、position 6；stdout 无原始标签，ledger/report 均 `0600`，dry-run 不创建目录。所有数据为合成 fixture，不是 live。临时私有目录路径仅写入 `/tmp/wp02-research-fixture-path.txt`，未进入 Git。
7. 历史沙箱全量运行 `pnpm exec vitest run --cache=false`：52 个文件中 51 通过、1 失败；406 项测试中 405 通过、1 失败。使用已有缓存引擎的 `PRISMA_QUERY_ENGINE_LIBRARY` 与仅本地不可用端口的合成 `DATABASE_URL`，没有使用生产连接。失败为既有 `src/components/brand-marquee.test.tsx:68` 子进程 stderr 断言：实际为空，预期包含 `Failed to copy standalone assets`。先前宿主日志 `/tmp/wp02-tunnel-full.log` 已有同一失败。没有修改该测试或发布脚本来掩盖结果，完整记录在 `/tmp/wp02-research-full-final.log`。这是当时该环境的结果，并非此后所有环境的最终状态。该轮类型检查（incremental false）与定向 lint 均退出 0。
8. 此后、此次原子导出整改之前，用户确认主代理已在此工作树完成 Prisma generate；主代理与独立外部验证均为 **406/406 成功**，全量无需额外环境变量。此结果来自用户提供的后续验证记录，不能抹掉第 7 项的早期沙箱失败，也不能将其误记为此次 CLI 沙箱中重新取得的结果。本次不安装、不 generate、不构建，不读取真实连接配置。

## 独立 review 整改：原子私有导出

2026-11-08，仅修改研究导出、CLI 状态、相关测试及本文，保留全部已有候选改动。独立审查确认 1 个阻断：旧 `exportResearch` 直接排他创建最终文件后 write/sync；write/sync/close 失败会留下空或不完整 final，阻止同名重试，读者也可能看到半成品。

- 先补 RED，再修实现。09:10 UTC 的实际 RED 为研究测试 **30 通过、4 失败（34 项）**，见 `/tmp/wp02-review-red.log`；writeFile reject（空 final）、sync reject 和 close reject（已有 final）都在“final 必须不存在”断言失败，link 故障测试则因旧实现没有调用 link 而意外成功。后续将 writeFile 注入增强为先写截断内容再 reject，将 close 注入增强为首次 reject、清理时再次 close 成功并断言 fd = -1。
- 在已验证的同一 `0700` 私有账本父目录中使用 UUID 随机临时文件名，以 `O_CREAT | O_EXCL | O_WRONLY | O_NOFOLLOW`、`0600` 创建。完整 writeFile、文件 fsync、close 全部成功后才 `link(temp, destination)`；Linux link 的原子 NOREPLACE 是唯一 **commit point**，不用可能覆盖目标的 rename。
- link 前失败：再次尝试 close、只尝试 unlink 本次成功创建的临时文件，返回 `PRIVATE_RESEARCH_EXPORT_REJECTED`，本次没有发布 final；既有 destination（包括符号链接）不覆盖、不删除。临时 open 失败不 unlink；不扫描、清理其他 invocation 的临时文件。若系统持续拒绝 close/unlink，则只能尽力回收，本次 temp 可能遗留；不声称任何故障下都能保证资源清理。
- link 成功后：只 unlink 本次 temp，正常返回 `{ status: "private_report_created" }`，final 完整、`0600`、nlink 恢复 1。若该 unlink 失败，返回 `{ status: "private_report_created_cleanup_pending" }`；CLI 仍 code 0，准确表示**已发布但临时清理待办**，不打印原文或路径。此时通常 nlink = 2，需操作人核对本次 temp 的 inode 与 final 后只清理该 temp；绝不回滚/删除 final，避免误删外部替换目标。重试同名导出仍排他拒绝，不能覆盖；测试人工移除该 temp 后确认 nlink = 1 且内容可读。
- 此切片不做目录 fsync，因此无目录 fsync 的 post-publication 错误分支；文件 fsync 与 close 不等于目录项断电持久性保证，不宣称掉电后 final 必然存在或绝无孤立 temp。进程崩溃可留下本次 temp，不做自动跨 invocation 清理。原先披露的父目录替换竞态仍限于可信单用户范围；不是防恶意管理员的方案，没有引入新跨平台文件系统接口。
- 默认 hash、raw 隐私警告、scope/来源/证据隔离及 dry-run 零写保护不变。新增测试还覆盖发布前 final 不存在、发布顺序、临时权限/标志、link reject、目标已存在/符号链接、失败同名 retry、只清理本次 temp、临时 open 冲突、并发同名 NOREPLACE，以及发布后清理失败不得删除外部目标。

### 此次整改验证结果

- 09:12 UTC 首次完整检查、09:26 UTC 增强 link 失败同名 retry 与 dry-run 零 link 断言后最终复跑，`pnpm exec vitest run tests/seo-research.test.ts tests/seo-data.test.ts tests/seo-umami-exact.test.ts tests/seo-umami-tunnel.test.ts --cache=false`：**158/158 通过**（研究 39 项，较之前新增 9 项），4/4 文件通过，见 `/tmp/wp02-review-focused.log`。
- 随后本次 CLI 受限沙箱 `pnpm exec vitest run --cache=false`：**414/415 通过，51/52 文件通过**，唯一失败仍是 `src/components/brand-marquee.test.tsx:68` stderr 为空，见 `/tmp/wp02-review-full.log`。未设置额外 Prisma/数据库环境变量。独立最小 Node 子进程 probe 返回 `spawnSync ... EPERM` 且 stderr 为空，证实当前环境存在子进程捕获限制；不修改无关测试/发布脚本来掩盖。这与整改前主代理/独立外部 406/406 成功是不同时间、不同执行环境，不将本次全量标为 GREEN。
- `pnpm exec tsc --noEmit --incremental false`、`pnpm exec eslint scripts/seo-data tests/seo-data.test.ts tests/seo-research.test.ts tests/fixtures/seo-research-cli.ts` 均退出 0，见 `/tmp/wp02-review-types.log`、`/tmp/wp02-review-lint.log`。
- 真实 Node 进程执行两个 CLI help、注入 fetch 的 fixture 收集、默认 hash 摘要、显式 export、同名 retry 拒绝、dry-run：全部通过。真实断言两天合计 clicks 5 / impressions 40 / CTR 0.125 / position 6，stdout 不含原始标签，父目录 `0700`，ledger/report `0600` 且 nlink = 1，无本次临时文件残留，dry-run 目录不存在。仅合成 fixture，无真实 API。私有临时目录索引为 `/tmp/wp02-review-fixture-path.txt`。

## 未验证与后续

- 真实 GSC 授权 property/token、真实分页与查询可见子集、真实敏感数据存储操作、线上数据质量、生产使用和真实 Umami 均未验证。Hermes 需后续取得独立授权才可做真实 API 工作。
- 本次沙箱的既有 stderr 子进程断言仍失败；整改前主代理与独立外部已有全量成功记录，尚无本次新增 9 项之后的外部全量复验。本切片没有部署/构建站点或修改生产调度的授权，因此未做生产构建、部署或生产检查。
- 文件系统权限和路径检查不防御有权限的恶意本机管理员、进程间路径替换竞态或用户手工将私有材料提交/公开；请使用可信本地主机与非共享私有目录。不要将可读标签复制到报告、聊天、公共文件或 Git。


## Hermes 实际外部验收补充（研究切片，未发布）

- 正常权限外部全量415/415单元测试、非增量类型检查、定向lint通过。原子导出整改独立复审通过，独立实跑158/158聚焦测试。
- 既有GSC readonly授权，实际CLI采集2026-10-01的page,query维度，row-limit=1触发真实分页，complete21行1checkpoint；重复21行不重复，去token返回unconfigured且last-good与checkpoint保持。
- 默认摘要hash_only，共21候选；显式私有可读JSON导出成功，同名再次导出拒绝且原文件未变。真实查询未输出至stdout、日志、聊天或Git。目录0700，ledger/report0600，构建机仓库外私有保存。
- 2026-11-01空结果被标记partial/gsc_final_unconfirmed，不补零或确认覆盖。初次输出选择落在上级Git范围被安全拒绝，未绕过限制，改用仓库外私有目录。
- 此结果仅代表一个日期API可见子集，不代表全属性总量、最终性、更多维度及长期同步验收。researchReady仍false：整个WP02的GA4/有效询盘归因/人工审批调度未完成。
- 未合并、未部署、未启用cron；研究切片PR需人工审核，生产发布单独授权。
