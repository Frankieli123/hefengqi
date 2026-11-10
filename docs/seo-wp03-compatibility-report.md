# WP03：首个 GEO 兼容关系事实边界修复

日期：2026-11-10。状态：本地修复与验证完成，等待宿主门禁；未发布。

## 1. 基底与执行边界

- 分支：`fix/ricewind-wp03-compatibility`；起始 HEAD：`e8341f9`，即本任务指定的 PR8 基底。未访问远端 PR 服务核对 PR 编号。
- 起始 `git status --short` 无输出，没有覆盖其它未提交工作。
- 未 commit、push、build、启动开发服务器、部署或修改 cron；未读取 `.env*`、真实数据库、私有 GSC 或生产数据；未执行公网生产复测。
- 从原树 `ricewind-wp02-native-notify/node_modules` 复制现有依赖到本树本地目录，没有把本树 `node_modules` 链接到原树，没有安装依赖或修改 lockfile。

## 2. 根因与证据

三入口实际由以下 GET handler 返回文本，不是仅由 `public/` 文件决定：

| 公共路径 | 实际响应来源 | 静态副本 |
| --- | --- | --- |
| `/llms.txt` | `src/app/llms.txt/route.ts` | `public/llms.txt` |
| `/llms-full.txt` | `src/app/llms-full.txt/route.ts`，静态主体后追加 DB FAQ | `public/llms-full.txt`，不含实时 FAQ |
| `/support/cross-reference/llms.txt` | `src/app/support/cross-reference/llms.txt/route.ts` | `public/support/cross-reference/llms.txt` |

基底中根索引有八个 Rectifier 和三个 Subrack 旧块，支持入口有五个 Rectifier 和三个 Shelf，合并 GET 仅嵌入五个 Rectifier，合并 public 副本却另含三个 Shelf。重复维护导致编号、候选对象、覆盖范围和断言漂移。块内存在完全匹配、固件支持混用、无需改母排热插拔、容量无缝扩展、效率/散热/噪声提升等未附精确配置证据的确定陈述。

用户提供的生产观察是“根索引已标未验证，合并和支持仍有保证句”；本次未对公网重现该观察。上述本地基底仍包含旧肯定句，因此不能把用户的生产观察冒充本次网络取证。

这里只以已有仓库文本确定待核验候选名称，不把旧文本当成 OEM 兼容证明。没有取得或核验覆盖这些精确配置的 OEM 文件，八组均为 `unverified`；这不是“不兼容”结论。

## 3. 修复范围与统一关系

新增轻量静态事实模块 `src/content/llms-cross-reference.ts`，三个实际 GET 引用同一段候选与事实边界；不抽象或重构全 catalog，也不接管 CMS。三个 public 副本同步相同关系段，并以测试防止新增漂移。

采用原支持入口的八组标识作为统一索引，不把它们当作原厂关系编号：

| 标识 | 仅供工程核验的候选名称 | 状态 |
| --- | --- | --- |
| Rectifier-01 | Vertiv / Emerson R48-2900U；Vertiv R48-3200e、R48-3500e3 | unverified |
| Rectifier-02 | Huawei R4850N1、R4850N2、R4850G2 | unverified |
| Rectifier-03 | Eltek Flatpack2 48/2000 HE、48/3000 HE、48/3000 SHE | unverified |
| Rectifier-04 | ZTE ZXD2400 V4.1、V4.3、V4.6、V4.7；ZXD3000 V5.1 | unverified |
| Rectifier-05 | Delta ESR-48/56A、ESR-48/56G (EnergE Series) | unverified |
| Shelf-01 | Huawei ETP48100-B1；Vertiv NetSure 211；Eltek Compact CT0S | unverified |
| Shelf-02 | Huawei ETP48200-C5B6；Vertiv NetSure 531 A41；ZTE ZXDU68 S301 | unverified |
| Shelf-03 | Huawei TP48400C；Vertiv NetSure 731 A98 | unverified |

- 根索引旧关系段整体收敛到上述八组，撤下本次八组以外的旧升级/控制器/其它 Subrack 等效断言；没有据此对那些型号作兼容或不兼容判定，也未修改其其它 catalog 内容。
- 每个块的 Verification Status、Compatibility、Electrical Spec、Mechanical Fit、Bus & Protocol、Notice 均独立明确 `unverified`；不是仅在文首加免责声明。
- 每块要求匹配型号后缀及硬件修订、机框/背板与连接器/引脚/母排、控制器和固件、输入/输出限制及保护/配电额定值，并取得对应精确配置的原厂证据。
- 移除块内未经证实的替换、混用、机械/协议支持、跨品牌等效、性能提升、容量扩展、免改线/母排及热插拔操作保证。不用计算工具推导或重填参数；不是安装、更换或带电操作指令。
- 删除受改关系介绍的 100% 语义保真、512/1024-token 切块保证；相关索引描述改为候选与核验边界。
- 未新增 schema、价格、库存或服务承诺；关系块外产品、文章、七语消息和 CMS 事实不在本次修订内。这些入口本身是现有无语言前缀的英文技术文本，没有新增七语消息键。

## 4. TDD 与实际验证

