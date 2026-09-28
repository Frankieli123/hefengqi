# RICEWIND 项目环境与发布边界

更新日期：2026-09-28

## 目录职责

| 位置 | 用途 | 开发规则 |
| --- | --- | --- |
| `/mnt/vscode/hefengqi` | 主开发工作区，含官网、CMS、七语言、统计和 Prisma 源码 | 开始前查看 `git status`，保留已有未提交修改 |
| `/mnt/vscode/hefengqi-analytics-full-ip-v2` | 统计功能隔离 worktree，分支 `feat/visitor-analytics-full-ip` | 用于统计功能实现和验证，不代表完整主站源码 |
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

截至本文更新时，当前 release 为：

```text
/mnt/vscode/hefengqi/.releases/20260928085000-umami-geo-v2
```

## 统计数据来源

- 下方 Umami 流量和地区卡片直接读取 Umami metrics。
- “访客访问轨迹”读取 PostgreSQL `AnalyticsPageView`，保存完整 IP、路径和时间，最长保留 90 天。
- 已有关联会话的访问使用 Umami session 地理信息；旧记录可按同路径、相近时间与 Umami pageview event 唯一关联。
- Umami 会过滤搜索引擎爬虫。此类请求若 EdgeOne 未把国家/地区请求头传到源站，只能明确显示“未获得地区”，不能用相邻会话猜测。

## 标准发布

1. 在主工作区确认本轮文件范围，避免把无关未提交改动混入发布。
2. 至少执行 `pnpm typecheck`、`pnpm lint`、`pnpm test`；高风险改动还需生产构建和页面冒烟。
3. Prisma 变化先备份 PostgreSQL 和媒体，再新增并执行 migration；不改写已执行 migration。
4. 只通过 `scripts/deploy-standalone.sh` 构建隔离 release、原子切换 `current`、重启并检查 `/api/health/ready`。
5. 发布后检查七语主要页面、后台和统计页，并确认 EdgeOne 未缓存 HTML/RSC。

## 回滚与核对

优先使用发布脚本自带的失败回滚。人工回滚前保存当前软链接目标，原子切回上一 release，重启服务并检查 readiness。

```sh
git -C /mnt/vscode/hefengqi status --short --branch
readlink -f /mnt/vscode/hefengqi/current
systemctl status hefengqi.service --no-pager
docker ps --filter name=hefengqi-umami
```

`current`、`.releases`、`.next`、真实 `.env` 和生产数据库都属于运行/生成区域，不作为日常编辑入口。
