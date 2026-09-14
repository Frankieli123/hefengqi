import {
  ActivityIcon,
  ArrowUpRightIcon,
  BarChart3Icon,
  BoxesIcon,
  ClockIcon,
  ExternalLinkIcon,
  EyeIcon,
  GlobeIcon,
  InboxIcon,
  LaptopIcon,
  PercentIcon,
  SmartphoneIcon,
  UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSecureAdmin } from "@/lib/admin-session";
import { analyticsPeriodKeys, getCompleteAnalyticsData, type AnalyticsPeriod } from "@/lib/analytics-service";

export const metadata = { title: "统计分析", robots: { index: false, follow: false } };

const periodLabels: Record<AnalyticsPeriod, string> = { today: "今日", "7d": "近 7 天", "30d": "近 30 天", all: "累计" };

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function Empty({ children = "暂无记录" }: { children?: string }) {
  return <div className="py-5 text-center text-xs text-muted-foreground">{children}</div>;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireSecureAdmin();
  const query = await searchParams;
  const selectedPeriod = analyticsPeriodKeys.includes(query.period as AnalyticsPeriod) ? query.period as AnalyticsPeriod : "30d";
  const data = await getCompleteAnalyticsData(selectedPeriod);
  const activeTraffic = data.trafficByPeriod[selectedPeriod];
  const kpis = [
    { title: "页面浏览量 (PV)", value: activeTraffic.pageviews, sub: `${periodLabels[selectedPeriod]}页面加载次数`, icon: EyeIcon, color: "text-blue-500" },
    { title: "独立访客 (UV)", value: activeTraffic.visitors, sub: `${periodLabels[selectedPeriod]}去重访客`, icon: UsersIcon, color: "text-emerald-500" },
    { title: "访问会话", value: activeTraffic.visits, sub: `${periodLabels[selectedPeriod]}访问会话`, icon: ActivityIcon, color: "text-indigo-500" },
    { title: "产品累计浏览", value: data.products.totalViews, sub: `已录入 ${data.products.totalCount} 款产品`, icon: BoxesIcon, color: "text-primary" },
    { title: "平均访问时长", value: activeTraffic.avgDurationFormatted, sub: `${periodLabels[selectedPeriod]}平均停留`, icon: ClockIcon, color: "text-amber-500" },
    { title: "询价转化率", value: `${data.inquiries.conversionRate}%`, sub: `${periodLabels[selectedPeriod]}访客到询价`, icon: PercentIcon, color: "text-rose-500" },
  ];

  return <main className="flex flex-col gap-6 p-5 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2"><BarChart3Icon className="size-6 text-primary" /><h1 className="text-2xl font-semibold">统计分析</h1></div>
        <p className="mt-1 text-sm text-muted-foreground">按时间、路径与 IP 推断地区查看站点访问趋势。原始 IP 不在后台展示。</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={data.source.available ? "secondary" : "destructive"}>{data.source.available ? `数据已更新 · ${data.source.timezone}` : "统计服务未连接"}</Badge>
        <Button variant="outline" size="sm" render={<a href="/u" target="_blank" rel="noreferrer" />}><ExternalLinkIcon data-icon="inline-start" />打开 Umami</Button>
      </div>
    </div>
    {!data.source.available ? <Card><CardContent className="py-4 text-sm text-muted-foreground">{data.source.message} 生产环境请设置服务器端 <code>UMAMI_API_URL</code>、<code>UMAMI_USERNAME</code>、<code>UMAMI_PASSWORD</code> 与 <code>UMAMI_WEBSITE_ID</code>。</CardContent></Card> : null}

    <Card>
      <CardHeader><CardTitle className="text-base">访问周期概览</CardTitle><CardDescription>四个周期同时统计，点击周期可将下方 KPI 与询价转化率切换到对应范围。</CardDescription></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {analyticsPeriodKeys.map((period) => { const item = data.trafficByPeriod[period]; const active = selectedPeriod === period; return <a key={period} href={`/admin/analytics?period=${period}`} className={`rounded-lg border p-4 transition-colors hover:bg-muted/50 ${active ? "border-primary ring-1 ring-primary/30" : "border-border"}`}><div className="flex items-center justify-between"><span className="text-sm font-medium">{periodLabels[period]}</span>{active ? <Badge>当前</Badge> : null}</div><div className="mt-3 grid grid-cols-3 gap-2"><div><div className="text-lg font-semibold font-mono">{formatNumber(item.pageviews)}</div><div className="text-[11px] text-muted-foreground">PV</div></div><div><div className="text-lg font-semibold font-mono">{formatNumber(item.visitors)}</div><div className="text-[11px] text-muted-foreground">UV</div></div><div><div className="text-lg font-semibold font-mono">{formatNumber(item.visits)}</div><div className="text-[11px] text-muted-foreground">会话</div></div></div></a>; })}
      </CardContent>
    </Card>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{kpis.map((kpi) => <Card key={kpi.title}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardDescription className="text-xs font-medium">{kpi.title}</CardDescription><kpi.icon className={`size-4 ${kpi.color}`} /></CardHeader><CardContent><div className="text-2xl font-bold font-mono">{typeof kpi.value === "number" ? formatNumber(kpi.value) : kpi.value}</div><p className="mt-1 truncate text-[11px] text-muted-foreground">{kpi.sub}</p></CardContent></Card>)}</div>

    <Card><CardHeader><CardTitle className="text-base">近 7 天每日访问</CardTitle><CardDescription>按站点时区 {data.source.timezone} 汇总；每日 UV 分别按天去重，不能与近 7 天整体 UV 直接相加。</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>日期</TableHead><TableHead className="text-right">页面浏览 PV</TableHead><TableHead className="text-right">独立访客 UV</TableHead></TableRow></TableHeader><TableBody>{data.dailyTraffic.length ? data.dailyTraffic.map((item) => <TableRow key={item.date}><TableCell className="font-mono text-xs">{item.date}</TableCell><TableCell className="text-right font-mono">{formatNumber(item.pageviews)}</TableCell><TableCell className="text-right font-mono">{formatNumber(item.visitors)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={3}><Empty /></TableCell></TableRow>}</TableBody></Table></CardContent></Card>

    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center justify-between text-base"><span>热门访问路径</span><Badge variant="outline">{periodLabels[selectedPeriod]}</Badge></CardTitle><CardDescription>访客实际加载的页面路径与 PV。</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>页面路径</TableHead><TableHead className="text-right">访问次数</TableHead></TableRow></TableHeader><TableBody>{data.topPaths.length ? data.topPaths.map((item) => <TableRow key={item.path}><TableCell className="max-w-[360px] truncate font-mono text-xs"><a href={item.path} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-foreground hover:underline"><span className="truncate">{item.path}</span><ArrowUpRightIcon className="size-3 shrink-0 text-muted-foreground" /></a></TableCell><TableCell className="text-right font-mono font-medium">{formatNumber(item.count)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={2}><Empty /></TableCell></TableRow>}</TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center justify-between text-base"><span>产品浏览排行榜</span><Badge variant="outline">累计</Badge></CardTitle><CardDescription>产品详情页累计浏览量，不受流量周期筛选影响。</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>产品型号</TableHead><TableHead>品牌 / 分类</TableHead><TableHead className="text-right">浏览量</TableHead></TableRow></TableHeader><TableBody>{data.products.topViewed.length ? data.products.topViewed.map((product) => <TableRow key={product.id}><TableCell><a href={`/admin/products/${product.id}`} className="block text-xs font-medium hover:underline">{product.model}</a><span className="block max-w-[180px] truncate text-[11px] text-muted-foreground">{product.name}</span></TableCell><TableCell className="text-xs text-muted-foreground">{product.brand} · {product.category}</TableCell><TableCell className="text-right font-mono text-sm font-medium">{formatNumber(product.viewCount)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={3}><Empty>暂无产品数据</Empty></TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><GlobeIcon className="size-4 text-emerald-500" />访客 IP 地区（推断）</CardTitle><CardDescription>仅显示 Umami 根据 IP 推断的国家、地区和城市，不保存或展示原始 IP。</CardDescription></CardHeader><CardContent className="grid gap-6 sm:grid-cols-3"><div><h3 className="mb-3 text-xs font-medium">国家 / 地区</h3><div className="space-y-2">{data.topCountries.length ? data.topCountries.slice(0, 8).map((item) => <div key={item.code} className="flex justify-between gap-2 text-xs"><span>{item.code}</span><span className="font-mono text-muted-foreground">{formatNumber(item.count)}</span></div>) : <Empty />}</div></div><div><h3 className="mb-3 text-xs font-medium">省州 / 地区</h3><div className="space-y-2">{data.topRegions.length ? data.topRegions.slice(0, 8).map((item) => <div key={`${item.country}-${item.region}`} className="flex justify-between gap-2 text-xs"><span className="truncate">{item.region}</span><span className="font-mono text-muted-foreground">{formatNumber(item.count)}</span></div>) : <Empty />}</div></div><div><h3 className="mb-3 text-xs font-medium">城市</h3><div className="space-y-2">{data.topCities.length ? data.topCities.slice(0, 8).map((item) => <div key={`${item.country}-${item.city}`} className="flex justify-between gap-2 text-xs"><span className="truncate">{item.city}</span><span className="font-mono text-muted-foreground">{formatNumber(item.count)}</span></div>) : <Empty />}</div></div></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><LaptopIcon className="size-4 text-blue-500" />访问终端环境</CardTitle><CardDescription>设备、操作系统与浏览器分布。</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-3"><div><h3 className="mb-3 flex items-center gap-1 text-xs font-medium"><SmartphoneIcon className="size-3" />设备</h3><div className="space-y-2">{data.devices.length ? data.devices.slice(0, 8).map((item) => <div key={item.device} className="flex justify-between gap-2 text-xs"><span>{item.device}</span><span className="font-mono text-muted-foreground">{formatNumber(item.count)}</span></div>) : <Empty />}</div></div><div><h3 className="mb-3 text-xs font-medium">操作系统</h3><div className="space-y-2">{data.os.length ? data.os.slice(0, 8).map((item) => <div key={item.os} className="flex justify-between gap-2 text-xs"><span>{item.os}</span><span className="font-mono text-muted-foreground">{formatNumber(item.count)}</span></div>) : <Empty />}</div></div><div><h3 className="mb-3 text-xs font-medium">浏览器</h3><div className="space-y-2">{data.browsers.length ? data.browsers.slice(0, 8).map((item) => <div key={item.browser} className="flex justify-between gap-2 text-xs"><span>{item.browser}</span><span className="font-mono text-muted-foreground">{formatNumber(item.count)}</span></div>) : <Empty />}</div></div></CardContent></Card>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center justify-between text-base"><span className="flex items-center gap-2"><InboxIcon className="size-4 text-primary" />询价商机</span><Button variant="ghost" size="sm" className="h-7 text-xs" render={<a href="/admin/inquiries" />}>查看全部询价</Button></CardTitle><CardDescription>客户提交的意向需求与处理状态。</CardDescription></CardHeader><CardContent><div className="mb-4 grid grid-cols-3 gap-2"><div className="rounded border p-3 text-center"><div className="text-xs text-muted-foreground">待处理</div><div className="text-lg font-bold font-mono text-destructive">{data.inquiries.newCount}</div></div><div className="rounded border p-3 text-center"><div className="text-xs text-muted-foreground">跟进中</div><div className="text-lg font-bold font-mono text-amber-500">{data.inquiries.processingCount}</div></div><div className="rounded border p-3 text-center"><div className="text-xs text-muted-foreground">已归档</div><div className="text-lg font-bold font-mono text-emerald-500">{data.inquiries.closedCount}</div></div></div><Table><TableHeader><TableRow><TableHead>询价单号 / 客户</TableHead><TableHead>国家</TableHead><TableHead>状态</TableHead><TableHead className="text-right">时间</TableHead></TableRow></TableHeader><TableBody>{data.inquiries.recent.length ? data.inquiries.recent.map((inquiry) => <TableRow key={inquiry.id}><TableCell className="text-xs"><div className="font-medium">{inquiry.name}</div><div className="text-[11px] text-muted-foreground">{inquiry.referenceId}</div></TableCell><TableCell className="text-xs">{inquiry.country}</TableCell><TableCell><Badge variant={inquiry.status === "NEW" ? "destructive" : inquiry.status === "PROCESSING" ? "default" : "secondary"}>{inquiry.status === "NEW" ? "新建" : inquiry.status === "PROCESSING" ? "处理中" : "关闭"}</Badge></TableCell><TableCell className="text-right font-mono text-xs text-muted-foreground">{inquiry.createdAt}</TableCell></TableRow>) : <TableRow><TableCell colSpan={4}><Empty>暂无询价记录</Empty></TableCell></TableRow>}</TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center justify-between text-base"><span>品牌产品储备分布</span><Button variant="ghost" size="sm" className="h-7 text-xs" render={<a href="/admin/products" />}>管理产品</Button></CardTitle><CardDescription>已建档品牌的在库产品款数分布。</CardDescription></CardHeader><CardContent><div className="space-y-4">{data.products.brandDistribution.length ? data.products.brandDistribution.map((brand) => { const percent = data.products.totalCount > 0 ? Math.round((brand.count / data.products.totalCount) * 100) : 0; return <div key={brand.name} className="space-y-1"><div className="flex justify-between text-xs"><span className="font-medium">{brand.name}</span><span className="font-mono text-muted-foreground">{brand.count} 款 ({percent}%)</span></div><div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div></div>; }) : <Empty>暂无品牌数据</Empty>}</div></CardContent></Card>
    </div>
  </main>;
}