测试：`tests/llms-compatibility.test.ts`；独立预期 fixture：`tests/fixtures/wp03-compatibility.ts`。测试直接导入并执行三个真实 GET，检查返回的 `Response` 状态、文本类型和完整正文；只 mock DB 边界及原支持路由不必要的 env 导入，不连接真实 DB。

预期 fixture 固定八组确切名称与每个字段全文。测试比对整个 cross-reference 段（包括介绍和段间文本），再比对八个关系块、数量及顺序，不只搜索几个容易绕过的危险短词，也不从生产共享模块导入预期结果。

| 检查 | 实际结果 |
| --- | --- |
| 先增加测试、未改生产内容 | 7 failed，退出 1；`/tmp/wp03-red.log` |
| 修复后 focused tests | 7 passed，退出 0；`/tmp/wp03-green-final.log` |
| 三入口八组关系及每组 notice/fit/protocol 完整 fixture | 通过；状态和关系全文一致 |
| 三份 public 的受改关系段 | 通过；全文精确一致，无范围内漂移 |
| FAQ 非空、空结果、DB 异常 | 通过；静态正文保留，成功时按原格式追加，异常时原有降级保留 |
| 定向 ESLint | 退出 0；`/tmp/wp03-lint.log` |
| 非增量 TypeScript | `tsc --noEmit --incremental false`，退出 0；`/tmp/wp03-tsc.log` |
| `git diff --check` | 通过 |

复现命令（现有依赖，不安装、不 build）：

```sh
node_modules/.bin/vitest run tests/llms-compatibility.test.ts
node_modules/.bin/eslint src/content/llms-cross-reference.ts src/app/llms.txt/route.ts src/app/llms-full.txt/route.ts src/app/support/cross-reference/llms.txt/route.ts tests/llms-compatibility.test.ts tests/fixtures/wp03-compatibility.ts
node_modules/.bin/tsc --noEmit --incremental false
git diff --check
```

每次 focused test 都输出三个完整 GET 正文及 mock FAQ 追加后的完整正文，并保存为 `/tmp/wp03-get-*/`、`/tmp/wp03-faq-*/` 中的文本文件。最终日志明确给出该次实际文件路径；不是仅打印“已通过”或用静态文件替代 GET 取证。临时日志和正文不纳入 git。

本工作树没有 `.next/types/validator.ts` 或其它本地 `.next` 生成树；本次非增量 tsc 实际通过，不代表已验证 Next 构建、生成类型或运行服务器。遵照任务要求未 build、未生成 `.next`、未运行全量测试/E2E。

## 5. Remaining scope / 未验证事项

1. **数据库 FAQ 没有被清洗。** `/llms-full.txt` 仍查询英语 FAQ，最多 60 条，按 sortOrder 排序并原样追加。本包不声称解决 DB 中所有兼容断言。测试刻意保留一条 mock 待复审断言，证明追加链路未被静态修复截断或篡改；并覆盖 productTranslation 为空时原有 fallback，包括既有的 undefined canonical 行为，不在本包修正。
2. **public 合并副本的两行既存品牌标识差异保留。** 基底 public 使用带中文别名的标题及 Brand / Legal Entity，实际 GET 使用简短标题及 Brand / Entity。本次不裁决或改写这些范围外主体事实。全文副本测试仅明确映射这两条确切旧差异，其余静态正文精确比较；关系段本身不做任何归一化或豁免。少量原有空行差异同步至 GET 格式。不能声称整个旧副本与 GET 原始字节完全一致。
3. 其它 catalog、troubleshooting、`llms-qna`、CMS 产品/文章、七语产品页、结构化数据里的历史参数或兼容陈述未全面审计。根索引外围商业描述与全局验证措辞也不是本包的事实背书。
4. 未核验任一精确 OEM 配置，未作现场机械、电气或协议实验。取得证据后仍需独立工程审批，不能据候选列表执行操作。
5. 未验证公网路由优先级、CDN 缓存或真实动态 FAQ；没有 GSC/排名/收录/询盘对照数据，不声称有 SEO/GEO 效果提升。

## 6. 宿主门禁及人工发布后的公共复测

本次停在本地未提交 diff。由宿主先审查八组候选、事实边界、既存差异豁免和 remaining scope，再决定是否进入独立集成/发布流程；本报告不是发布授权。不绕过 `docs/deployment.md` 的隔离发布要求，不在运行目录 build，不改 cron。

经人工授权并完成后续发布后，由发布人员另行执行：

1. 用真实公开 URL GET 三入口，保存时间、HTTP 状态、Content-Type、Cache-Control、Age/缓存命中头及完整正文，确认不是旧缓存；必要时走既有人工缓存处置流程，本包不执行清缓存。
2. 抽取并完整比较三入口 cross-reference 段，确认五个 Rectifier、三个 Shelf 的候选、顺序、六个 unverified 字段逐块一致，旧保证句及切块保证没有从旧副本回流。
3. 对照本包 public 关系段与 fixture；不能把拿到磁盘静态文件当作已测到公网 route。
4. 单独检查合并页静态段之后的真实 FAQ 是否仍追加，以及其中是否残留待审核兼容断言。若有，记录为独立 CMS/DB 内容工作，不声称本次静态修复已覆盖。
5. 复测结果交回宿主门禁；仅报告观察事实。SEO/GEO 结果须另有获授权的数据窗口与证据，不以本地测试通过推断效果。
