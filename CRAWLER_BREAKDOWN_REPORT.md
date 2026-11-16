# Local crawler breakdown report

## Scope

This mirror adds an optional, read-only `trafficBreakdown` to the existing local analytics aggregate. It uses one bounded SQL statement over stored `AnalyticsPageView` rows from the latest 90 days (and the selected period inside that window). It does not change the write endpoint, persistence schema, dependencies, or telemetry.

## Definitions

- **Recorded raw PV**: all rows retained in the selected period.
- **Explicit automation PV**: rows matching the existing shared case-insensitive User-Agent classifier using PostgreSQL `C` collation.
- **Remaining candidate PV**: stored rows not matching that classifier. They are not verified humans or high-confidence traffic.
- **Missing-UA PV**: a subset of candidate PV, not an additive bucket.
- Crawler brands use one ordered definition list: Baidu, Google, Bing, Yandex, AI tools, SEO tools, Other. The first matching hint wins; the final brand is only an acknowledged UA hint.

Each crawler brand reports PV, distinct paths, first/last timestamps, bounded masked-IP samples, and bounded country/region/city, page-language, and path counts. Raw IP addresses are never selected by this aggregate. Counts are ranked with deterministic limits (3 masked IP samples, 8 ordinary dimensions, 10 paths).

## Limitations and coverage

The filter releases stop persisting explicit automation, so historical stored rows are not a complete record of crawler requests. An empty crawler snapshot does not establish that no crawler requests occurred. No DNS validation or forward-confirmation is performed. Brand, geography, language, and path are stored/request hints: geography is not verified location, and no inferred mapping is made. Page locale is not visitor language. All output is limited to rows that were actually stored; it cannot reconstruct filtered requests or missing history.

The UI intentionally states these limitations and avoids labels such as ordinary-UA verified, high confidence, or verified human.

## Verification

- All 11 mirrored TypeScript/TSX source and test files transpile with the locally available TypeScript compiler.
- Standalone classifier checks passed for ordered brand precedence, fallback, non-automation UAs, missing UAs, and Unicode lookalikes.
- Full Vitest/typecheck/build were not runnable in this source-only mirror because project dependencies and configuration are not present; the build machine should run them after sync.
