"use client";
import { useState } from "react";
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
const source = (session: BqSession) => session.source ? formatSource(`${session.source} / ${session.medium || "(none)"}`) : "来源未知";
const geography = (item: { country: string; region: string; city: string }) => {const code=countryCode(item.country);return [formatCountry(item.country || "未设置",code), formatRegion(item.region || "(not set)",code), formatCity(item.city || "(not set)",code)].filter((value, index) => index === 0 || value !== "未设置").join(" · ");};

function Timeline({ events }: { events: BqEvent[] }) {
 return <div className={styles.timeline}><div className={styles.timelineHead}><span>时间</span><span>事件</span><span>页面 / 标题</span><span>地区与设备</span></div>{events.map((event, index) => <div className={styles.timelineRow} key={`${event.timestamp}-${index}`}><time>{time(event.timestamp, true)}</time><strong>{formatEventName(event.name)}</strong><div><b>{event.pageTitle || "未设置标题"}</b><span>{page(event.pageLocation)}</span></div><span>{geography(event)} · {formatDevice(event.device || "(not set)")}</span></div>)}</div>;
}

function SessionTimeline({sessionId,start,end,realtime}:{sessionId:string;start:string;end:string;realtime:boolean}){
 const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[events,setEvents]=useState<BqEvent[]|null>(null),[error,setError]=useState(""),[hasMore,setHasMore]=useState(false);
 async function toggle(retry=false){
  if(open&&!retry){setOpen(false);return;}
  setOpen(true);if(events||loading)return;
  setLoading(true);setError("");
  try{const params=new URLSearchParams({start,end,session:sessionId,realtime:realtime?"1":"0"});const response=await fetch(`/api/admin/analytics/ga4/session-timeline?${params}`,{credentials:"same-origin",cache:"no-store"});if(response.status===202)throw new Error("等待事件表生成，请稍后重试。");if(response.status===401)throw new Error("登录已失效，请重新登录后重试。");if(response.status===503)throw new Error("BigQuery 暂不可用，请稍后重试。");if(!response.ok)throw new Error("时间线读取失败，请检查权限或 BigQuery 服务状态。");const data=await response.json() as {events?:BqEvent[];hasMore?:boolean};setHasMore(Boolean(data.hasMore));if(!Array.isArray(data.events))throw new Error("invalid response");setEvents(data.events);}
  catch(error){setError(error instanceof Error?error.message:"时间线读取失败，请重试。");}
  finally{setLoading(false);}
 }
 return <div className={styles.timelineControl}><button type="button" aria-expanded={open} onClick={()=>toggle()}>{open?"收起":"时间线"}</button>{open&&<div className={styles.inlineTimeline} aria-live="polite">{loading?<span>正在读取该会话事件…</span>:error?<span role="status">{error} <button type="button" onClick={()=>toggle(true)}>重试</button></span>:events?.length?<><p>所读日期表范围内事件（非仅近 30 分钟）· 当前组件快照，无自动刷新。{hasMore?"仅显示前 500 条或原始行上限内事件，存在截断。":""}</p><Timeline events={events}/></>:<span>该会话没有可显示的事件。</span>}</div>}</div>;
}

export function BigQueryActivity({ result, start, end, realtime = true }: { result: BqActivityResult; start: string; end: string; realtime?: boolean }) {
 return <div className={styles.panel} id="bigquery-activity"><div className={styles.sectionHead}><div><h3>逐会话访问</h3><p>BigQuery 原始事件 · 匿名会话，可展开逐条时间线</p></div><span className={styles.chip}>{realtime?"当日 Intraday；跨午夜补相邻日（Daily 优先）":"Daily 优先，Intraday 补充"}</span></div>
  {result.coverage&&<p className={styles.muted}>获取于 {time(result.coverage.fetchedAt,true)} 上海时间 · 最新事件 {time(result.coverage.latestEventAt??"",true)} · 表范围 {result.coverage.start} — {result.coverage.end} · 最多 50000 事件 / 50 会话。{result.coverage.rowsTruncated?"原始事件已截断。":""}{result.coverage.sessionsTruncated?"会话列表已截断。":""}</p>}
  {result.status === "waiting" && <div className={styles.empty}>BigQuery 已关联，等待所选日期的首批事件表生成。可切换到获客分区查看 GA4 聚合活动。</div>}
  {result.status === "unavailable" && <div className={styles.error} role="status">{result.message ?? "BigQuery 活动读取失败"}。可切换到获客分区查看 GA4 聚合活动。</div>}
  {result.status === "ready" && !result.sessions.length && <div className={styles.empty}>所选日期已可查询，但未返回带匿名会话 ID 的原始事件；不显示为 0 个访客。</div>}
  {result.status === "ready" && result.sessions.length > 0 && <>
   <p className={styles.muted}>最近 {result.sessions.length} 个匿名会话的{realtime?"近 30 分钟窗口片段":"所选日期片段"}，不是完整会话；首条页面不代表真实着陆页。原始 Streaming 为尽力服务，可能受延迟与上传完整性影响；不代表真实个人身份。</p>
   <div className={styles.bqList}><div className={`${styles.bqRow} ${styles.activityHead}`} aria-hidden="true"><span>最近活动</span><span>采集来源</span><span>国家 / 地区</span><span>设备</span><span>范围内首条页面 → 最后页面</span><span>范围内浏览 / 事件</span><span>详情</span></div>
    {result.sessions.map(session => <div className={styles.bqRow} key={session.id}><time data-label="最近活动">{time(session.lastAt)}</time><span data-label="采集来源">{source(session)}</span><span data-label="国家 / 地区">{geography(session)}</span><span data-label="设备">{formatDevice(session.device || "(not set)")}<small>{[session.browser, session.os].filter(Boolean).join(" · ")}</small></span><div data-label="范围内首条页面 → 最后页面" className={styles.bqPages}><span>{page(session.landingPage)}</span><span>→ {page(session.lastPage)}</span></div><strong data-label="范围内浏览 / 事件">{session.pageViews} / {session.eventCount}</strong><SessionTimeline sessionId={session.id} start={start} end={end} realtime={realtime}/></div>)}
   </div>
  </>}
 </div>;
}
