# Analytics candidate traffic policy

## Policy

- Release scope is this candidate application only. The backend uses one shared, case-insensitive `CRAWLER_PATTERN` in JavaScript and PostgreSQL for explicit automation User-Agent evidence.
- Recognized automation is excluded before forwarding to Umami, cookie issuance, local persistence, overview PV/UV/session aggregation, daily traffic, top paths, and visitor-detail historical reporting.
- Country, language, browser version, and IP are never exclusion signals. An unclassified browser UA, an empty UA, and an IP are not proof of a human. Empty or missing UA is retained and reported as unknown; other non-automation records are candidate traffic, not verified humans.
- Local PV, cookie-based UV, and session-key sessions cover records actually retained by the existing 90-day pruning policy. “All” means the available retention window, not all-time history. Missing visitor/session identifiers make that metric unavailable rather than using an IP fallback.
- Local page-view records remain the raw historical source; this change does not migrate or delete historical data. Existing pruning remains limited to records older than 90 days.
- Duration, bounces, bounce rate, and inquiry conversion are unavailable because local page-view records do not provide reliable active/exit duration or row-level inquiry attribution. No Umami denominators are mixed into local counts.
- Umami geography/device/event metrics remain supplementary legacy data and are labeled as not historically bot-cleaned. They do not change the local candidate counts.

This is a conservative UA-evidence filter, not a promise of complete automation detection. No CAPTCHA, fingerprinting, or provider configuration is added.

## Rollout and rollback

Before release, review the local candidate dashboard and confirm the displayed retention window and unknown-UA count. Rollout is the normal application release process; production access, deployment, credentials, `.env` files, and external services are intentionally outside this task.

Rollback is a normal application rollback to the prior candidate release. Do not delete or rewrite `AnalyticsPageView` rows. If counts appear unavailable, keep the raw data and investigate the local query/application health; do not replace unavailable values with zero or re-enable unfiltered denominators.

## Verification

Commands run for this change:

- `git diff --check` — pending final local toolchain availability.
- `pnpm vitest run ...` — pending; the workspace `node_modules` symlink points to another project and was not used under the task scope restriction.
- `pnpm typecheck` — pending for the same reason.
- `pnpm eslint ...` — pending for the same reason.

No build or deployment was run.

Additional local verification:

- `node --experimental-vm-modules --disable-warning=ExperimentalWarning /tmp/analytics-isolated-check.cjs` — passed 55 mocked checks, including shared UA classification, read-only local SQL construction, overview cache/fallback behavior, DST boundaries, route forwarding/storage/cookie behavior, retention, and stable visitor/session cookies.
- `node --disable-warning=ExperimentalWarning` with Node's `stripTypeScriptTypes` syntax harness — passed for all changed TypeScript sources/tests.
- `git diff --check -- src docs` — passed.

The isolated harness deliberately mocks the database, network, Next route APIs, and geo lookup; it does not replace the unavailable Vitest, TypeScript, ESLint, or PostgreSQL integration runs.

## Parent independent verification
- SITE_URL=https://ricewind.com vitest: 371 passed, 2 database tests skipped.
- tsc --noEmit passed; targeted eslint 0 errors, 2 warnings; diff check passed.
- Isolated webpack production build passed, 11 required routes verified. Existing external dependency symlink prevents Turbopack; webpack used.
- Production staging SQL verification remains a release gate.
