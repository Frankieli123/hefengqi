import { requireSecureAdmin } from "@/lib/admin-session";
import { isGa4Preview } from "@/lib/ga4-preview-auth";
import { formatCountry, formatRegion, formatCity, formatDevice, formatEventName, formatSource } from "@/lib/ga4-display";
import { normalizeQuery, getOverviewDashboard, getSectionReport, getFieldMetadata, realtime, realtimeTotals, configuration, explore, safeValue, sections, type Report } from "@/lib/ga4-reporting";
import styles from "./page.module.css";
import { TrendChart } from "./trend-chart";
import { BigQueryActivity } from "./bigquery-activity";
import { getBigQueryActivity } from "@/lib/bigquery-activity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
const inputClass="rounded-md border bg-background p-2 text-foreground";
export const metadata={title:"GA4 分析",robots:{index:false,follow:false}}; export const dynamic="force-dynamic"; export const runtime="nodejs";
const previewTabs=new Set(["overview","trend"]);
const legacyViews:Record<string,string>={breakdowns:"acquisition",events:"engagement"};
type Props={searchParams?:Promise<Record<string,string|string[]|undefined>>};
const labels:Record<string,string>={totalUsers:"用户",newUsers:"新用户",sessions:"会话",screenPageViews:"浏览量",keyEvents:"关键事件",engagedSessions:"互动会话",engagementRate:"互动率",averageSessionDuration:"平均会话时长",activeUsers:"活跃用户",eventCount:"事件数",date:"日期",dateHourMinute:"活动时段",pagePath:"页面路径",pageTitle:"页面标题",sessionSourceMedium:"来源 / 媒介",deviceCategory:"设备",country:"国家",region:"地区",city:"城市",browser:"浏览器",operatingSystem:"操作系统",userEngagementDuration:"互动时长（秒）"};
const formatTime=(value?:string)=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date(value))+" 上海时间":value??"未知";
const formatMetric=(header:string,value:string)=>{
 if(header==="dateHourMinute")return value.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/,"$1-$2-$3 $4:$5");
 if(header==="date")return value.replace(/^(\d{4})(\d{2})(\d{2})$/,"$1-$2-$3");
 if(header==="engagementRate"&&/^\d*\.?\d+$/.test(value))return `${(Number(value)*100).toFixed(1)}%`;
 if(header==="averageSessionDuration"&&/^\d*\.?\d+$/.test(value))return `${Math.floor(Number(value)/60)}分${Math.round(Number(value)%60)}秒`;
 return value;
};
function Table({report}:{report:Report}){
 const metricNames=["totalUsers","newUsers","sessions","screenPageViews","keyEvents","engagedSessions","engagementRate","averageSessionDuration","activeUsers","eventCount","userEngagementDuration"];
 const dimensionCount=Math.max(1,report.headers.findIndex(h=>metricNames.includes(h)));
 const metricIndices=report.headers.map((h,i)=>labels[h]&&i>=dimensionCount?i:-1).filter(i=>i>=0).slice(0,2);
 const columns=report.headers.map((h,i)=>({h,i})).filter(({h})=>h!=="countryId");
 const priority=(i:number)=>i===0||metricIndices.includes(i)?"primary":"secondary";
 const countryIdIndex=report.headers.indexOf("countryId");
 const cell=(row:string[],index:number)=>{const header=report.headers[index]??"";return formatDimension(header,formatMetric(header,row[index]??""),countryIdIndex>=0?row[countryIdIndex]:undefined);};
 const table=()=><table className={styles.table}><thead><tr>{columns.map(({h,i})=><th data-mobile={priority(i)} title={h} key={i}>{labels[h]??h}</th>)}</tr></thead><tbody>{report.rows.length?report.rows.map((row,i)=><tr key={i}>{columns.map(({i:j})=><td data-mobile={priority(j)} key={j}>{cell(row,j)}</td>)}</tr>):<tr><td colSpan={Math.max(1,columns.length)}><div className={styles.empty}>API 返回空结果。此处不显示为 0，也不代表已配置所有采集。</div></td></tr>}</tbody></table>;
 return <><p className={styles.mobileHint}>手机摘要显示首列及两项指标；展开可查看全部字段。</p><div className={styles.tableWrap}>{table()}</div>{columns.length>3&&<details className={styles.mobileFull}><summary>查看完整报表 · 全部字段（可横向滚动）</summary><div className={styles.fullTable}>{table()}</div></details>}</>;
}
function Panel({report,error}:{report?:Report;error?:string}){if(error)return <div className={styles.error} role="status">{error}</div>;if(!report)return <div className={styles.empty}>数据源暂时不可用，未显示为 0。</div>;return <><Table report={report}/><p className={styles.muted}>{report.rows.length} 行 / 总计 {report.rowCount} 行 · 获取于 {formatTime(report.fetchedAt)}</p><details className={styles.details}><summary>数据质量、阈值与配额</summary><pre>{JSON.stringify({metadata:report.metadata??null,propertyQuota:report.quota??null},null,2)}</pre></details></>}
function Trend({report}:{report?:Report}) {
 if(!report?.rows.length)return <Panel report={report}/>;
 const dateIndex=report.headers.indexOf("date");
 const rows=[...report.rows].sort((a,b)=>(a[dateIndex]??"").localeCompare(b[dateIndex]??""));
 const series=["totalUsers","sessions","screenPageViews"].map(name=>({name,index:report.headers.indexOf(name)})).filter(s=>s.index>=0);
 if(rows.length===1)return <div className={styles.singleDay}><strong>仅返回 1 天数据，不绘制趋势折线</strong><p>{formatMetric("date",rows[0]?.[dateIndex]??"")} · 所选范围内其他日期未返回数据，不补零。</p><div>{series.map(s=><span key={s.name}><small>{labels[s.name]}</small><b>{rows[0]?.[s.index]??"—"}</b></span>)}</div><details className={styles.details}><summary>查看单日明细与数据质量</summary><Panel report={report}/></details></div>;
 return <><TrendChart report={report}/><p className={styles.muted}>同一计数轴 · {rows.length} 个已返回日期 · 缺失日期不补零，用户数不跨日相加。悬浮图表可查看当日数值。</p><details className={styles.details}><summary>查看完整报表 · 每日明细与数据质量</summary><Panel report={report}/></details></>;
}
function formatDimension(header:string,value:string,countryId?:string){
 if(value==="(not set)")return "未设置";
 if(header==="country")return formatCountry(value,countryId);
 if(header==="region")return formatRegion(value,countryId);
 if(header==="city")return formatCity(value,countryId);
 if(header==="deviceCategory")return formatDevice(value);
 if(header==="eventName")return formatEventName(value);
 if(header==="sessionSourceMedium")return formatSource(value);
 return value;
}
function Activity({report,error,base,start,end,compare,offset}:{report?:Report;error?:string;base:string;start:string;end:string;compare:boolean;offset:number}){
 if(error)return <Panel error={error}/>;
 if(!report)return <Panel/>;
 const index=(name:string)=>report.headers.indexOf(name);
 const rows=report.rows;
 const pageHref=(nextOffset:number)=>`${base}?${new URLSearchParams({view:"acquisition",start,end,compare:compare?"1":"0",offset:String(nextOffset)})}`;
 return <><p className={styles.muted}>本页 {rows.length} 组活动 · 同一行是相同时间、来源、国家、页面和设备的匿名聚合；会话数不是访客明细。</p>{!rows.length&&<p className={styles.empty}>API 本页未返回活动；不代表没有访问，可返回上一页或调整日期范围。</p>}<div className={styles.activityList}><div className={`${styles.activityRow} ${styles.activityHead}`} aria-hidden="true"><span>时间</span><span>来源</span><span>国家</span><span>访问页面</span><span>设备</span><span>会话</span><span>浏览量</span></div>{rows.map((row,i)=><div className={styles.activityRow} key={i}><time>{formatMetric("dateHourMinute",row[index("dateHourMinute")]??"—")}</time><span data-label="来源">{formatSource(row[index("sessionSourceMedium")]??"未设置")}</span><span data-label="国家">{formatCountry(row[index("country")]??"未设置",row[index("countryId")])}</span><a data-label="访问页面" href={row[index("pagePath")]} target="_blank" rel="noreferrer">{row[index("pagePath")]}</a><span data-label="设备">{formatDevice(row[index("deviceCategory")]??"未设置")}</span><strong data-label="会话">{row[index("sessions")]} 会话</strong><span data-label="浏览量">{row[index("screenPageViews")]} 浏览</span></div>)}</div>{(offset>0||report.rowCount>rows.length)&&<nav className={styles.presets} aria-label="GA4 聚合活动分页">{offset>0&&<a href={pageHref(Math.max(0,offset-100))}>上一页</a>}<span>第 {Math.floor(offset/100)+1} 页 · 共 {report.rowCount} 行</span>{rows.length>0&&offset+rows.length<report.rowCount&&offset<100000&&<a href={pageHref(Math.min(100000,offset+100))}>下一页</a>}</nav>}<p className={styles.muted}>{rows.length} 行 / 总计 {report.rowCount} 行 · 获取于 {formatTime(report.fetchedAt)}</p><details className={styles.details}><summary>数据质量、阈值与配额</summary><pre>{JSON.stringify({metadata:report.metadata??null,propertyQuota:report.quota??null},null,2)}</pre></details></>;
}
function RealtimeActivity({report}:{report?:Report}){
 if(!report?.rows.length)return null;
 const index=(name:string)=>report.headers.indexOf(name);
 const rows=[...report.rows].sort((a,b)=>Number(a[index("minutesAgo")])-Number(b[index("minutesAgo")])).slice(0,20);
 return <div className={styles.liveList}><h3>最近 30 分钟活动</h3><p className={styles.muted}>GA4 Realtime 聚合；同一行对应分钟、地域、设备、页面标题与事件。</p>{rows.map((row,i)=><div className={styles.liveRow} key={i}><time>{row[index("minutesAgo")]} 分钟前</time><span>{formatCountry(row[index("country")]??"未设置",row[index("countryId")])}{row[index("city")]?` · ${formatCity(row[index("city")]!,row[index("countryId")])}`:""}</span><span>{formatDevice(row[index("deviceCategory")]??"未设置")}</span><strong>{row[index("unifiedScreenName")]||"未设置页面标题"}</strong><code>{formatEventName(row[index("eventName")]??"未设置")}</code><span>{row[index("screenPageViews")]} 浏览 · {row[index("eventCount")]} 事件</span></div>)}</div>;
}
function EventsReport({report,error}:{report?:Report;error?:string}){
 if(error)return <div className={styles.error} role="status">{error}</div>;
 if(!report)return <div className={styles.error} role="status">事件报表没有返回结果，当前无法确认是空数据还是读取失败。</div>;
 if(!report.rows.length)return <div className={styles.empty}>GA4 查询成功，但所选日期范围没有返回事件行；这表示当前报表无内容，不是 API 错误，也不代表所有数据均已采集。</div>;
 return <Panel report={report}/>;
}
function Pages({report,error,start,end,compare,offset}:{report?:Report;error?:string;start:string;end:string;compare:boolean;offset:number}){
 if(error)return <Panel error={error}/>;
 if(!report?.rows.length)return <Panel report={report}/>;
 const index=(name:string)=>report.headers.indexOf(name);
 const exploreHref=`/admin/analytics/ga4?view=explore&start=${start}&end=${end}&compare=${compare?"1":"0"}&explore=1&dimensions=pagePath,pageTitle&metrics=screenPageViews,totalUsers&offset=${offset+report.rows.length}`;
 return <><p className={styles.muted}>当前返回 {report.rows.length} 行 / 总计 {report.rowCount} 行。</p><div className={styles.pageList}>{report.rows.map((row,i)=><div className={styles.pageItem} key={i}><a href={row[index("pagePath")]} target="_blank" rel="noreferrer">{row[index("pagePath")]}</a><span>{formatDimension("pageTitle",row[index("pageTitle")]??"未设置")}</span><strong>{row[index("screenPageViews")]} 浏览</strong><small>{row[index("totalUsers")]} 用户</small></div>)}</div>{report.rowCount>report.rows.length&&<p className={styles.notice}>页面报表仍有未显示行。<a href={exploreHref}>进入探索器分页查看其余页面</a>。</p>}</>;
}
function Metrics({report}:{report?:Report}) {return <div className={styles.grid}>{(report?.headers??["totalUsers","sessions","screenPageViews","keyEvents"]).map((h,i)=><div className={styles.metric} key={h}><small>{labels[h]??h}</small><strong>{formatMetric(h,report?.rows[0]?.[i]??"—")}</strong></div>)}</div>;}
export default async function Ga4Page({searchParams}:Props){const preview=await isGa4Preview();const base=preview?"/admin/analytics/ga4-preview":"/admin/analytics/ga4";if(!preview)await requireSecureAdmin();const raw=await searchParams??{};const input=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,typeof v==="string"?v:undefined]));let q;try{q=normalizeQuery(input)}catch{return <main className={styles.shell}><h1>日期筛选无效</h1><p role="alert">请选择不超过 366 天、且不晚于属性时区今天的日期。</p><a href={base}>重置</a></main>}
 const originalView=input.view??"overview";
 const mappedView=originalView==="breakdowns"&&["pages","events","commerce"].includes(input.section??"")?"engagement":legacyViews[originalView]??originalView;
 const requestedActive=input.explore==="1"?"explore":mappedView;
 const active=preview?(requestedActive==="trend"?"trend":"overview"):["realtime","overview","acquisition","engagement","trend","explore","system"].includes(requestedActive)?requestedActive:"overview";
 const oldSection=input.section??(originalView==="events"?"events":"channels");
 const selectedSection=active==="engagement"?(oldSection==="channels"?"pages":oldSection):active==="acquisition"?(oldSection==="channels"?"sources":oldSection):oldSection;
 const topicIds=active==="engagement"?["pages","events","commerce"]:["sources","geo","devices","activity","channels","campaigns","referrers","landing","screen"];
 const reportIds=active==="engagement"?["pages","events"]:["sources","geo","devices","activity"];
 if(topicIds.includes(selectedSection)&&!reportIds.includes(selectedSection))reportIds.push(selectedSection);
 const todayDate=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai"}).format(new Date());
 const realtimeDate=active==="realtime"?new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai"}).format(new Date()):undefined;
 const bqPromise=active==="realtime"?getBigQueryActivity({start:realtimeDate!,end:realtimeDate!,realtime:true,session:/^[a-f0-9]{12}$/.test(input.session??"")?input.session:undefined}):Promise.resolve(undefined);
 const dashboard=active==="overview"?await getOverviewDashboard(q):active==="trend"?[await getSectionReport("trend",q)]:(active==="acquisition"||active==="engagement")?await Promise.all(reportIds.map(id=>getSectionReport(id,q))):[];

 const [fields,live,config,liveTotal,bqActivity]=await Promise.all([
  active==="explore"?getFieldMetadata().catch(()=>null):Promise.resolve(null),
  active==="realtime"?realtime().catch(()=>null):Promise.resolve(null),
  active==="system"?configuration().catch(()=>null):Promise.resolve(null),
  active==="realtime"?realtimeTotals().catch(()=>null):Promise.resolve(null),
  bqPromise
 ]);
 const dimensions=(input.dimensions??"country").split(",").map(v=>v.trim()).filter(Boolean),metrics=(input.metrics??"sessions").split(",").map(v=>v.trim()).filter(Boolean);
 let custom:Report|undefined,customError:string|undefined;
 if(active==="explore"&&input.explore==="1")try{custom=await explore(q,dimensions,metrics);}catch{customError="探索查询失败：字段未注册、组合不兼容、权限不足或 API 不可用。未显示为零。";}
 const overview=dashboard.find(s=>s.id==="overview")?.report;const trend=dashboard.find(s=>s.id==="trend")?.report;const params=new URLSearchParams({start:q.start,end:q.end,compare:q.compare?"1":"0",dimensions:dimensions.join(","),metrics:metrics.join(","),explore:"1"});const shift=(days:number)=>{const d=new Date(`${todayDate}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
 const trendCoverage=<p className={styles.notice}>趋势仅展示 API 首页 {trend?.rows.length??0} 行 / 总计 {trend?.rowCount??0} 行（最多 100 行）；{trend&&trend.rowCount>trend.rows.length?"非完整区间趋势。":"缺失日期不补零。"}<a href={`${base}?start=${q.start}&end=${q.end}&compare=${q.compare?"1":"0"}&explore=1&dimensions=date&metrics=totalUsers,sessions,screenPageViews,keyEvents&offset=${trend&&trend.rowCount>100?100:0}`}>打开每日探索器分页查看余下日期</a>。对比 CSV 以 period 标记两个独立排序报告，不按行匹配维度。</p>;
 const exportHref=(id?:string)=>{const p=new URLSearchParams(params);p.set("offset",String(q.offset));if(id)p.set("section",id);return `${base}/export?${p}`;};
 return <main className={styles.shell} data-preview={preview?"true":undefined}><header className={styles.mast}><div><h1 className={styles.title}>GA4 分析</h1><p className={styles.sub}>网站流量与访问表现 · 今日累计 / 历史报表 / 近 30 分钟实时</p></div><a className={preview?styles.adminOnly:undefined} href="/admin/analytics">返回统计总览</a></header>
 {active!=="realtime"&&<form className={styles.toolbar}><input type="hidden" name="view" value={active}/>{input.section&&<input type="hidden" name="section" value={input.section}/>}<div className={styles.range}><label>开始日期<input type="date" name="start" max={todayDate} required defaultValue={q.start}/></label><label>结束日期<input type="date" name="end" max={todayDate} required defaultValue={q.end}/></label><button>应用范围</button></div><div className={styles.presets} aria-label="快捷日期">{[["今天",todayDate],["昨天",shift(-1)],["7 天",shift(-6)],["28 天",shift(-27)]].map(([label,start],i)=>{const end=i===1?shift(-1):todayDate;return <a key={label} aria-current={q.start===start&&q.end===end?"date":undefined} href={`${base}?view=${active}&start=${start}&end=${end}&compare=${q.compare?"1":"0"}${input.section?`&section=${input.section}`:""}`}>{label}</a>})}</div><label><input type="checkbox" name="compare" value="1" defaultChecked={q.compare}/> 对比上一周期</label></form>}
 <div className={styles.notice}><strong>{active==="realtime"?"当前范围：近 30 分钟 · 上海时间":"当前范围："}</strong>{active!=="realtime"&&<>{q.start} — {q.end} · Asia/Shanghai。</>}今天为未结算累计；实时仅为最近 30 分钟。<details><summary>数据口径与延迟说明</summary><p>历史 GA4 报表可能延迟处理，不能将实时用户与历史用户相加。获客与互动报告为匿名聚合；实时分区单独展示 Realtime 信号与 BigQuery 逐会话数据。</p></details></div>
 <nav className={styles.tabs} aria-label="GA4 分析分区">{[["realtime","实时"],["overview","概览"],["acquisition","获客"],["engagement","互动"],["trend","趋势"],["explore","高级探索"],["system","系统"]].filter(([id])=>!preview||previewTabs.has(id)).map(([id,label])=><a aria-current={active===id?"page":undefined} className={`${styles.tab} ${active===id?styles.active:""}`} href={`${base}?view=${id}&start=${q.start}&end=${q.end}&compare=${q.compare?"1":"0"}`} key={id}>{label}</a>)}</nav>
 {active==="overview"&&<>
<section className={styles.section} aria-labelledby="overview-heading"><div className={styles.sectionHead}><div><h2 id="overview-heading">概览</h2><p>{q.start} — {q.end} · 所选范围独立汇总</p></div><a className={styles.adminOnly} href={exportHref("overview")}>导出 CSV</a></div><Metrics report={overview}/><details className={styles.details}><summary>周期明细、对比与数据质量</summary><Panel report={overview} error={dashboard.find(s=>s.id==="overview")?.error}/>{overview?.compare&&<Panel report={overview.compare}/>}</details></section>
<div className={styles.storyGrid}><section className={styles.panel}><div className={styles.sectionHead}><div><h2>访问趋势</h2><p>{q.start} — {q.end}</p></div><a className={styles.adminOnly} href={exportHref("trend")}>导出 CSV</a></div><Trend report={trend}/><details className={styles.details}><summary>趋势覆盖范围与分页</summary>{trendCoverage}</details><a href={`${base}?view=trend&start=${q.start}&end=${q.end}&compare=${q.compare?"1":"0"}`}>查看全部趋势 →</a></section></div></>}
{active==="trend"&&<section className={styles.section}><div className={styles.panel}>{trendCoverage}<Trend report={trend}/><a className={styles.adminOnly} href={exportHref("trend")}>CSV 导出趋势</a></div></section>}

{active==="realtime"&&<section className={styles.section}><div className={styles.notice}><strong>实时监控视图。</strong>监控用，不用于趋势分析。Realtime API 与 BigQuery 逐会话数据均为近实时口径。</div>{<div className={`${styles.panel} ${styles.realtime}`}><div className={styles.sectionHead}><h2>Realtime 实时信号</h2><span className={styles.chip}>{liveTotal?"已获取快照":"暂不可用"}</span></div><p className={styles.muted}>最近 30 分钟 · 不随日期筛选改变 · 无自动轮询。30 分钟去重总量不能与今日用户相加。</p><Metrics report={liveTotal??undefined}/><RealtimeActivity report={live??undefined}/></div>}<div className={styles.panel}>{bqActivity&&<BigQueryActivity result={bqActivity} start={realtimeDate!} end={realtimeDate!} realtime/>}</div></section>}
{active==="acquisition"&&<section className={styles.section}><div className={styles.panel}><h2>GA4 聚合活动</h2><p className={styles.muted}>仅聚合数据，不含 BigQuery 逐会话记录。</p><Activity report={dashboard.find(s=>s.id==="activity")?.report} error={dashboard.find(s=>s.id==="activity")?.error} base={base} start={q.start} end={q.end} compare={q.compare} offset={q.offset}/></div><div className={styles.activityGrid}>{(["sources","geo","devices"] as const).map(id=>{const item=dashboard.find(s=>s.id===id);return <div className={styles.panel} key={id}><h2>{item?.title??id}</h2><Panel report={item?.report} error={item?.error}/></div>})}</div></section>}
{active==="engagement"&&<section className={styles.section}><div className={styles.twocol}>{["pages","events"].map(id=>{const item=dashboard.find(s=>s.id===id);return <div className={styles.panel} key={id}><div className={styles.sectionHead}><h2>{item?.title??id}</h2><a href={exportHref(id)}>CSV</a></div>{id==="pages"?<Pages report={item?.report} error={item?.error} start={q.start} end={q.end} compare={q.compare} offset={q.offset}/>:<EventsReport report={item?.report} error={item?.error}/>}</div>})}</div><p className={styles.muted}>仅聚合数据，不含 BigQuery 逐会话记录。</p></section>}
{(active==="acquisition"||active==="engagement")&&<section className={styles.section}><form className={styles.toolbar}><input type="hidden" name="view" value={active}/><input type="hidden" name="start" value={q.start}/><input type="hidden" name="end" value={q.end}/><input type="hidden" name="compare" value={q.compare?"1":"0"}/><label>详细报告 <select name="section" defaultValue={selectedSection}>{sections.filter(s=>topicIds.includes(s.id)).map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label><button>查看报告</button></form>{!(["sources","geo","devices","activity","pages","events"].includes(selectedSection))&&dashboard.filter(s=>s.id===selectedSection).map(s=><div className={styles.panel} key={s.id}><h2>{s.title}</h2><Panel report={s.report} error={s.error}/><a href={exportHref(s.id)}>CSV</a>{s.report?.compare&&<details className={styles.details}><summary>上一等长周期（独立排序）</summary><Panel report={s.report.compare}/></details>}</div>)}</section>} {active==="explore"&&<section className={styles.section}><Card className="min-w-0"><CardHeader><CardTitle>完整元数据探索器</CardTitle><CardDescription>发现此属性 Data API 返回的全部维度 / 指标（包括已注册自定义字段）。元数据存在不等于已采集或任意组合兼容。执行前检查兼容性；禁止个人身份字段。每页 100 行，最多偏移 100000。</CardDescription></CardHeader><CardContent>
 <form className="flex flex-wrap items-end gap-3"><input type="hidden" name="start" value={q.start}/><input type="hidden" name="end" value={q.end}/><input type="hidden" name="compare" value={q.compare?"1":"0"}/><input type="hidden" name="explore" value="1"/><label className="min-w-0 flex-1">维度 API 名称（逗号分隔，最多 6）<input aria-label="探索字段" className={inputClass+" block w-full"} name="dimensions" list="ga4-dimensions" defaultValue={dimensions.join(",")}/></label><label className="min-w-0 flex-1">指标 API 名称（最多 8）<input className={inputClass+" block w-full"} name="metrics" list="ga4-metrics" defaultValue={metrics.join(",")} required/></label><button className={inputClass}>检查兼容性并查询</button></form>
 <datalist id="ga4-dimensions">{fields?.dimensions.map(f=><option value={f.apiName} key={f.apiName}>{f.uiName}</option>)}</datalist><datalist id="ga4-metrics">{fields?.metrics.map(f=><option value={f.apiName} key={f.apiName}>{f.uiName}</option>)}</datalist>
 {fields?<details className="mt-4"><summary>浏览 / 搜索全部字段（浏览器查找） · {fields.dimensions.length} 维度 / {fields.metrics.length} 指标</summary>{(["dimensions","metrics"] as const).map(kind=><div key={kind}><h3>{kind==="dimensions"?"维度":"指标"}</h3>{fields[kind].map(f=><p key={f.apiName} className="my-2 break-all"><code>{f.apiName}</code> · {f.uiName} · {f.category} · {f.type} {f.customDefinition?"自定义":"标准"}<br/>{f.description}{f.deprecatedApiNames?.length?`（已弃用别名：${f.deprecatedApiNames.join(",")}）`:""}</p>)}</div>)}</details>:<p role="status">元数据不可用，无法发现或验证字段。</p>}
 {customError&&<p role="alert">{customError}</p>}{custom&&<div className="mt-4"><Panel report={custom}/><div className="mt-3 flex flex-wrap gap-4">{q.offset>0&&<a className="underline" href={`${base}?${params}&offset=${Math.max(0,q.offset-100)}`}>上一页</a>}{q.offset+100<custom.rowCount&&q.offset<100000&&<a className="underline" href={`${base}?${params}&offset=${q.offset+100}`}>下一页</a>}<a className="underline" href={exportHref()}>CSV 导出当前页（非全量）</a></div></div>}
 <p className="mt-3 text-muted-foreground">网址查询参数 / 片段、邮箱、IP 和常见个人标识会脱敏。仍请勿在 GA4 自定义字段采集个人信息。CSV 与页面使用相同脱敏聚合数据；CSV 防公式注入。</p>
 </CardContent></Card></section>}
 {active==="system"&&<section className={styles.section}><div className={styles.panel}><h2>属性、采集与运行状态</h2><p className={styles.muted}>只读配置、错误状态、阈值和配额均保留在各报告 disclosure 中。</p><details open className={styles.details}><summary>实际配置响应</summary><pre>{JSON.stringify(config??{status:"配置不可用"},(k,v)=>typeof v==="string"?safeValue(v):v,2)}</pre></details></div></section>}
 </main>}
