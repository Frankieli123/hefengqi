# WP02 attribution browser → API → disposable PostgreSQL E2E

## Scope and status

- Baseline: `598ee9fe60b260c3154d8d1a84925d1defc0fbca` (PR4 CI green is supplied context, not a new run).
- Only test/configuration/documentation artifacts changed. No product code, endpoint, schema, migration, business content, existing Playwright configuration or Axe assertions changed. No commit/push/merge/deploy, worker/cron, production database, real credentials or external API used.
- **Real browser + PostgreSQL execution is pending the host.** Collection/unit success is not browser success. `qualified=null`; qualification semantics and whole WP02 remain unfinished, with subsequent execution a separate task.

## Actual coverage implemented (not yet browser-verified)

Dedicated `playwright.wp02-attribution.config.ts`, Chromium project `wp02-attribution-chromium`, fixed loopback port **3108**, one worker, no retries, no server reuse, separate `next-wp02-attribution-e2e` build output. Default `playwright.config.ts` remains unchanged, including port 3000 and its 78 tests.

Six cases submit the real `/en/contact` form through actual controls, including category and privacy consent, and require HTTP 201 plus the visible reference. Browser fetch payload transformation models hostile/legacy clients but calls the original fetch; it does **not** fulfill, mock or replace either application API or database persistence.

1. Fresh browser explicitly POSTs to the **real `/u/api/send` route**, obtains server-set `_hfq_sid`/`_hfq_vid` HttpOnly cookies, verifies JS cannot read the session cookie, then submits the actual form. SQL polls `AnalyticsPageView` by **exact HMAC sessionKey and unique test userAgent**, requiring stripped path, locale, referrer domain and null Umami session. Inquiry must carry that same key.
2. Separate, explicitly labelled **browser `addCookies` injection** case verifies the server uses the cookie-derived HMAC, not forged `sessionKey`, `attributionSessionKey`, body `_hfq_sid` or `qualified`. Raw query/fragment/referrer path are stripped by the real server. Two concurrent browser API replays, with another cookie/path/referrer, must return the original reference/time, preserve the complete original Inquiry, and leave **exactly 1 Inquiry / 2 Outbox**. This tests committed-request retry, not an uncommitted first-write race. No pageview may exist for the injected session merely because its cookie exists.
3. No-cookie hostile body: null session and rejected private path/credential-bearing referrer.
4. Expired cookie: same null assertions.
5. Malformed cookie: same null assertions.
6. Legacy client omitting optional context: all three attribution fields null.

Each case verifies two pending, unattempted, unlocked, unsent synthetic-address outboxes, expected templates, and no attribution/qualification fields in outbox payloads. API responses must expose only reference/time. `IP_HASH_SECRET` is the same exported **synthetic test constant** used by both server environment and HMAC assertion, not a guessed production setting.

### Upstream isolation: deliberately **not successful Umami**

Production `/u/api/send` hardcodes `http://127.0.0.1:3008/api/send`. No production endpoint/configuration is changed. A **test-server-only Node preload** rejects that exact upstream fetch **before any connection**, causing the existing application 502 branch. It also rejects external server fetches. The browser blocks cross-origin resources, including Turnstile; test server omits Turnstile keys, so the existing no-key behavior is used. There is no online Umami access, no listener on 3008 and no contact with an existing 3008 service.

The 502 response is asserted, not hidden. Cookie issuance and anonymous pageview persistence are application behavior on this failure branch; this does **not** establish Umami ingestion/session/geography success. The isolation unit test replaces only the transport to prove forbidden destinations never reach it while local application URLs delegate unchanged. No application API success stub exists.

## Database and side-effect boundaries

