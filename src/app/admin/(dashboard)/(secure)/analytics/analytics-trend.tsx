import type { AnalyticsData } from "@/lib/analytics-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function AnalyticsTrend({ dailyTraffic, timezone, available, periodLabel }: { dailyTraffic: AnalyticsData["dailyTraffic"]; timezone: string; available: boolean; periodLabel: string }) {
  const peak = Math.max(0, ...dailyTraffic.map((item) => item.pageviews));
  const maximum = Math.max(1, peak);
  const chartWidth = 800;
  const chartHeight = 180;
  const timestamps = dailyTraffic.map((item) => Date.parse(`${item.date}T00:00:00Z`));
  const dateSpan = (timestamps.at(-1) ?? 0) - (timestamps[0] ?? 0);
  const horizontalPosition = (index: number) => dateSpan > 0 ? 32 + (timestamps[index] - timestamps[0]) / dateSpan * (chartWidth - 48) : chartWidth / 2;
  const verticalPosition = (value: number) => 158 - value / maximum * 130;
  const points = dailyTraffic.map((item, index) => `${horizontalPosition(index)},${verticalPosition(item.pageviews)}`).join(" ");
  return <Card className="min-w-0">
    <CardHeader><CardTitle><h2 className="text-base">每日访问趋势</h2></CardTitle><CardDescription>{periodLabel} · {timezone} · 共享 UA 规则过滤后的候选 PV，未验证真人。按周期补齐日期，暂无记录日期显示 0；首日可能不完整；表格可查看每日值。每日 UV 按 cookie 去重，不可跨日相加。</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {dailyTraffic.length ? <>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-primary" />页面浏览 PV</span><span>峰值 {peak.toLocaleString("zh-CN")} PV</span></div>
        <svg role="img" aria-label={`每日候选访问趋势，${dailyTraffic[0].date} 至 ${dailyTraffic.at(-1)?.date}`} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-48 w-full text-primary" preserveAspectRatio="none">
          <title>每日候选访问趋势（PV）</title><desc>按周期补齐日期，共 {dailyTraffic.length} 天，暂无记录日期显示 0；首日可能不完整；下方表格可查看每日值（日期、PV 与 UV）。</desc>
          {[0, 0.5, 1].map((ratio) => <line key={ratio} x1="32" x2="784" y1={verticalPosition(ratio * maximum)} y2={verticalPosition(ratio * maximum)} stroke="currentColor" strokeOpacity="0.12" vectorEffect="non-scaling-stroke" />)}
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          {dailyTraffic.map((item, index) => <circle key={item.date} cx={horizontalPosition(index)} cy={verticalPosition(item.pageviews)} r="3" fill="currentColor"><title>{`${item.date}：${item.pageviews} PV`}</title></circle>)}
        </svg>
        <div className="flex justify-between gap-3 font-mono text-xs text-muted-foreground"><span>{dailyTraffic[0].date}</span><span>{dailyTraffic.at(-1)?.date}</span></div>
      </> : <p role="status" className="py-8 text-center text-sm text-muted-foreground">{available ? "所选周期暂无每日记录" : "本地统计不可用，不显示为零访问"}</p>}
      <details className="rounded-lg border"><summary className="cursor-pointer px-4 py-3 text-sm font-medium">趋势数据表 · {dailyTraffic.length} 天</summary><Table><TableHeader><TableRow><TableHead>日期</TableHead><TableHead className="text-right">页面浏览 PV</TableHead><TableHead className="text-right">候选标识 UV</TableHead></TableRow></TableHeader><TableBody>{dailyTraffic.map((item) => <TableRow key={item.date}><TableCell className="font-mono text-sm">{item.date}</TableCell><TableCell className="text-right font-mono tabular-nums">{item.pageviews.toLocaleString("zh-CN")}</TableCell><TableCell className="text-right font-mono tabular-nums">{item.visitors == null ? "不可用" : item.visitors.toLocaleString("zh-CN")}</TableCell></TableRow>)}</TableBody></Table></details>
    </CardContent>
  </Card>;
}
