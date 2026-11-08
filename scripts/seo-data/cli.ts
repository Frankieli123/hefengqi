import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { canonical, dateRange, optionsSchema, researchPrivacy, scopeKey, timezoneFor } from "./model";
import { collect, requests } from "./adapters";
import { persist, validateOutput, validatePrivateResearchOutput } from "./store";

const help = `Read-only SEO/GEO aggregate sync (no scheduler, no credential discovery)
Usage: node --import tsx scripts/seo-data/cli.ts --source gsc|umami --start YYYY-MM-DD --end YYYY-MM-DD --output /workspace/evidence [--dry-run]
Optional: --dimensions date,page,query,country,device (GSC only; default date)
          --events inquiry-click,inquiry-success,product-view (exact Umami whitelist)
          --umami-version 3.4.0 --umami-image sha256:... (operator identity assertion)
          --probe-event inquiry-click [--probe-date YYYY-MM-DD] (known positive prior Shanghai day)
          --row-limit 1000 --max-pages 20 (bounds: 25000 rows/page, 100 pages/day, 366 days/run, 100000 observations/run)
          --gsc-min-age-days 3 (3..30 PT calendar days; not a finality guarantee)
          --gsc-recheck-after-days 7 (1..30 days; manual rerun, including covered dates)
GSC runtime env: GSC_SITE_URL, GSC_ACCESS_TOKEN (short-lived readonly token)
Umami runtime env: UMAMI_API_URL (explicit HTTPS origin by default), UMAMI_WEBSITE_ID, UMAMI_ACCESS_TOKEN
Local exception: --umami-tunnel-local --umami-tunnel-port PORT (1024..65535)
  SECURITY ACKNOWLEDGEMENT: --umami-tunnel-local attests that this CLI must run via an
  already-authorized SSH local tunnel on the CLI process's own host.
  This is operator attestation, not tunnel/session verification; a local listener can be malicious.
  UMAMI_API_URL must exactly equal http://127.0.0.1:PORT (no slash/path/userinfo/query).
  No automatic SSH/tunnel, credential discovery, production changes, or public port exposure.
  Operator example (existing approved SSH authentication, separate terminal on CLI host):
    ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:13008:127.0.0.1:3008 APPROVED_SSH_HOST
  Then set UMAMI_API_URL=http://127.0.0.1:13008 and use both tunnel flags with port 13008.
  Provision UMAMI_ACCESS_TOKEN securely in process env only, never CLI args or output.
--dry-run validates and builds unauthenticated request plans, never calls network or writes files.
Without --dry-run an explicit run fetches aggregates and atomically updates ledger.json.
Backfill/overlap: explicitly rerun --start/--end; no automatic checkpoint-driven requests.
Unverified no rows != zero; contact-clicks != inquiries/sales; GA4 is blocked/unconfigured.
Output: external private evidence directory or ./evidence; never source/public/runtime paths.
All dates are complete source days: GSC America/Los_Angeles, Umami Asia/Shanghai.
GSC API-exhausted dimension tables are NOT true property totals.
GSC page/query values are SHA-256 identity keys, not raw URLs/search strings (privacy).
Empty GSC days are unconfirmed/incomplete; unknown Umami identity remains partial.
Exact Umami requires supported identity plus fresh positive/negative probes each execution.
Identity assertions are not runtime proof; operators must externally recheck host identity.
Only configured_events_exact, not all events. Duplicate emissions count; inquiry-success != valid inquiry.
Exact Umami bounds: 366 days, 3 events, 1100 requests / 3300 maximum HTTP attempts.
Checkpoints describe revisable API-visible nonempty coverage, not guaranteed final property totals.
--gsc-research: GSC-only explicit opt-in, raw_page_query_private, outside Git only.
研究隐私：${researchPrivacy}
默认 sha256_page_query 不变；普通与研究账本禁止混写，切模式必须另选私有目录。
页面必须是授权 property 范围内无 userinfo/query/hash 的 http/https URL；不抓取页面。
离线摘要：summarizeResearch(output, selection) 默认只返回 hash；显式 exportResearch
仅在同一私有账本目录创建新的 0600 JSON 可读报告，不覆盖；内容不可信，不作 HTML/指令执行。
能力门禁：researchCapable 是本地代码能力，local/mock 不代表 live；not production research ready.
`;