- Before constructing a driver: explicit `WP02_BROWSER_E2E=1`, `E2E_DISPOSABLE_DATABASE=ricewind_e2e`; URL must use PostgreSQL, loopback, explicit port, username/database **ricewind_e2e**, exactly `schema=public`, no fragment/extra query parameters. Ambient `PG*`, external base URL and Node preload overrides are refused. Media must be normalized `/tmp/...`.
- Actual server identity is checked immediately after connection. No dotenv credentials are loaded; isolated server refuses `.env*` except `.env.example` and launches Next with a small allowlisted synthetic environment. Prisma generate below uses empty `DATABASE_URL` and does not connect.
- The host must provide a unique, externally created **temporary PostgreSQL instance**, not another application's database. CI uses its existing disposable Postgres service and CMS seed, sequentially **before** the unchanged default suite; no extra reset, drop, truncate, migration replay or reseed occurs.
- No worker runs. Resend/other provider credentials are not forwarded. Before starting Next, a test-only `customerService` setting is inserted **only if absent**, with synthetic sales address and `webhookEnabled=false`; an existing setting is accepted only if explicitly safe, never overwritten. Cleanup deletes only the setting bearing this launch's random ownership token. Unsafe existing settings fail closed.
- Before Next starts, SQL refuses any pageviews older than 90 days: the real route has retention pruning, and this prevents collateral deletion of historical rows. Tests use UUID emails, userAgents and synthetic rate-limit identities; cleanup deletes only matching owned Outbox/Inquiry/pageview rows. CMS fixtures and other suite records remain untouched. Forced process termination may leave synthetic records; no broad cleanup is attempted.

## Actually executed here

All tools were consulted with help first. `tsx --help` failed on sandbox Unix-socket `EPERM`; `node --import tsx ... --help` worked without that CLI socket. No browser installation or network dependency installation was performed. An initially empty offline pnpm store lacked a package; existing local dependencies were copied into this checkout, then `pnpm install --offline --frozen-lockfile --ignore-scripts --store-dir /tmp/wp02-pnpm-store` completed using the existing local store and regenerated local CLI links. No external symlink exists (the workspace worker link resolves inside this tree); Next, Playwright and Prisma resolution all point into this checkout. Browser cache was inspected read-only, not launched.

| Check | Actual result |
| --- | --- |
| TDD initial guard test | RED: missing fixture import (`/tmp/wp02-e2e-red.log`) |
| Guard/identity/network-isolation unit tests | 22 passing; transport-only assertions, not browser evidence |
| Focused WP02 unit tests | 68 passing in 4 files (`/tmp/wp02-e2e-focused.log`) |
| Prisma generate, `DATABASE_URL=''` | Passed; no DB connection (`/tmp/wp02-e2e-prisma-generate.log`) |
| Typecheck | Passed (`/tmp/wp02-e2e-typecheck.log`) |
| Lint | Passed, 0 errors / 8 existing warnings (`/tmp/wp02-e2e-lint-all.log`) |
| Full unit suite | 484 passed / 1 failed (485 total), 58 files. Existing `src/components/brand-marquee.test.tsx` child-process asset-copy assertion received empty stderr under sandbox process restrictions; not weakened or changed (`/tmp/wp02-e2e-unit-all.log`). |
| Dedicated Playwright `--list` | 6 tests / 1 project (`/tmp/wp02-e2e-list.log`), no server/DB/browser startup |
| Default Playwright `--list` | Original 78 tests / 6 files / 3 projects retained (`/tmp/wp02-e2e-default-list.log`) |
| Missing browser opt-in | Dedicated config refused with exit 1 before any DB/server/browser startup (`/tmp/wp02-e2e-refusal.log`) |
| Real browser → API → PostgreSQL | **NOT RUN here; host pending** |

## Host execution

Requirements: credential-free isolated checkout at this cwd; Node 22+, repository-matched offline local dependencies, cached matching Chromium and OS dependencies, free loopback 3108, normalized `/tmp` media path. Host creates a unique disposable container/instance with user/database `ricewind_e2e` and a unique loopback mapped port (example **15432**). Password below is synthetic, not a credential to reuse elsewhere. Do not use production credentials, an existing DB, host networking, or touch port 3008. No web/email worker may share this temporary instance.

The host owns container creation/destruction. For an **empty new** instance only, after checking CLI help:

