import { requireSecureAdmin } from "@/lib/admin-session";
import { getGa4Overview, type Ga4Row, type Ga4Unavailable } from "@/lib/ga4-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export const metadata = { title: "GA4 分析", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const unavailableMessages: Record<Ga4Unavailable["reason"], string> = {
  not_configured: "尚未配置 GA4 只读报告。请管理员确认 GA4 属性 ID，配置 GA4_PROPERTY_ID 和 GOOGLE_APPLICATION_CREDENTIALS，并向服务账号授予该属性的查看权限。",
  invalid_config: "GA4 服务端配置无效或凭据文件不可读取。请管理员检查属性 ID 与服务账号配置。",
  permission_denied: "GA4 读取权限不足。请确认服务账号已获得目标 GA4 属性的查看权限，并核对属性 ID。",
  unavailable: "GA4 报告暂时无法读取，请稍后重试或联系管理员检查服务端配置及 Google API 访问。",
};
const formatNumber = (value: number) => value.toLocaleString("zh-CN");
function Breakdown({ title, label, metric, rows }: { title: string; label: string; metric: string; rows: Ga4Row[] | null }) {
  return <Card className="min-w-0 shadow-none"><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>最近 28 天 · 前 10 项 · {metric}</CardDescription></CardHeader><CardContent className="min-w-0 p-0"><Table><TableHeader><TableRow><TableHead>{label}</TableHead><TableHead className="text-right">{metric}</TableHead></TableRow></TableHeader><TableBody>{rows?.length ? rows.map(row => <TableRow key={row.label}><TableCell className="max-w-[360px] whitespace-normal break-all">{row.label}</TableCell><TableCell className="text-right font-mono">{formatNumber(row.value)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={2} className="py-8 text-center text-muted-foreground">{rows === null ? "此维度暂不可用，未显示为零" : "暂无数据"}</TableCell></TableRow>}</TableBody></Table></CardContent></Card>;
}

export default async function Ga4Page() {
  // Layout authorization alone cannot prevent a parallel page render from fetching.
  await requireSecureAdmin();
  const data = await getGa4Overview();
  return <main className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-6 p-4 text-sm [font-variant-numeric:tabular-nums] md:p-7 [&_[data-slot=card]]:min-w-0">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">GA4 分析</h1><p className="mt-2 text-muted-foreground">最近 28 天（截至昨日，按 GA4 属性时区） · Google Analytics Data API 只读报告</p></div><Button variant="outline" render={<a href="/admin/analytics" />}>返回 Umami / 本地统计</Button></header>
    <p className="text-muted-foreground">衡量 ID：G-1GLJE63BSE · 媒体资源：565392520。Umami 保持独立，不合并两套统计。</p>
    {!data.available ? <Card><CardHeader><CardTitle>GA4 数据不可用</CardTitle><CardDescription>未返回报告，不显示为零流量。</CardDescription></CardHeader><CardContent><p role="status">{unavailableMessages[data.reason]}</p></CardContent></Card> : <>
      <p className="text-muted-foreground">属性时区：{data.timezone ?? "未返回"}。GA4 可能存在处理延迟、隐私阈值或采样；用户数不代表已验证真人，维度分组不可直接相加为总用户数。</p>
      <section aria-label="GA4 核心指标" className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[
        { title: "总用户数", value: data.metrics.users, note: "totalUsers · GA4 去重用户" },
        { title: "会话数", value: data.metrics.sessions, note: "sessions · GA4 会话" },
        { title: "浏览量", value: data.metrics.pageviews, note: "screenPageViews · 页面 / 屏幕浏览" },
      ].map(item => <Card key={item.title} data-ga4-kpi className="shadow-none"><CardHeader><CardDescription>{item.title}</CardDescription></CardHeader><CardContent><div className="font-mono text-3xl font-semibold">{formatNumber(item.value)}</div><p className="mt-2 text-muted-foreground">{item.note}</p></CardContent></Card>)}</section>
      <section aria-label="GA4 维度报告" className="grid min-w-0 gap-4 xl:grid-cols-2"><Breakdown title="主要页面" label="页面路径" metric="浏览量" rows={data.pages} /><Breakdown title="来源 / 媒介" label="会话来源 / 媒介" metric="会话数" rows={data.sources} /><Breakdown title="国家 / 地区" label="国家 / 地区" metric="总用户数" rows={data.countries} /></section>
    </>}
  </main>;
}
