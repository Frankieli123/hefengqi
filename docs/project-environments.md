# RICEWIND 项目环境与发布边界

更新日期：2026-10-17

## 目录职责

| 位置 | 用途 | 开发规则 |
| --- | --- | --- |
| `/mnt/vscode/hefengqi` | 历史开发工作区及生产运行目录；本地 main 滞后并有大量用户未提交修改 | 不直接作为发布源码；保留现有文件 |
| `/mnt/vscode/hefengqi-analytics-full-ip-v2` | 当前已整合主线与完整 IP 统计的工作区，分支 `feat/visitor-analytics-full-ip` | 发布前必须与最新 origin/main 同步并提交；发布完成后整合提交进入远端 main |
| `/mnt/vscode/hefengqi-analytics-ip` | 旧的 detached HEAD 统计 worktree | 不再用于开发或发布 |
| `/mnt/vscode/hefengqi/.releases/*` | 已构建的生产 Standalone release | 禁止编辑 |
| `/mnt/vscode/hefengqi/current` | 指向当前生产 release 的软链接 | 禁止编辑或在其中构建 |
| `/mnt/vscode/hefengqi/.env` | systemd 生产运行时配置 | 不提交、不输出真实密钥 |

生产并不直接运行主工作区的 `src`，主工作区未提交或未发布的修改不会自动进入线上。

## 当前生产链路

- 服务：`hefengqi.service`
- 应用端口：`3000`
- 服务工作目录：`/mnt/vscode/hefengqi/current`
- 统计服务：Docker 容器 `hefengqi-umami`，宿主机 API `http://127.0.0.1:3008`
- 公开链路：EdgeOne → Caddy `:8080` → Next.js `:3000`
- 当前运行 release 应实时执行 `readlink -f /mnt/vscode/hefengqi/current` 确认，不凭目录名猜测

生产版本通过以下命令实时核对，不能根据目录名、某个分支名称或最近提交时间判断：

```sh
readlink -f /mnt/vscode/hefengqi/current
cat /mnt/vscode/hefengqi/current/release.json
git -C /mnt/vscode/hefengqi-analytics-full-ip-v2 log -1 origin/main
```

2026-10-06 曾发生仅从旧主线发布客服样式、遗漏统计分支的回退。所有后续发布必须同时包含主线更新与既有统计功能，禁止只挑选 UI 提交到缺少统计的旧基线。发布脚本记录精确 commit，并拒绝缺少当前生产 commit 的普通发布；主动回滚应按下方回滚流程操作。

2026-10-17 又出现从历史 `/mnt/vscode/hefengqi` 构建 `*-optimized` 包的回退，缺少客服和技术支持路由，并启用了 `ignoreBuildErrors`。不得把“构建时间较新”当作“功能代码最新”。标准发布现在要求显式指定独立的干净源码目录、校验 11 个必需路由及类型检查配置，切换前还会检测生产链接是否被其他发布者修改。历史 release 不再自动按日期删除。

本次保留 NAS 的飞书询价卡片通知和 Caddy 连接保活设置；产品详情定向查询、列表分页和轻量推荐继续使用整合主线已有实现。不会把旧页面组件或跳过类型检查设置重新带回主线。数据库内容和媒体文件不回退。

NAS Caddy 配置的受版本控制副本位于 `infrastructure/caddy/Caddyfile.nas`，运行文件仍是 `/mnt/vscode/hefengqi/Caddyfile`。修改时必须同步、验证并重载/重启代理。默认页面、RSC 和统计接口必须 `private, no-store`，不能覆盖 Next.js 的 `Vary`；保留哈希静态资源缓存。

## 统计数据来源

- 下方 Umami 流量和地区卡片直接读取 Umami metrics。
- “访客访问轨迹”读取 PostgreSQL `AnalyticsPageView`，保存完整 IP、路径和时间，最长保留 90 天。
- 已有关联会话的访问使用 Umami session 地理信息；旧记录可按同路径、相近时间与 Umami pageview event 唯一关联。
- Umami 会过滤搜索引擎爬虫。此类请求若 EdgeOne 未把国家/地区请求头传到源站，只能明确显示“未获得地区”，不能用相邻会话猜测。

## 标准发布

1. 获取最新 origin/main，确认发布源码包含主线与当前生产版本，工作区改动全部提交。历史主工作区中的未提交内容不自动纳入。
2. 至少执行 `pnpm typecheck`、`pnpm lint`、`pnpm test`；高风险改动还需生产构建和页面冒烟。
3. Prisma 变化先备份 PostgreSQL 和媒体，再新增并执行 migration；不改写已执行 migration。
4. 只通过 `scripts/deploy-standalone.sh` 构建隔离 release、原子切换 `current`、重启并检查 `/api/health/ready`。
5. 发布后检查七语主要页面、后台和统计页，并确认 EdgeOne 未缓存 HTML/RSC。

当前工作区发布命令：

```sh
HEFENGQI_SOURCE_DIR=/mnt/vscode/hefengqi-analytics-full-ip-v2 \
HEFENGQI_DEPLOY_DIR=/mnt/vscode/hefengqi \
/mnt/vscode/hefengqi-analytics-full-ip-v2/scripts/deploy-standalone.sh
```

统计验收必须包括：访客访问轨迹、按 IP 合并的页面路径、日期筛选、地区推断及爬虫隐藏。仅检查首页 200 不能证明后台功能完整。

## 回滚与核对

优先使用发布脚本自带的失败回滚。人工回滚前保存当前软链接目标，原子切回上一 release，重启服务并检查 readiness。

```sh
git -C /mnt/vscode/hefengqi status --short --branch
readlink -f /mnt/vscode/hefengqi/current
systemctl status hefengqi.service --no-pager
docker ps --filter name=hefengqi-umami
```

`current`、`.releases`、`.next`、真实 `.env` 和生产数据库都属于运行/生成区域，不作为日常编辑入口。