```sh
# Host only; requires this PostgreSQL image already cached (no pulls).
docker --help
docker run --help
docker exec --help
docker stop --help
wp02_container="ricewind-wp02-$(date +%s)-$$"
docker run --detach --rm --pull=never --name "$wp02_container" \
  --publish 127.0.0.1:15432:5432 \
  --env POSTGRES_USER=ricewind_e2e \
  --env POSTGRES_PASSWORD=synthetic-only \
  --env POSTGRES_DB=ricewind_e2e postgres:16-alpine
docker exec "$wp02_container" pg_isready --help
# Proceed only after this reports accepting connections:
docker exec "$wp02_container" pg_isready --username=ricewind_e2e --dbname=ricewind_e2e
```

If 15432 is occupied, choose another free loopback port in both mapping and URL; never reuse an existing instance to make startup succeed. No persistent/production volume is mounted. After retaining evidence, the host may stop **only the container just created**, using `docker stop "$wp02_container"`; `--rm` removes that instance. Do not use blanket container/volume cleanup.

```sh
cd /mnt/vscode/ricewind-wp02-attribution-e2e
pnpm exec prisma --help
pnpm exec prisma migrate deploy --help
pnpm exec prisma generate --help
node --import tsx --help
node --import tsx tests/fixtures/wp02-browser-server.ts --help
pnpm exec playwright test --help

export DATABASE_URL='postgresql://ricewind_e2e:synthetic-only@127.0.0.1:15432/ricewind_e2e?schema=public'
export E2E_DISPOSABLE_DATABASE=ricewind_e2e
export WP02_BROWSER_E2E=1
export MEDIA_ROOT=/tmp/ricewind-wp02-attribution-media
# Refuse unsafe environment before even migration/seed tooling connects.
node --import tsx --input-type=module -e 'const {validateBrowserEnvironment}=await import("./tests/fixtures/wp02-browser-environment.ts"); validateBrowserEnvironment(process.env)'
DATABASE_URL='' pnpm exec prisma generate
pnpm exec prisma migrate deploy
node --import tsx tests/fixtures/seed-cms.ts
pnpm exec playwright test --config=playwright.wp02-attribution.config.ts --project=wp02-attribution-chromium --list
pnpm exec playwright test --config=playwright.wp02-attribution.config.ts --project=wp02-attribution-chromium
```

On an already migrated/seeded disposable instance (including CI), run **only the guarded Playwright command** again: do not seed again and never reset/drop the existing database. Do not set `E2E_BASE_URL` or `NODE_OPTIONS`. No need to export a HMAC secret; the launcher fixes the same value used by assertions. Read-only cached browser checks may precede execution; do not install browsers over the network in this task.

CI now runs the dedicated guarded project automatically using its existing service/seed, then the original suite; a dedicated `always()` upload collects `test-results/wp02-attribution-report.json` and failure traces under `test-results/wp02-attribution/`. Host should retain those same artifacts and record actual command/exit status before changing this report's pending status. Next dev can regenerate its local TypeScript metadata; inspect workspace diff after the host run, never copy runtime files back to an original tree. No claim of end-to-end pass is made by this patch.

## 首次宿主实跑失败与 locator 候选修正（2026-11-09）