export async function cli(args: string[], environment: Record<string, string | undefined>, fetcher: typeof fetch = fetch, now?: Date): Promise<{ code: number; text: string }> {
  try {
    const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: {
      help: { type: "boolean" }, "dry-run": { type: "boolean" }, source: { type: "string" }, start: { type: "string" }, end: { type: "string" }, output: { type: "string" }, dimensions: { type: "string" }, events: { type: "string" }, "row-limit": { type: "string" }, "max-pages": { type: "string" }, "gsc-min-age-days": { type: "string" }, "gsc-recheck-after-days": { type: "string" },
      "umami-version": { type: "string" }, "umami-image": { type: "string" }, "probe-event": { type: "string" }, "probe-date": { type: "string" },
      "umami-tunnel-local": { type: "boolean" }, "umami-tunnel-port": { type: "string" },
      "gsc-research": { type: "boolean" },
    } });
    if (values.help) return { code: 0, text: help };
    if (!values.source || !values.start || !values.end || !values.output || !["gsc", "umami"].includes(values.source)) throw new Error("EXPLICIT_ARGUMENTS_REQUIRED");
    if (values.source === "gsc" && values.events || values.source === "umami" && (values.dimensions || values["gsc-research"] || values["gsc-min-age-days"] || values["gsc-recheck-after-days"])) throw new Error("INVALID_SOURCE_OPTIONS");
    const gsc = values.source === "gsc";
    if (gsc && [values["umami-version"], values["umami-image"], values["probe-event"], values["probe-date"], values["umami-tunnel-local"], values["umami-tunnel-port"]].some((value) => value !== undefined)) throw new Error("INVALID_SOURCE_OPTIONS");
    const tunnelLocal = values["umami-tunnel-local"];
    const tunnelPort = values["umami-tunnel-port"];
    if ((tunnelLocal !== undefined || tunnelPort !== undefined) && (tunnelLocal !== true || !tunnelPort || !/^[1-9]\d{3,4}$/.test(tunnelPort))) throw new Error("EXPLICIT_TUNNEL_CONSENT_AND_PORT_REQUIRED");
    const property = gsc ? environment.GSC_SITE_URL : environment.UMAMI_WEBSITE_ID;
    const token = gsc ? environment.GSC_ACCESS_TOKEN : environment.UMAMI_ACCESS_TOKEN;
    await (values["gsc-research"] ? validatePrivateResearchOutput(values.output) : validateOutput(values.output));
    const options = optionsSchema.parse({ source: values.source, property: property ?? "unconfigured", start: values.start, end: values.end,
      ...(gsc ? {} : { baseURL: environment.UMAMI_API_URL }),
      ...(tunnelLocal ? { umamiTunnel: { local: true, port: Number(tunnelPort) } } : {}),
      ...(!gsc && (values["umami-version"] || values["umami-image"]) ? { umamiIdentity: { version: values["umami-version"], image: values["umami-image"] } } : {}),
      probeEvent: values["probe-event"], probeDate: values["probe-date"],
      dimensions: gsc ? values.dimensions?.split(",") ?? ["date"] : [], events: values.events?.split(",") ?? [],
      rowLimit: values["row-limit"] ? Number(values["row-limit"]) : 1000, maxPages: values["max-pages"] ? Number(values["max-pages"]) : 20,
      gscMinAgeDays: values["gsc-min-age-days"] ? Number(values["gsc-min-age-days"]) : 3,
      gscRecheckAfterDays: values["gsc-recheck-after-days"] ? Number(values["gsc-recheck-after-days"]) : 7,
      ...(values["gsc-research"] ? { gscResearch: true } : {}),
    });
    dateRange(options.start, options.end, timezoneFor(options.source), now ?? new Date());
    if (token && canonical(options).includes(token)) throw new Error("CREDENTIAL_IN_METADATA");
    if (!property || !gsc && !environment.UMAMI_API_URL) return { code: 2, text: JSON.stringify({ status: "unconfigured", reason: "missing_configuration", ga4: "blocked_unconfigured" }) };
    const plans = requests(options, now ?? new Date());
    const privacy = { dimensionEncoding: gsc ? options.gscResearch ? "raw_page_query_private" : "sha256_page_query" : "configured_event_names", ...(options.gscResearch ? { warning: researchPrivacy } : {}) };
    if (values["dry-run"]) return { code: 0, text: JSON.stringify({ mode: "dry-run", status: token ? "configured_not_verified" : "unconfigured", privacy, requests: plans, pagination: { rowLimit: options.rowLimit, maxPages: options.maxPages }, network: false, writes: false, ga4: "blocked_unconfigured" }) };
    const evidenceKind = fetcher === fetch ? "live_api" as const : "fixture" as const;
    const run = await collect(options, { fetch: fetcher, token, now, evidenceKind });
    const evidence = await persist(values.output, run);
    return { code: run.status === "complete" ? 0 : 2, text: JSON.stringify({ status: run.status, reason: run.reason, completeness: run.completeness, gscPolicy: run.gscPolicy, days: run.days, privacy, evidenceKind, scope: scopeKey(run), researchCapable: gsc, researchReady: false, gates: { local: "requires_local_validation", mock: "not_live_evidence", live: "not_verified_by_this_cli" }, observationCount: run.observations.length, ...evidence }) };
  } catch {
    return { code: 1, text: "SEO_DATA_FAILED: arguments, endpoint, response or evidence store rejected; details redacted. Use --help." };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void cli(process.argv.slice(2), process.env).then((result) => { process.stdout.write(`${result.text}\n`); process.exitCode = result.code; });
}
