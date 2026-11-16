# RICEWIND 唯一发布制品流程

本文件替代历史部署操作说明。本轮只在 192.168.31.50 生成独立验证包；上线由主 Agent 独立验收、获得额外授权后执行。旧 `deploy.sh`、`deploy-standalone.sh` 在本源码中直接拒绝执行，保留其历史实现仅供版本追溯。

## 1. 源码与依赖门禁

只在 `docs/project-environments.md` 指定的独立源码目录工作，绝不在 dirty 根或运行 release build。必须包含 `628a3cf`、`276d14a` 的祖先关系，使用锁文件固定依赖；`node_modules` 必须是本树的目录，不得是共享软链。不得放入任何 `.env*` 文件或凭据。

先检查逐文件整合报告、明确未整合项、执行测试，然后显式逐路径暂存并本地提交，不 push，不 `git add .`。构建/打包检查 tracked/untracked dirty、HEAD、实际 tracked 文件 SHA256、锁文件 hash；任何变化都拒绝。不要关闭 TypeScript 检查。

```sh
cd /mnt/vscode/ricewind-unified-source-20261117
pnpm test:release
SITE_URL=https://ricewind.com ANALYTICS_DB_TEST=0 pnpm test -- --maxWorkers=2
pnpm typecheck
pnpm lint
pnpm release:build --artifact-dir /mnt/vscode/ricewind-unified-artifacts-20261117/verified-build
pnpm release:pack --artifact-dir /mnt/vscode/ricewind-unified-artifacts-20261117/verified-build
```

测试/检查也必须使用清理过的环境：本任务通过 `scripts/release-common.cjs` 的 `offlineEnvironment`/`runStep` 保存每步日志与真实 exit；不会继承生产凭据，`ANALYTICS_DB_TEST=0`。上方命令表达运行顺序，不授权连接任何数据库。Prisma 只执行 `generate`，必要时只下载其官方依赖引擎；不执行 migration、seed、schema push 或数据库测试。构建使用明确无生产意义的 `127.0.0.1:1/ricewind_build_only` 占位 `DATABASE_URL`，不是运行配置。

## 2. 构建

`release:build` 获取源码树和 artifact 的原子目录锁，拒绝并行 build/pack。锁中记录 PID，不根据时间自动抢锁；若异常遗留，主 Agent 先核对引用再处理。本轮不运行发布器。

构建脚本执行实际 `next build --webpack`，使用新的 `.next`；如已存在则拒绝，人工保全到本任务 artifact 后才能重新构建，绝不混用旧输出。Next 构建的网络/监听能力被预载脚本拦截；没有真实 DB、HTTP 或生产内容验收。

构建前保存 `next-env.d.ts` 和 `tsconfig.json` 原始字节，成功/失败后都把生成版保存在 artifact `generated-source/`，再逐字恢复源文件。随后复核 HEAD、源码 digest、clean 状态。不要把 Next 自动变更悄悄加入发布提交。

`verify-release.cjs` 保留 11 个必需路由与 TypeScript gate，通过产品路由自己的 NFT trace 只扫描实际产品 route/chunks，拒绝中/英/俄三种旧商业尾缀（含 Unicode 转义），不扫描测试文本/无关 chunk。回归测试刻意构造坏制品证明拒绝路径。

构建记录包含 commit、sourceDigest、BUILD_ID（`buildId`）、bundler=`webpack`、Node、pnpm-lock hash、distDigest 和门禁结果。缺记录或记录与当前源码/输出不一致不得打包。

## 3. Standalone 打包

`release:pack` 只复制同一次新构建的整个 `.next/standalone`，再复制本树完整 `public` 和该构建的 `.next/static`，不提取旧 server.js、不依赖旧 release、不补共享 node_modules。

遍历全部 NFT trace；若 Next standalone 未带入 minimal-server 等 trace 的文件，仅从本次独立源码树的同一构建/依赖补齐，不覆盖已有文件、不取其他 release。逐项校验所有 traced 文件 SHA256；pnpm 目录/软链条目校验目录类型与包内闭合性，不把目录误作文件，也不额外复制未被 trace 的整个开发依赖目录。校验同一次 BUILD_ID/server.js、包文件清单和 source/dist digest。拒绝 `.env`、凭据、私钥、缓存、历史 worktree/测试 dist。文件清单 SHA256 写入 `release-manifest.json`；最后生成独立 tar.gz 及 `.sha256`。只从完整包运行 `node server.js`，不能把零散文件叠加到旧 release。

## 4. 主 Agent 必须独立完成的上线前门禁

- 核对 RESULT/result.json 每步 exit、提交、SOURCE digest、BUILD_ID、manifest、tar SHA256 和解包后的文件哈希/软链闭合性；确认源码 clean，两个统计提交仍为祖先。
- 审批逐文件未整合差异；确认线上新增功能的语义/交互未丢失。自动测试和静态路由清单不能代替浏览器验收。
- 经独立授权后只读核验新加坡七语言实际产品标题/canonical/hreflang；本轮没有读取生产 DB，不能假称逐条核验过现存文案。不得以本地旧 DB 回填。
- 在另外获准的隔离运行环境中验证完整包、七语言 document/OG/twitter、guide-links、客服、切换、移动图册、后台统计与 readiness；占位 DB 环境下的 build 不算 HTTP 验收。
- 核对新加坡当前 commit/配置、DB schema 兼容性、媒体挂载、回滚包、HTML/RSC no-store 与 Next Vary；保留 hashed static 的 immutable。实际部署、切 current、restart、DB 写、缓存清理均需额外授权。

## 5. 清理

本任务仅生成 `cleanup-manifest.json/.md`，不实际删除。凡有 dirty/独有提交/未整合差异/软链或进程引用的树和 release 必须保留。媒体、uploads、DB、凭据、共享依赖、活跃 release、其他项目永不列为自动清理目标。不得仅按日期删除历史文件。