- 宿主反馈：真实 migration 21 与 seed 已成功，首次 browser 实跑已进入 UI，但未通过。上文的 host pending 是此前记录；当前状态为“首次实跑失败，候选修正待宿主重跑”，不是 browser passed。
- 已读取 `test-results/wp02-attribution/` 下首 case（real `/u` 502）及 cookie 注入 case 的 `error-context.md`：均在 `submitForm` 的 `locator('#privacy').check()` 达到 90000ms 超时。该 ID 实际指向 `aria-hidden="true"` 的表单 input；BaseUI 可见的 `role="checkbox"` 控件拦截了对隐藏 input 的指针事件，不是需要延长超时。
- 候选修正仅针对专项测试：通过 `getByRole("checkbox", { name: "I agree to the processing of information needed for this inquiry under the privacy policy.", exact: true })` 定位真实可访问控件，先断言可见，再执行普通 `check()`，随后 `toBeChecked()`。不使用 force、JS 赋值或跳过 consent，不修改产品代码。
- 对照实际快照和表单实现检查了其余 selector：文本输入、分类选择/option、提交按钮及成功 alert 未发现同类明显不符，保持原样；全部六个候选 case 及归因、响应、持久化断言保留，不加超时、不跳测试，其他现有候选文件和改动保留。
- 本轮不执行 browser、API 或 DB 操作，不重新 migration/seed，不安装，不 commit/push/deploy。真实 browser 重跑留给宿主：仅在原先已迁移/已 seed 的隔离临时实例与原安全环境下重跑既有 guarded Playwright 命令，不重新 seed/reset/drop；保留真实退出码、报告和错误上下文。当前仍未验证 browser 通过。
- 本轮实际验证：`pnpm exec vitest run tests/wp02-*.test.ts` 通过（6 文件、70 测试，mock/离线单元测试，不是真实 API/DB/browser）；`pnpm typecheck` 通过；`pnpm exec eslint tests/wp02-browser/attribution.spec.ts` 通过。日志分别为 `/tmp/wp02-locator-focused.log`、`/tmp/wp02-locator-typecheck.log`、`/tmp/wp02-locator-focused-lint.log`。
- `pnpm lint` 已执行但未通过：136 errors / 158 warnings，错误来自宿主实跑生成的 `next-wp02-attribution-e2e/dev/types/`，另有既有源码 warnings；日志 `/tmp/wp02-locator-lint.log`。未删除/修改生成目录，也未改 lint 配置来规避；此结果不影响对“专项 lint 通过、全量 lint 未通过、browser 待宿主重跑”的分别记录。

## 第二次宿主真实失败：6 failed 与提交定位候选修正（2026-11-09）

- 宿主反馈：第二次真实 browser 重跑结果为 **6 failed，不是 passed**；checkbox 已通过，下一阻塞位于 `submitForm` 的 `page.locator('form button[type="submit"]')`，严格模式同时匹配 header 的 Search 与表单的 Send inquiry。上一节“提交按钮未发现明显不符”的判断已被本次真实结果推翻；当前状态为“第二次实跑 6 failed，提交定位候选修正待宿主重跑”，不能以单测或类型检查通过替代 browser 通过。
- 本次仅修专项测试的共享 `submitForm`：改用 `page.getByRole("button", { name: "Send inquiry", exact: true }).click()`，通过可访问角色和精确名称执行真实点击。保留 checkbox 的可见、普通 `check()` 与已勾选断言；不用 force、JS 点击或赋值，不增加超时，不跳测试和断言，不改产品代码，不 mock 真实 API/DB。六个 case 全部保留。
- 响应等待与点击纳入同一 `Promise.all`，先注册真实 `/api/inquiries` POST 响应等待，再触发点击；两者立即挂接拒绝处理，任一拒绝都使测试失败，点击失败后等待的后续拒绝也不会成为无人处理的拒绝。没有空 catch 或降级成功；HTTP 201、响应字段、referenceId、可见成功 alert、请求 payload、真实持久化和归因断言全部保留，业务失败仍会报错。
- 已复查整个 `submitForm` 及对应表单/选择器组件：五个字段 ID 在该 contact 表单入口对应明确控件，分类 trigger 后的 option 仍按原测试意图选择首项，checkbox 使用精确可访问名称；未发现其他同样明显的跨表单 submit 歧义。成功 alert 断言保持原样，不以缩小定位范围掩盖业务错误；最终运行时行为仍待宿主真实 browser 验证。
- 本轮实际验证全部通过：`pnpm exec eslint tests/wp02-browser/attribution.spec.ts`（退出码 0，日志 `/tmp/wp02-second-locator-focused-lint.log`）；`pnpm typecheck`（退出码 0，日志 `/tmp/wp02-second-locator-typecheck.log`）；`pnpm exec vitest run tests/wp02-*.test.ts`（6 文件、70 测试通过，退出码 0，日志 `/tmp/wp02-second-locator-focused-unit.log`）。单测仅使用既有离线/mock 边界，不连接真实 API/DB，也不构成真实 browser 通过证据。
- **生成漂移，不纳入交付**：宿主已通过 diff 确认 `next-env.d.ts` 自动切换到 `next-wp02-attribution-e2e/dev/types/`，`tsconfig.json` 自动新增该 dist 的 `types` / `dev/types` include；本轮未编辑这两文件，也未编辑或移动生成目录。宿主在运行结束后恢复这些已核实的生成修改，不覆盖其他候选改动；本轮 typecheck 是在当前生成漂移尚在的工作区执行。
- **全量 lint 仍待宿主重跑**：此前生成目录污染导致的失败记录保留，本轮仅跑 focused lint，不重跑全量 lint、不放宽配置。待宿主将本次 own 生成目录移到仓库外后，按原命令 `pnpm lint` 重跑并记录真实结果。
- 本轮保留 cwd 其余原候选，除本测试修复与本节追加外不作产品、配置或部署修改；未执行真实 browser、DB、API、生产操作、安装、commit 或 push。真实 browser 由宿主在原已迁移/已 seed 的隔离临时实例和安全环境下重跑既有 guarded Playwright 命令，不重新 seed/reset/drop，保留真实退出码及失败证据；本候选尚未验证 browser 通过。

