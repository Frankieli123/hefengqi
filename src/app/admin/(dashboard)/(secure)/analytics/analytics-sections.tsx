import {
  ActivityIcon,
  ArrowUpRightIcon,
  BarChart3Icon,
  ExternalLinkIcon,
  EyeIcon,
  GlobeIcon,
  InboxIcon,
  LaptopIcon,
  RouteIcon,
  SmartphoneIcon,
  UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { analyticsPeriodKeys, resolveVisitorDateRange, type AnalyticsData, type AnalyticsPeriod, type VisitorPageViewOptions } from "@/lib/analytics-service";
import { AnalyticsTrend } from "./analytics-trend";
import { formatRegionName, formatCityName } from "@/lib/geo-names";

const periodLabels: Record<AnalyticsPeriod, string> = { today: "今日", "7d": "近 7 天", "30d": "近 30 天", all: "保留记录（最多 90 天）" };

const regionNames = new Intl.DisplayNames(["zh-CN"], { type: "region" });
function formatCountryName(code: string) {
  if (!code || code === "UNKNOWN") return "未知地区";
  try {
    return regionNames.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}
function formatNumber(value: number | null | undefined) {
  if (value == null) return "不可用";
  return new Intl.NumberFormat("zh-CN").format(value);
}

function Empty({ children = "暂无记录" }: { children?: string }) {
  return <div className="py-5 text-center text-sm text-muted-foreground">{children}</div>;
}

type OverviewData = Omit<AnalyticsData, "visitorPageViews" | "visitorPageViewMeta">;
type OverviewProps = { dataPromise: Promise<OverviewData>; selectedPeriod: AnalyticsPeriod; visitorOptions: VisitorPageViewOptions };

export async function AnalyticsOverviewHeader({ dataPromise, selectedPeriod, visitorOptions }: OverviewProps) {
  const data = await dataPromise;
  const visitorRange = resolveVisitorDateRange(visitorOptions);
  const analyticsHref = (values: { period?: AnalyticsPeriod; page?: number }) => {
    const params = new URLSearchParams({
      period: values.period ?? selectedPeriod,
      startDate: visitorRange.startDate,
      endDate: visitorRange.endDate,
      page: String(values.page ?? 1),
    });
    return `/admin/analytics?${params.toString()}`;
  };
  return <>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2"><BarChart3Icon className="size-6 text-primary" /><h1 className="text-2xl font-semibold">统计分析</h1></div>
        <p className="mt-1 text-sm text-muted-foreground">查看站点访问趋势，以及受权限保护的逐条 IP、国家地区和页面访问明细。</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={data.source.available ? "secondary" : "destructive"}>{data.source.available ? `最近成功更新 · ${data.source.timezone}` : "统计服务未连接"}</Badge>
        {data.source.available && data.source.updatedAt ? <time className="text-sm text-muted-foreground" dateTime={data.source.updatedAt}>{new Date(data.source.updatedAt).toLocaleString("zh-CN", {timeZone: data.source.timezone, hour12: false})}</time> : null}
        <Button variant="outline" size="sm" render={<a href="/u" target="_blank" rel="noreferrer" />}><ExternalLinkIcon data-icon="inline-start" />打开 Umami</Button>
      </div>
    </div>
    {data.source.available && data.source.message ? <p role="status" className="text-sm text-amber-700">{data.source.message}</p> : null}
    {!data.source.available ? <Card><CardContent className="py-4 text-sm text-muted-foreground">{data.source.message}</CardContent></Card> : null}

    <nav aria-label="访问周期" className="flex max-w-full flex-wrap gap-1 rounded-lg border bg-muted/30 p-1 sm:w-fit">
      {analyticsPeriodKeys.map((period) => <a key={period} href={analyticsHref({ period })} aria-current={period === selectedPeriod ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-background ${period === selectedPeriod ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{periodLabels[period]}</a>)}
    </nav>
    <p className="text-sm text-muted-foreground">周期仅筛选候选流量与询价；访客日期单独查询。切换周期保留日期，分页回到第 1 页。</p>
  </>;
}

export async function AnalyticsVisitorSection({ dataPromise, selectedPeriod }: { dataPromise: Promise<{ rows: AnalyticsData["visitorPageViews"]; meta: AnalyticsData["visitorPageViewMeta"]; source?: Pick<AnalyticsData["source"], "available" | "message" | "timezone" | "updatedAt"> }>; selectedPeriod: AnalyticsPeriod }) {
  let result: Awaited<typeof dataPromise>;
  try { result = await dataPromise; }
  catch { return <Card><CardHeader><CardTitle>访客访问轨迹</CardTitle></CardHeader><CardContent role="alert" className="text-sm text-amber-700">访客数据暂时无法加载，请稍后重试。其他统计模块不受影响；此处未将查询失败显示为零访问。</CardContent></Card>; }
  const { rows, meta: visitMeta, source } = result;
  const analyticsHref = (values: { period?: AnalyticsPeriod; page?: number }) => {
    const params = new URLSearchParams({
      period: values.period ?? selectedPeriod,
      startDate: visitMeta.startDate,
      endDate: visitMeta.endDate,
      page: String(values.page ?? 1),
    });
    return `/admin/analytics?${params.toString()}`;
  };
  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2"><RouteIcon className="size-4 text-primary" />访客访问轨迹</span>
          <Badge variant="outline">{formatNumber(visitMeta.totalCount)} 个 IP 分组（非人数） · {formatNumber(visitMeta.totalVisits)} 次访问</Badge>
        </CardTitle>
        <CardDescription>候选访问按 IP 合并，不是人数或 cookie UV；历史缺失 UA 保留且未验证真人。仅覆盖实际保留的最多 90 天；地区本地优先，缺失时按 Umami 会话 ID 精确补全。</CardDescription>
        <p className="text-sm text-muted-foreground">{visitMeta.countingPolicy} 已排除自动化 {formatNumber(visitMeta.hiddenCrawlerVisits)} 次；保留缺失 UA {formatNumber(visitMeta.unknownUaVisits)} 次（未知）。</p>
        {source?.message ? <p role="status" className="text-sm text-amber-700">{source.message}</p> : null}
        {source?.updatedAt ? <p className="text-sm text-muted-foreground">访客数据更新时间：<time dateTime={source.updatedAt}>{new Date(source.updatedAt).toLocaleString("zh-CN", {timeZone: source.timezone, hour12: false})}</time></p> : null}
        <form method="get" action="/admin/analytics" className="flex flex-wrap items-end gap-3 pt-2">
          <input type="hidden" name="period" value={selectedPeriod} />
          <label className="grid gap-1.5 text-sm text-muted-foreground">开始日期<input type="date" name="startDate" defaultValue={visitMeta.startDate} className="h-11 rounded-md border bg-background px-3 text-sm text-foreground" /></label>
          <label className="grid gap-1.5 text-sm text-muted-foreground">结束日期<input type="date" name="endDate" defaultValue={visitMeta.endDate} className="h-11 rounded-md border bg-background px-3 text-sm text-foreground" /></label>
          <Button type="submit" size="sm" className="h-11">查询</Button>
        </form>
        <p className="text-xs text-muted-foreground">明细表可横向滚动查看完整字段；展开访问轨迹可查看全部路径。</p>
      </CardHeader>
      <CardContent className="min-w-0 p-0">
        <div role="region" aria-label="访客轨迹表，可横向滚动" tabIndex={0} className="min-w-0 overflow-x-auto [&_[data-slot=table-container]]:overflow-visible">
        <Table className="w-[1100px] min-w-full table-fixed [&_td]:align-top">
          <TableHeader><TableRow><TableHead className="w-[180px]">IP 地址</TableHead><TableHead className="w-[230px]">国家 / 地区</TableHead><TableHead className="w-[100px]">访问次数</TableHead><TableHead>访问页面</TableHead><TableHead className="w-[190px]">首次 / 最近访问</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length ? rows.map((item) => <TableRow key={item.id}>
              <TableCell className="font-mono text-sm font-medium">{item.ipAddress}</TableCell>
              <TableCell className="text-sm"><div className="font-medium">{item.geoStatus === "unavailable" ? "未获得地区" : formatCountryName(item.country)}</div><div className="mt-1 text-xs text-muted-foreground">{item.geoStatus === "unavailable" ? "未找到可关联的地区信息" : [item.region, item.city].filter((value) => value !== "—").join(" · ") || "省市未推断"}</div></TableCell>
              <TableCell className="font-mono text-sm font-medium">{formatNumber(item.visitCount)}{item.unknownUaVisits ? <div className="mt-1 text-xs text-muted-foreground">其中缺失 UA {formatNumber(item.unknownUaVisits)} 次（未知）</div> : null}</TableCell>
              <TableCell className="whitespace-normal text-sm"><details><summary className="cursor-pointer font-medium">{item.pages.length} 个页面 · 展开轨迹</summary><ul className="mt-3 space-y-2">{item.pages.map((page) => <li key={page.path}><a href={page.path} target="_blank" rel="noreferrer" title={`${page.path} · ${page.count} 次`} className="break-all font-mono text-sm hover:underline">{page.path} <span className="text-muted-foreground">×{page.count}</span></a></li>)}</ul></details></TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground"><div>{item.firstVisitedAt}</div><div className="mt-1">{item.lastVisitedAt}</div></TableCell>
            </TableRow>) : <TableRow><TableCell colSpan={5}><Empty>所选日期没有访问记录</Empty></TableCell></TableRow>}
          </TableBody>
        </Table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3"><p className="text-sm text-muted-foreground">第 {visitMeta.page} / {visitMeta.totalPages} 页，每页 {visitMeta.pageSize} 个 IP</p><div className="flex gap-2">{visitMeta.page > 1 ? <Button variant="outline" size="sm" render={<a href={analyticsHref({ page: visitMeta.page - 1 })} />}>上一页</Button> : null}{visitMeta.page < visitMeta.totalPages ? <Button variant="outline" size="sm" render={<a href={analyticsHref({ page: visitMeta.page + 1 })} />}>下一页</Button> : null}</div></div>
      </CardContent>
    </Card>

  );
}

export async function AnalyticsSummarySection({ dataPromise, selectedPeriod }: OverviewProps) {
  const data = await dataPromise;
  const activeTraffic = data.trafficByPeriod[selectedPeriod];
  const kpis = [
    { title: "页面浏览量 (PV)", value: activeTraffic.pageviews, sub: "候选页面加载次数", icon: EyeIcon },
    { title: "候选独立标识 (UV)", value: activeTraffic.visitors, sub: "匿名 cookie 去重，非人数", icon: UsersIcon },
    { title: "候选访问会话", value: activeTraffic.visits, sub: "sessionKey 去重，非人数", icon: ActivityIcon },
    { title: "询价单数", value: data.inquiries.totalCount, sub: selectedPeriod === "all" ? "业务历史累计，未归因访客" : "所选周期新增，未归因访客", icon: InboxIcon },
  ];
  return <section aria-label="运营摘要" className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-base font-semibold">核心指标</h2><p className="text-sm text-muted-foreground">{periodLabels[selectedPeriod]} · 候选访问，未验证真人</p></div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{kpis.map((kpi) => <Card key={kpi.title} className="min-w-0 shadow-none"><CardHeader className="flex flex-row items-center justify-between gap-2"><CardDescription className="text-sm font-medium">{kpi.title}</CardDescription><kpi.icon className="size-4 shrink-0 text-muted-foreground" /></CardHeader><CardContent><div className="font-mono text-2xl font-semibold tabular-nums sm:text-3xl">{formatNumber(kpi.value)}</div><p className="mt-2 text-sm text-muted-foreground">{kpi.sub}</p></CardContent></Card>)}</div>
    <AnalyticsTrend dailyTraffic={data.dailyTraffic} timezone={data.source.timezone} available={data.source.available} periodLabel={periodLabels[selectedPeriod]} />
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center justify-between text-base"><span>热门访问路径</span><Badge variant="outline">{periodLabels[selectedPeriod]}</Badge></CardTitle><CardDescription>本地 UA 过滤后候选页面加载 PV，与所选周期概览使用相同过滤规则。</CardDescription></CardHeader><CardContent className="min-w-0 p-0"><Table><TableHeader><TableRow><TableHead>页面路径</TableHead><TableHead className="text-right">访问次数</TableHead></TableRow></TableHeader><TableBody>{data.topPaths.length ? data.topPaths.map((item) => <TableRow key={item.path}><TableCell className="max-w-[360px] whitespace-normal break-all font-mono text-sm"><a href={item.path} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-foreground hover:underline"><span className="whitespace-normal break-all">{item.path}</span><ArrowUpRightIcon className="size-3 shrink-0 text-muted-foreground" /></a></TableCell><TableCell className="text-right font-mono font-medium">{formatNumber(item.count)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={2}><Empty>{data.source.available ? "暂无记录" : "本地统计不可用"}</Empty></TableCell></TableRow>}</TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center justify-between text-base"><span>产品浏览排行榜</span><Badge variant="outline">累计</Badge></CardTitle><CardDescription>业务累计浏览 {formatNumber(data.products.totalViews)} 次，未按 UA 清理，不受候选流量周期筛选影响。</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>产品型号</TableHead><TableHead>品牌 / 分类</TableHead><TableHead className="text-right">浏览量</TableHead></TableRow></TableHeader><TableBody>{data.products.topViewed.length ? data.products.topViewed.map((product) => <TableRow key={product.id}><TableCell><a href={`/admin/products/${product.id}`} className="block text-sm font-medium hover:underline">{product.model}</a><span className="block max-w-[240px] whitespace-normal break-words text-xs text-muted-foreground">{product.name}</span></TableCell><TableCell className="text-sm text-muted-foreground">{product.brand} · {product.category}</TableCell><TableCell className="text-right font-mono text-sm font-medium">{formatNumber(product.viewCount)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={3}><Empty>暂无产品数据</Empty></TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    </div>
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><GlobeIcon className="size-4 text-muted-foreground" />热门地区 · IP 推断</CardTitle><CardDescription>{data.legacySource?.message} IP 地区仅为推断，不证明真人。</CardDescription></CardHeader><CardContent className="grid gap-6 sm:grid-cols-3"><div><h3 className="mb-3 text-sm font-medium">国家 / 地区</h3><div className="space-y-2">{data.topCountries.length ? data.topCountries.slice(0, 8).map((item) => <div key={item.code} className="flex justify-between gap-2 text-sm"><span title={item.code} className="whitespace-normal break-all">{formatCountryName(item.code)}</span><span className="font-mono text-muted-foreground">{formatNumber(item.count)}</span></div>) : <Empty />}</div></div><div><h3 className="mb-3 text-sm font-medium">省州 / 地区</h3><div className="space-y-2">{data.topRegions.length ? data.topRegions.slice(0, 8).map((item) => <div key={`${item.country}-${item.region}`} className="flex justify-between gap-2 text-sm"><span title={item.region} className="whitespace-normal break-all">{formatRegionName(item.region)}</span><span className="font-mono text-muted-foreground">{formatNumber(item.count)}</span></div>) : <Empty />}</div></div><div><h3 className="mb-3 text-sm font-medium">城市</h3><div className="space-y-2">{data.topCities.length ? data.topCities.slice(0, 8).map((item) => <div key={`${item.country}-${item.city}`} className="flex justify-between gap-2 text-sm"><span title={item.city} className="whitespace-normal break-all">{formatCityName(item.city)}</span><span className="font-mono text-muted-foreground">{formatNumber(item.count)}</span></div>) : <Empty />}</div></div></CardContent></Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base"><span className="flex items-center gap-2"><InboxIcon className="size-4 text-primary" />询价商机</span><Button variant="ghost" size="sm" className="h-11 text-sm" render={<a href="/admin/inquiries" />}>查看全部询价</Button></CardTitle>
          <CardDescription>{selectedPeriod === "all" ? "业务历史累计" : periodLabels[selectedPeriod]}客户意向需求与处理状态；未逐条归因到候选访客，不计算转化率。</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded border p-3 text-center"><div className="text-sm text-muted-foreground">待处理</div><div className="text-lg font-bold font-mono text-destructive">{data.inquiries.newCount}</div></div>
            <div className="rounded border p-3 text-center"><div className="text-sm text-muted-foreground">跟进中</div><div className="text-lg font-bold font-mono text-muted-foreground">{data.inquiries.processingCount}</div></div>
            <div className="rounded border p-3 text-center"><div className="text-sm text-muted-foreground">已归档</div><div className="text-lg font-bold font-mono text-muted-foreground">{data.inquiries.closedCount}</div></div>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">明细表可横向滚动查看完整日期及字段。</p>
          <div role="region" aria-label="询价明细表，可横向滚动" tabIndex={0} className="overflow-x-auto [&_[data-slot=table-container]]:overflow-visible">
            <Table className="min-w-[520px]">
              <TableHeader><TableRow><TableHead>询价单号 / 客户</TableHead><TableHead>国家</TableHead><TableHead>状态</TableHead><TableHead className="text-right">时间</TableHead></TableRow></TableHeader>
              <TableBody>{data.inquiries.recent.length ? data.inquiries.recent.map((inquiry) => <TableRow key={inquiry.id}><TableCell className="text-sm"><div className="font-medium">{inquiry.name}</div><div className="text-xs text-muted-foreground">{inquiry.referenceId}</div></TableCell><TableCell className="text-sm">{inquiry.country}</TableCell><TableCell><Badge variant={inquiry.status === "NEW" ? "destructive" : inquiry.status === "PROCESSING" ? "default" : "secondary"}>{inquiry.status === "NEW" ? "新建" : inquiry.status === "PROCESSING" ? "处理中" : "关闭"}</Badge></TableCell><TableCell className="text-right font-mono text-sm text-muted-foreground">{inquiry.createdAt}</TableCell></TableRow>) : <TableRow><TableCell colSpan={4}><Empty>暂无询价记录</Empty></TableCell></TableRow>}</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  </section>;
}

export async function AnalyticsAuditSection({ dataPromise, selectedPeriod }: OverviewProps) {
  const data = await dataPromise;
  const activeTraffic = data.trafficByPeriod[selectedPeriod];
  return <section aria-label="历史审计与口径" className="min-w-0 space-y-3">
    <details className="rounded-xl border bg-card"><summary className="cursor-pointer px-4 py-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">已保存流量分层与爬虫历史快照</summary>
    <Card>
      <CardHeader>
        <CardTitle className="text-base">已保存流量分层与爬虫历史快照 · {periodLabels[selectedPeriod]}</CardTitle>
        <CardDescription>仅查询本地实际保存的最多 90 天 AnalyticsPageView。原始 PV = 明确自动化 PV + 剩余候选 PV；缺失 UA 是候选中的子集，不另行相加。候选访问未验证真人。</CardDescription>
        <p role="note" className="text-sm font-medium text-amber-700">覆盖限制：过滤版本上线后，明确自动化已停止持久化；历史快照不是完整爬虫请求记录。当前未做 DNS 验证，品牌仅为可伪装的 UA 声明。国家 / 省州 / 城市仅为已保存的地区提示，不是已验证位置；不做推断映射。</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.trafficBreakdown ? <>
          <p className="text-sm text-muted-foreground">规则版本：{data.trafficBreakdown.ruleVersion}</p>
          <dl className="grid gap-3 sm:grid-cols-4">{[
            ["已记录原始 PV", data.trafficBreakdown.recordedRawPageviews],
            ["明确自动化 PV", data.trafficBreakdown.explicitAutomationPageviews],
            ["剩余候选 PV（未验证真人）", data.trafficBreakdown.remainingCandidatePageviews],
            ["其中缺失 UA PV（子集）", data.trafficBreakdown.missingUaPageviews],
          ].map(([label, count]) => <div key={label} className="rounded border p-3"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="font-mono text-lg">{formatNumber(Number(count))}</dd></div>)}</dl>
          <p className="text-sm text-muted-foreground">各品牌返回全部已保存 PV 与去重路径数；地区 / 路径 / 语言为 PV 次数，不是人数。仅显示各维度前 8 项、路径前 10 项、脱敏 IP 样本前 3 项，截断项之和可能小于品牌 PV。语言来自保存的 locale（页面语言），不是访客母语。</p>
          {data.trafficBreakdown.crawlers.length ? data.trafficBreakdown.crawlers.map(crawler => <div key={crawler.brand} className="space-y-2 rounded border p-3">
            <h3 className="text-sm font-medium">{crawler.brand} · {formatNumber(crawler.pageviews)} PV · {formatNumber(crawler.distinctPaths)} 个去重路径</h3>
            <p className="break-all font-mono text-sm text-muted-foreground">首次（UTC）：{crawler.firstVisitedAt}；最近（UTC）：{crawler.lastVisitedAt}</p>
            <p className="text-sm">脱敏 IP 样本：{crawler.maskedIpSamples.join("、")}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{([
              ["国家提示", crawler.countries], ["省州提示（含国家）", crawler.regions], ["城市提示（含国家 / 省州）", crawler.cities], ["页面语言", crawler.languages], ["访问路径", crawler.paths],
            ] as const).map(([label, items]) => <div key={label}><h4 className="text-sm font-medium">{label}</h4><ul className="mt-1 space-y-1">{items.map(item => <li key={item.value} className="break-all text-sm text-muted-foreground">{item.value} · {formatNumber(item.count)}</li>)}</ul></div>)}</div>
          </div>) : <Empty>所选周期没有已保存的明确自动化记录；不代表没有爬虫请求。</Empty>}
        </> : <Empty>流量分层数据不可用；不将缺失数据解释为零爬虫请求。</Empty>}
      </CardContent>
    </Card>


    </details>
    <details className="rounded-xl border bg-card"><summary className="cursor-pointer px-4 py-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">数据来源与统计口径 · 周期对照</summary><div className="space-y-4 border-t p-4">
      <p className="text-sm text-muted-foreground">{data.source.countingPolicy}</p>
      <p className="text-sm text-muted-foreground">本地历史窗口：{data.source.historyStart} 至 {data.source.historyEnd}；窗口内实际保存范围可能更短，不补造缺失历史。</p>
      <p className="text-sm text-muted-foreground">当前周期排除自动化 {formatNumber(activeTraffic.hiddenCrawlerVisits)} 次；保留缺失 UA {formatNumber(activeTraffic.unknownUaPageviews)} 次（未知，未验证真人）。</p>
      <p className="text-sm text-muted-foreground">平均访问时长不可用：{data.source.durationPolicy} 询价转化率不可用：未逐条归因到候选访客，不计算。</p>
      <p className="text-sm text-muted-foreground">{data.legacySource?.message}</p>
      <p className="text-sm text-muted-foreground">产品储备：{formatNumber(data.products.totalCount)} 款已建档产品，累计浏览 {formatNumber(data.products.totalViews)} 次；不受候选流量周期筛选影响。</p>
      <Table><TableHeader><TableRow><TableHead>候选周期</TableHead><TableHead>PV</TableHead><TableHead>UV</TableHead><TableHead>会话</TableHead></TableRow></TableHeader><TableBody>{analyticsPeriodKeys.map((period) => <TableRow key={period}><TableCell>{periodLabels[period]}</TableCell><TableCell>{formatNumber(data.trafficByPeriod[period].pageviews)}</TableCell><TableCell>{formatNumber(data.trafficByPeriod[period].visitors)}</TableCell><TableCell>{formatNumber(data.trafficByPeriod[period].visits)}</TableCell></TableRow>)}</TableBody></Table>
    </div></details>
    <details className="rounded-xl border bg-card"><summary className="cursor-pointer px-4 py-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">终端环境与品牌产品储备</summary><div className="grid min-w-0 gap-4 p-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><LaptopIcon className="size-4 text-muted-foreground" />访问终端环境</CardTitle><CardDescription>{data.legacySource?.message} 设备、操作系统与浏览器分布。</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-3"><div><h3 className="mb-3 flex items-center gap-1 text-sm font-medium"><SmartphoneIcon className="size-3" />设备</h3><div className="space-y-2">{data.devices.length ? data.devices.slice(0, 8).map((item) => <div key={item.device} className="flex justify-between gap-2 text-sm"><span>{item.device}</span><span className="font-mono text-muted-foreground">{formatNumber(item.count)}</span></div>) : <Empty />}</div></div><div><h3 className="mb-3 text-sm font-medium">操作系统</h3><div className="space-y-2">{data.os.length ? data.os.slice(0, 8).map((item) => <div key={item.os} className="flex justify-between gap-2 text-sm"><span>{item.os}</span><span className="font-mono text-muted-foreground">{formatNumber(item.count)}</span></div>) : <Empty />}</div></div><div><h3 className="mb-3 text-sm font-medium">浏览器</h3><div className="space-y-2">{data.browsers.length ? data.browsers.slice(0, 8).map((item) => <div key={item.browser} className="flex justify-between gap-2 text-sm"><span>{item.browser}</span><span className="font-mono text-muted-foreground">{formatNumber(item.count)}</span></div>) : <Empty />}</div></div></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center justify-between text-base"><span>品牌产品储备分布</span><Button variant="ghost" size="sm" className="h-7 text-sm" render={<a href="/admin/products" />}>管理产品</Button></CardTitle><CardDescription>已建档品牌的在库产品款数分布。</CardDescription></CardHeader><CardContent><div className="space-y-4">{data.products.brandDistribution.length ? data.products.brandDistribution.map((brand) => { const percent = data.products.totalCount > 0 ? Math.round((brand.count / data.products.totalCount) * 100) : 0; return <div key={brand.name} className="space-y-1"><div className="flex justify-between text-sm"><span className="font-medium">{brand.name}</span><span className="font-mono text-muted-foreground">{brand.count} 款 ({percent}%)</span></div><div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div></div>; }) : <Empty>暂无品牌数据</Empty>}</div></CardContent></Card>
    </div></details>
  </section>;
}
