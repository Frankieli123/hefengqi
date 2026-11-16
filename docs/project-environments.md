# RICEWIND 源码、环境与内容边界

核验日期：2026-11-16 UTC。目录中的 `20261117` 是用户指定的任务标识，不代表执行日期。

| 绝对路径/环境 | 职责与边界 |
| --- | --- |
| `192.168.31.50` | 本地编译、测试和独立验证制品生成；不是本次的上线目标 |
| `/mnt/vscode/ricewind-unified-source-20261117` | 本轮唯一可写源码；独立本地克隆，分支 `fix/unified-release-20261117`；独立 `node_modules`、store/cache；不得复用其他 release 的 server 或依赖 |
| `/mnt/vscode/ricewind-unified-artifacts-20261117` | 本轮唯一 artifact 根；原始日志、逐步 exit、RED/GREEN、源文件比对、生成配置前后副本、manifest、验证包和只读清理建议 |
| `/mnt/vscode/ricewind-news-production-candidate-20261116` | 只读候选基线，HEAD `628a3cf5003e6247db4d9b9d3cfe80d78dddbf9b`；其 next-env/tsconfig 及已有构建目录保留，不在其中构建 |
| `/mnt/vscode/hefengqi` | HEAD `2f9120c` 的历史 dirty 根；原有未提交源码和本机历史运行引用必须保留；不可发布、不可 build、不可 reset/stash/clean |
| 其他 Ricewind/hefengqi 历史树 | 仅做本任务明确范围内的版本/磁盘/引用清单；不自动删除，不作为拼装依赖来源 |
| 新加坡运行环境 | 用户确认的生产应用与七语言 DB 内容源；本轮不连接、不改 DB、不部署、不重启 |

旧文档对 NAS/大陆运行链路的描述是历史信息，不能推断成新加坡当前状态。本轮只读 `/proc` 能观察到本机历史 release 的运行引用，不等同于核验新加坡生产。不要通过目录日期或本机服务状态猜测线上版本。

## 不可回退的内容与功能

- 新统计直接继承 `628a3cf`（历史爬虫/流量细分）和祖先 `276d14a`（overview/detail 统一候选流量），不从旧 dirty analytics 文件覆盖。保留 UA 证据策略、未知 UA 和不可用指标的真实含义。
- 七语言 `zh/en/ru/fr/de/es/ar` 已发布 SEO 文案的唯一真源是新加坡生产 DB。源码仍通过 `ProductTranslation.seoTitle/seoDescription` 投影；本轮不读取或复制生产数据，不做 migration/seed/import/writeback。
- 产品页 `seoTitle` 非空白时逐字使用，空值/空白才回退 `name`；document/OG/twitter 一致，不追加站名或商业尾缀，不用正则删合法型号。仅产品页绕开父级 title template。
- guide-links、客服、七语切换、触屏滑动图册等沿用候选现有实现，以具体测试和构建路由作为证据，不宣称已做生产浏览器验收。
- 逐文件 SHA256/差异分类保存在 artifact 的 `evidence/source-comparison.*` 与 `source-integration-review.*`。历史独有的产品 loading 已逐字移入；历史 `public/robots.txt` 不覆盖现有动态 robots 路由，避免同路径冲突。
- 其他非相同源码保留候选，不盲目覆盖。无法证明语义完全等价的差异在复核表标为待主 Agent 审核，原树保留；“构建通过”不能消除此门禁。

唯一构建、打包及后续验收流程见 `docs/deployment.md`。
