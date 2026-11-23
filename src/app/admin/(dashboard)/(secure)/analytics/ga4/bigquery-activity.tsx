import type { BqActivityResult, BqEvent, BqSession } from "@/lib/bigquery-activity";
import { countryCode, formatCity, formatCountry, formatDevice, formatEventName, formatRegion, formatSource } from "@/lib/ga4-display";
import styles from "./page.module.css";

const time = (value: string, seconds = false) => {
 const date = new Date(value);
 if (!Number.isFinite(date.getTime())) return value || "未知";
 return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}), hour12: false }).format(date);
};
const page = (value: string) => {
 if (!value) return "未记录";
 try { const url = new URL(value); return `${url.pathname}${url.search}`; } catch { return value; }
};
const source = (session: BqSession) => session.source ? formatSource(`${session.source} / ${session.medium || "(none)"}`) : "直接访问";
const geography = (item: { country: string; region: string; city: string }) => {const code=countryCode(item.country);return [formatCountry(item.country || "未设置",code), formatRegion(item.region || "(not set)",code), formatCity(item.city || "(not set)",code)].filter((value, index) => index === 0 || value !== "未设置").join(" · ");};

function Timeline({ events }: { events: BqEvent[] }) {
 return <div className={styles.timeline}><div className={styles.timelineHead}><span>时间</span><span>事件</span><span>页面 / 标题</span><span>地区与设备</span></div>{events.map((event, index) => <div className={styles.timelineRow} key={`${event.timestamp}-${index}`}><time>{time(event.timestamp, true)}</time><strong>{formatEventName(event.name)}</strong><div><b>{event.pageTitle || "未设置标题"}</b><span>{page(event.pageLocation)}</span></div><span>{geography(event)} · {formatDevice(event.device || "(not set)")}</span></div>)}</div>;
}

export function BigQueryActivity({ result, base, start, end }: { result: BqActivityResult; base: string; start: string; end: string }) {
 const href = (session?: string) => `${base}?start=${start}&end=${end}${session ? `&session=${session}` : ""}#bigquery-activity`;
 return <div className={styles.panel} id="bigquery-activity"><div className={styles.sectionHead}><div><h3>逐会话访问</h3><p>BigQuery 原始事件 · 匿名会话，可展开逐条时间线 · <strong>近实时，通常几分钟内更新</strong></p></div><span className={styles.chip}>Daily 优先，Intraday 补充</span></div>
  {result.status === "waiting" && <div className={styles.empty}>BigQuery 已关联，等待所选日期的首批事件表生成。以下 GA4 聚合活动仍可查看。</div>}
  {result.status === "unavailable" && <div className={styles.error} role="status">{result.message ?? "BigQuery 活动读取失败"}。以下 GA4 聚合活动仍可查看。</div>}
  {result.status === "ready" && !result.sessions.length && <div className={styles.empty}>所选日期已可查询，但未返回带匿名会话 ID 的原始事件；不显示为 0 个访客。</div>}
  {result.status === "ready" && result.sessions.length > 0 && <>
   <p className={styles.muted}>最近 {result.sessions.length} 个匿名会话。原始 Streaming 为尽力服务，可能受延迟与上传完整性影响；不代表真实个人身份。</p>
   {result.selected && <section className={styles.selectedSession} aria-label="会话事件时间线"><div className={styles.sectionHead}><h3>会话 {result.selected.id} · {result.selected.events.length} 条事件</h3><a href={href()}>关闭时间线</a></div><Timeline events={result.selected.events}/></section>}
   <div className={styles.bqList}><div className={`${styles.bqRow} ${styles.activityHead}`} aria-hidden="true"><span>最近活动</span><span>采集来源</span><span>国家 / 地区</span><span>设备</span><span>着陆页 → 最后页面</span><span>浏览 / 事件</span><span>详情</span></div>
    {result.sessions.map(session => <div className={styles.bqRow} key={session.id}><time data-label="最近活动">{time(session.lastAt)}</time><span data-label="采集来源">{source(session)}</span><span data-label="国家 / 地区">{geography(session)}</span><span data-label="设备">{formatDevice(session.device || "(not set)")}<small>{[session.browser, session.os].filter(Boolean).join(" · ")}</small></span><div data-label="着陆页 → 最后页面" className={styles.bqPages}><span>{page(session.landingPage)}</span><span>→ {page(session.lastPage)}</span></div><strong data-label="浏览 / 事件">{session.pageViews} / {session.eventCount}</strong><a href={href(session.id)} aria-label={`查看会话 ${session.id} 的事件时间线`}>{result.selected?.id === session.id ? "收起" : "时间线"}</a></div>)}
   </div>
  </>}
 </div>;
}