## 第三轮宿主真实失败：6 failed 与成功提示定位候选修正（2026-11-09）

- 宿主反馈：第三轮真实 browser 仍为 **6 failed，不是 passed**；所有 case 的询盘 API 均已返回 HTTP 201，随后共享 `submitForm` 的 `page.getByRole("alert")` 同时匹配询盘成功提示与 Next `__next-route-announcer__`，触发严格模式错误。上一节对成功 alert 无歧义的判断已被实跑推翻；API 201 不代表后续 UI、SQL 和完整 browser 链路已通过。
- 本次仅改 `tests/wp02-browser/attribution.spec.ts` 的成功提示定位：使用 `page.getByRole("alert").filter({ hasText: result.referenceId })`，依次断言 `toHaveCount(1)`、`toBeVisible()`、`toContainText(result.referenceId)`。不按顺序挑选成功 alert，不使用 `first()` / `nth()` / force 绕过此歧义，不跳过、弱化或延长断言，不改产品代码。
- 已一次性核对该 spec 其余断言及定位：输入字段 ID、精确名称的 checkbox 与 Send inquiry 按钮均保留；原分类 option 的 `first()` 是既有任意首项选择步骤，非本次新增，也不用于消除成功提示或断言歧义，按本轮仅修成功提示的范围保留。其余 payload、cookie、响应键与引用号、归因字段、真实 SQL pageview、Inquiry / Outbox 数量及状态、并发重试结果与不可覆盖断言均保持原样；未发现其他同类无范围角色断言，运行时唯一性仍未验证。
- 本轮实际静态检查通过：`pnpm exec eslint tests/wp02-browser/attribution.spec.ts`（退出码 0，日志 `/tmp/wp02-third-locator-focused-lint.log`）；`pnpm exec tsc --noEmit --incremental false`（退出码 0，日志 `/tmp/wp02-third-locator-typecheck.log`，不写增量缓存）。TypeScript 检查使用当前工作区配置，不修改既有生成漂移；未重跑全量 lint、单测或真实 browser。
- 原候选与其他工作区改动保留，本轮仅改专项测试并追加本报告；未操作 DB/API、未安装、commit 或 push。**当前真实 browser 状态仍是第三轮 6 failed；本定位修正尚待宿主重跑，禁止据静态检查声称 browser 通过。**

## 宿主真实专项验收通过

全新一次性 PostgreSQL16，21个迁移与CMS seed成功；真实Chromium执行6/6 passed（11.7s），无skip/flaky。覆盖真实/u 502设置HttpOnly cookie、SQL pageview精确会话匹配、真实表单/API/DB、cookie伪造防护、幂等重放以及旧/缺失/过期/格式错误客户端。未发邮件；owned容器删除成功。只证明上游隔离502分支，不证明Umami ingestion或销售qualified。此前三轮定位错误保留历史，本节为最新实际结果。生成目录已归档到仓库外，已核实Next自动生成的next-env.d.ts/tsconfig.json漂移恢复；后续门禁以新日志为准。

最终宿主门禁：完整单元测试、原样pnpm lint、标准pnpm build与standalone资源验证、构建后非增量typecheck通过；实际计数以归档日志为准。源码未改动；生成漂移未纳入Git。托管CI尚待执行。
