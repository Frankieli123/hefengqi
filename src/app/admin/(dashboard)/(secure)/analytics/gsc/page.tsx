import { requireSecureAdmin } from "@/lib/admin-session";
import { searchAnalyticsQuery, validateGscDates, defaultGscDates, type GscQuery, type GscRow } from "@/lib/gsc-reporting";
import styles from "./page.module.css";
export const metadata = { title: "搜索表现", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
type Block = { rows?: GscRow[]; error?: boolean };
const param = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
const metric = (value: number, digits = 0) => new Intl.NumberFormat("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const href = (start: string, end: string, pages: number, queries: number) => `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&pages=${pages}&queries=${queries}`;
function rowsTable(title: string, rows: GscRow[], kind: "date" | "page" | "query", start: string, end: string, pages: number, queries: number, error = false) {
 const offset = kind === "page" ? pages : queries, visible = kind === "date" ? rows : rows.slice(0, 50);
 return <section className={styles.section}><div className={styles.sectionHead}><h2>{title}</h2></div>{error ? <p className={styles.error}>读取失败，请检查 GSC 配置或服务账号权限；未将错误显示为零。</p> : visible.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{kind === "date" ? "日期" : kind === "page" ? "页面" : "搜索词"}</th><th>点击</th><th>曝光</th><th>CTR</th><th>平均排名</th></tr></thead><tbody>{visible.map((row, i) => <tr key={`${row.keys.join("|")}-${i}`}><td>{row.keys[0]}</td><td>{metric(row.clicks)}</td><td>{metric(row.impressions)}</td><td>{metric(row.ctr * 100, 1)}%</td><td>{metric(row.position, 1)}</td></tr>)}</tbody></table></div> : <p className={styles.empty}>暂无搜索数据</p>}{!error && kind !== "date" && (offset > 0 || rows.length > 50) && <nav className={styles.presets} aria-label={`${title}分页`}><span>第 {Math.floor(offset / 50) + 1} 页</span>{offset > 0 && <a href={href(start, end, kind === "page" ? offset - 50 : pages, kind === "query" ? offset - 50 : queries)}>上一页</a>}{rows.length > 50 && <a href={href(start, end, kind === "page" ? offset + 50 : pages, kind === "query" ? offset + 50 : queries)}>下一页</a>}</nav>}</section>;
}
async function section(query: GscQuery): Promise<Block> { try { return { rows: await searchAnalyticsQuery(query) }; } catch { return { error: true }; } }
export default async function GscPage({ searchParams }: Props) {
 await requireSecureAdmin();
 const params = await searchParams ?? {}, defaults = defaultGscDates();
 const start = param(params.start) || defaults.startDate, end = param(params.end) || defaults.endDate;
 const offset = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Math.floor(Number(value) / 50) * 50 : 0;
 const pages = offset(param(params.pages)), queries = offset(param(params.queries));
 let invalid = false;
 try { validateGscDates(start, end); } catch { invalid = true; }
 const [overview, daily, pageRows, queryRows] = invalid ? [{}, {}, {}, {}] as Block[] : await Promise.all([
  section({ startDate: start, endDate: end, dimensions: [], rowLimit: 1 }), section({ startDate: start, endDate: end, dimensions: ["date"], rowLimit: 25000 }), section({ startDate: start, endDate: end, dimensions: ["page"], rowLimit: 51, startRow: pages }), section({ startDate: start, endDate: end, dimensions: ["query"], rowLimit: 51, startRow: queries }),
 ]);
 const summary = overview.rows?.[0];
 return <main className={styles.shell}><header className={styles.mast}><div><h1 className={styles.title}>搜索表现</h1><p className={styles.sub}>Google Search Console · ricewind.com</p></div><a href="/admin/analytics">分析总览</a></header>
 <form className={styles.toolbar} action="/admin/analytics/gsc" method="get"><div className={styles.range}><label>开始日期<input type="date" name="start" defaultValue={start}/></label><label>结束日期<input type="date" name="end" defaultValue={end}/></label><button type="submit">应用日期</button></div><input type="hidden" name="pages" value="0"/><input type="hidden" name="queries" value="0"/></form>
 <p className={styles.notice}>GSC 数据通常延迟 2-3 天，按加州时区切日。GSC 搜索点击与 GA4 网站访问量口径不同，不可直接相加。</p>
 {invalid ? <p className={styles.error}>日期范围无效，请选择真实日期且开始日期不晚于结束日期。</p> : <>
 <section className={styles.section}><div className={styles.sectionHead}><h2>概览</h2></div>{summary && summary.clicks === 0 && summary.impressions === 0 && <p className={styles.notice}>接口正常，该时间段暂无搜索曝光/点击。以下为 Google 返回的真实零值。</p>}{overview.error ? <p className={styles.error}>读取失败，未将错误显示为零</p> : summary ? <div className={styles.grid}>{[["点击", metric(summary.clicks)], ["曝光", metric(summary.impressions)], ["CTR", `${metric(summary.ctr * 100, 1)}%`], ["平均排名", metric(summary.position, 1)]].map(([label, value]) => <div className={styles.metric} key={label}><small>{label}</small><strong>{value}</strong></div>)}</div> : <p className={styles.empty}>暂无搜索数据 · —</p>}</section>
 {rowsTable("按日趋势", daily.rows ?? [], "date", start, end, pages, queries, daily.error)}{rowsTable("按页面 · Top pages", pageRows.rows ?? [], "page", start, end, pages, queries, pageRows.error)}{rowsTable("按搜索词 · Top queries", queryRows.rows ?? [], "query", start, end, pages, queries, queryRows.error)}
 </>}</main>;
}
