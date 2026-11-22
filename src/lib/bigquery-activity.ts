import { createHash, createSign } from "node:crypto";
import { readFile } from "node:fs/promises";

export type BqSession = {
  id: string; userPseudoId?: string; sessionId?: string; startedAt: string; lastAt: string;
  country: string; region: string; city: string; source: string; medium: string; device: string;
  browser: string; os: string; landingPage: string; lastPage: string; pageViews: number; eventCount: number;
};
export type BqEvent = { timestamp: string; name: string; pageLocation: string; pageTitle: string; country: string; region: string; city: string; device: string };
export type BqActivityResult = { status: "ready" | "waiting" | "unavailable"; sessions: BqSession[]; selected?: { id: string; events: BqEvent[] }; message?: string };
type QueryResult = unknown;
export type BigQueryQuery = (sql: string, params?: Record<string, string>) => Promise<QueryResult>;

type Json = Record<string, unknown>;
const timeoutMs = 15_000;
const validIdentifier = /^[A-Za-z0-9_-]{1,1024}$/;
const validProject = /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/;
const validDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const utf8base64url = (value: string) => Buffer.from(value).toString("base64url");
const idFor = (user: string, session: string) => createHash("sha256").update(`${user}:${session}`).digest("hex").slice(0, 12);
const safeObject = (value: unknown): Json => value !== null && typeof value === "object" ? value as Json : {};
const text = (value: unknown): string => typeof value === "string" ? value : value == null ? "" : String(value);
const fields = (row: Json): unknown[] => Array.isArray(row.f) ? row.f.map((item: unknown) => safeObject(item).v) : [];
const scalar = (value: unknown): string => {
 if(value==null)return "";
 if(typeof value==="object"){const object=safeObject(value);return text(object.stringValue??object.timestampValue??object.integerValue??object.value);}
 return String(value);
};
const fieldValues = (value: Json): Json[] => {const values=safeObject(value.arrayValue).values;return Array.isArray(values)?values.map((item:unknown)=>safeObject(safeObject(item).v)):[];};
const nestedValue = (values: Json[], key: string): string => { const found = values.find(v => text(safeObject(v.key).name) === key); return found ? scalar(safeObject(found.value)) : ""; };
const parseError = (raw: unknown): string => {
  const root = safeObject(raw), err = safeObject(root.error), first=Array.isArray(err.errors)?err.errors[0]:null;
  return `${text(err.status)} ${text(err.message)} ${text(safeObject(first).reason)}`.toLowerCase();
};

async function serviceAccountToken(): Promise<string> {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) throw new Error("未配置 BigQuery 服务账号");
  const credentials = JSON.parse(await readFile(path, "utf8")) as Json;
  if (credentials.type !== "service_account" || typeof credentials.client_email !== "string" || typeof credentials.private_key !== "string" || typeof credentials.token_uri !== "string" || !credentials.token_uri.startsWith("https://oauth2.googleapis.com/")) throw new Error("服务账号凭据无效");
  const now = Math.floor(Date.now() / 1000);
  const header = utf8base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = utf8base64url(JSON.stringify({ iss: credentials.client_email, scope: "https://www.googleapis.com/auth/bigquery", aud: credentials.token_uri, iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256"); signer.update(unsigned); signer.end();
  const assertion = `${unsigned}.${signer.sign(credentials.private_key).toString("base64url")}`;
  const response = await fetch(credentials.token_uri, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }), signal: AbortSignal.timeout(timeoutMs) });
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok || typeof safeObject(raw).access_token !== "string") throw new Error(`BigQuery OAuth failed ${response.status}`);
  return safeObject(raw).access_token as string;
}

async function productionQuery(sql: string, params: Record<string, string> = {}): Promise<unknown> {
  const project = process.env.BIGQUERY_PROJECT_ID || "western-grid-479807-b8";
  const dataset = process.env.BIGQUERY_DATASET || "analytics_565392520";
  if (!validProject.test(project) || !validIdentifier.test(dataset)) throw new Error("BigQuery 项目或数据集标识无效");
  const token = await serviceAccountToken();
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(project)}/queries`;
  const queryParameters = Object.entries(params).map(([name, value]) => ({ name, parameterType: { type: "STRING" }, parameterValue: { value } }));
  const response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ query: sql, useLegacySql: false, location: process.env.BIGQUERY_LOCATION || "asia-southeast1", maxResults: 50000, timeoutMs: 12000, parameterMode: "NAMED", queryParameters }), signal: AbortSignal.timeout(timeoutMs) });
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`BigQuery request failed ${response.status}: ${parseError(raw)}`);
  const result = safeObject(raw);
  if (result.jobComplete === false && typeof safeObject(result.jobReference).jobId === "string") throw new Error("BigQuery 查询超时");
  if (Array.isArray(result.errors)&&result.errors.length) throw new Error("BigQuery 查询失败");
  return raw;
}

function resultRows(raw: unknown): Json[] { const root=safeObject(raw), rows=root.rows, schema=safeObject(root.schema); return Array.isArray(rows) ? rows.map(row=>({...safeObject(row),schema})) : []; }
function rowObject(raw: unknown): Json {
  const root = safeObject(raw), schema = safeObject(root.schema);
  if (Array.isArray(root.f) && Array.isArray(schema.fields)) {
    const names = schema.fields.map((f: unknown) => text(safeObject(f).name));
    return Object.fromEntries(fields(root).map((v, i) => [names[i] || String(i), v]));
  }
  return root;
}
function valueAt(raw: Json, name: string): string { const value = safeObject(raw[name]); return scalar(value) || text(raw[name]); }
function isMissing(error: unknown): boolean { return /not found|notfound|404|table.*does not exist|dataset.*does not exist/.test(String(error).toLowerCase()); }

export async function getBigQueryActivity(input: { start: string; end: string; session?: string }, api: BigQueryQuery = productionQuery): Promise<BqActivityResult> {
  try {
    if (!validDate(input.start) || !validDate(input.end)) throw new Error("日期格式无效");
    const days = (Date.parse(`${input.end}T00:00:00Z`) - Date.parse(`${input.start}T00:00:00Z`)) / 86_400_000;
    if (days < 0 || days > 365) throw new Error("日期范围须为 1 至 366 天");
    const project = process.env.BIGQUERY_PROJECT_ID || "western-grid-479807-b8";
    const dataset = process.env.BIGQUERY_DATASET || "analytics_565392520";
    if (!validProject.test(project) || !validIdentifier.test(dataset)) throw new Error("BigQuery 项目或数据集标识无效");
    const tablesSql = `SELECT table_id FROM \`${project}.${dataset}.__TABLES__\` WHERE REGEXP_CONTAINS(table_id, r'^events(_intraday)?_[0-9]{8}$')`;
    const metadata = await api(tablesSql);
    const metadataRows = resultRows(metadata).map(row => rowObject(row));
    const available = new Set(metadataRows.map(row => valueAt(row, "table_id")).filter(id => /^events(_intraday)?_\d{8}$/.test(id)));
    const tables: string[] = [];
    for (let day = 0; day <= days; day++) {
      const date = new Date(Date.parse(`${input.start}T00:00:00Z`) + day * 86_400_000).toISOString().slice(0, 10).replaceAll("-", "");
      const daily = `events_${date}`, intra = `events_intraday_${date}`;
      if (available.has(daily)) tables.push(daily); else if (available.has(intra)) tables.push(intra);
    }
    if (!tables.length) return { status: "waiting", sessions: [], message: "所选日期尚无可用的 GA4 事件表" };
    const tableRefs = tables.map(t => `\`${project}.${dataset}.${t}\``);
    const eventSql = (table: string) => `SELECT FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%E3SZ', TIMESTAMP_MICROS(event_timestamp)) AS event_time, event_name, user_pseudo_id, CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING) AS session_id, (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') AS page_location, (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_title') AS page_title, geo.country AS country, geo.region AS region, geo.city AS city, device.category AS device, device.web_info.browser AS browser, device.operating_system AS os, collected_traffic_source.manual_source AS source, collected_traffic_source.manual_medium AS medium FROM ${table} WHERE user_pseudo_id IS NOT NULL AND (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') IS NOT NULL`;
    const eventsSql = `${tableRefs.map(eventSql).join(" UNION ALL ")} ORDER BY event_time DESC LIMIT 50000`;
    const eventResult = await api(eventsSql);
    const rawRows = resultRows(eventResult);
    if (safeObject(safeObject(eventResult).schema).fields && rawRows.length === 0) return { status: "ready", sessions: [] };
    const events = rawRows.map(row => rowObject(row));
    if (!events.length) return { status: "ready", sessions: [] };
    const groups = new Map<string, Json[]>();
    for (const event of events) {
      const user = valueAt(event, "user_pseudo_id"), session = valueAt(event, "session_id");
      if (!user || !/^\d+$/.test(session)) continue;
      const id = idFor(user, session), group = groups.get(id) ?? [];
      group.push(event); groups.set(id, group);
    }
    const sorted = [...groups.entries()].map(([id, rows]) => ({ id, rows: rows.sort((a, b) => valueAt(a, "event_time").localeCompare(valueAt(b, "event_time"))) })).sort((a, b) => valueAt(b.rows[b.rows.length - 1]!, "event_time").localeCompare(valueAt(a.rows[a.rows.length - 1]!, "event_time"))).slice(0, 50);
    const sessions: BqSession[] = sorted.map(({ id, rows }) => {
      const first = rows[0]!, last = rows[rows.length - 1]!;
      const pageRows = rows.map(event => ({ ...event, page_location: nestedValue(fieldValues(safeObject(event.event_params)), "page_location") || valueAt(event, "page_location"), page_title: nestedValue(fieldValues(safeObject(event.event_params)), "page_title") || valueAt(event, "page_title") }));
      const pages = pageRows.filter(e => valueAt(e, "page_location"));
      return { id, startedAt: valueAt(first, "event_time"), lastAt: valueAt(last, "event_time"), country: valueAt(last, "country"), region: valueAt(last, "region"), city: valueAt(last, "city"), source: valueAt(last, "source"), medium: valueAt(last, "medium"), device: valueAt(last, "device"), browser: valueAt(last, "browser"), os: valueAt(last, "os"), landingPage: valueAt(pages[0] ?? {}, "page_location"), lastPage: valueAt(pages[pages.length - 1] ?? {}, "page_location"), pageViews: rows.filter(e => valueAt(e, "event_name") === "page_view").length, eventCount: rows.length };
    });
    const selected = input.session && sorted.find(item => item.id === input.session);
    const detail = selected ? { id: selected.id, events: selected.rows.slice(0, 500).map(e => {
      const params = fieldValues(safeObject(e.event_params));
      return { timestamp: valueAt(e, "event_time"), name: valueAt(e, "event_name"), pageLocation: nestedValue(params, "page_location") || valueAt(e, "page_location"), pageTitle: nestedValue(params, "page_title") || valueAt(e, "page_title"), country: valueAt(e, "country"), region: valueAt(e, "region"), city: valueAt(e, "city"), device: valueAt(e, "device") };
    }) } : undefined;
    return { status: "ready", sessions, ...(detail ? { selected: detail } : {}) };
  } catch (error) {
    return { status: isMissing(error) ? "waiting" : "unavailable", sessions: [], message: isMissing(error) ? "所选日期尚无可用的 GA4 事件表" : "BigQuery 活动读取失败，请检查配置或权限" };
  }
}
