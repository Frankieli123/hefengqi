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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSecureAdmin } from "@/lib/admin-session";
import { getCompleteAnalyticsData } from "@/lib/analytics-service";

export const metadata = {
  title: "统计分析",
  robots: { index: false, follow: false },
};

export default async function AnalyticsPage() {
  await requireSecureAdmin();
  const data = await getCompleteAnalyticsData();

  const kpis = [
    {
      title: "全站总浏览量 (PV)",
      value: data.traffic.pageviews,
      sub: "30天全站页面被加载总数",
      icon: EyeIcon,
      color: "text-blue-500",
    },
    {
      title: "独立访客数 (UV)",
      value: data.traffic.visitors,
      sub: "30天独立访客设备统计",
      icon: UsersIcon,
      color: "text-emerald-500",
    },
    {
      title: "访问会话数 (Sessions)",
      value: data.traffic.visits,
      sub: "30天访客停留会话总数",
      icon: ActivityIcon,
      color: "text-indigo-500",
    },
    {
      title: "产品总浏览量",
      value: data.products.totalViews,
      sub: `已录入 ${data.products.totalCount} 款产品累计浏览`,
      icon: BoxesIcon,
      color: "text-primary",
    },
    {
      title: "平均访问时长",
      value: data.traffic.avgDurationFormatted,
      sub: "访客在站内的平均停留时间",
      icon: ClockIcon,
      color: "text-amber-500",
    },
    {
      title: "询价转化率",
      value: `${data.inquiries.conversionRate}%`,
      sub: `总询价 ${data.inquiries.totalCount} 单 / 访客`,
      icon: PercentIcon,
      color: "text-rose-500",
    },
  ];

  return (
    <main className="flex flex-col gap-6 p-5 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3Icon className="size-6 text-primary" />
            <h1 className="text-2xl font-semibold">统计分析大屏</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            全站实时流量监控、访客地域终端分布、热门产品访问排行与询价转化。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={
              <a
                href="http://127.0.0.1:3008"
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            <ExternalLinkIcon data-icon="inline-start" />
            打开 Umami 流量大屏
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-xs font-medium">
                {kpi.title}
              </CardDescription>
              <kpi.icon className={`size-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{kpi.value}</div>
              <p className="mt-1 text-[11px] text-muted-foreground truncate">
                {kpi.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section 1: Top Visited Pages & Top Viewed Products */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>热门访问页面 (Top Pages)</span>
              <Badge variant="outline" className="font-normal text-xs">
                实时统计
              </Badge>
            </CardTitle>
            <CardDescription>
              访客最常查看的页面路径与点击频次。
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>页面路径</TableHead>
                  <TableHead className="text-right">访问次数 (PV)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topPaths.length ? (
                  data.topPaths.map((p) => (
                    <TableRow key={p.path}>
                      <TableCell className="font-mono text-xs max-w-[280px] truncate">
                        <a
                          href={p.path}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline text-foreground flex items-center gap-1"
                        >
                          <span className="truncate">{p.path}</span>
                          <ArrowUpRightIcon className="size-3 text-muted-foreground shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {p.count}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                      暂无访问记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>产品浏览排行榜 (Top Products)</span>
              <Badge variant="outline" className="font-normal text-xs">
                数据库落盘
              </Badge>
            </CardTitle>
            <CardDescription>
              按实际访问次数排序的热门型号与商品。
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>产品型号</TableHead>
                  <TableHead>品牌 / 分类</TableHead>
                  <TableHead className="text-right">浏览量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.products.topViewed.length ? (
                  data.products.topViewed.map((prod) => (
                    <TableRow key={prod.id}>
                      <TableCell>
                        <a
                          href={`/admin/products/${prod.id}`}
                          className="font-medium hover:underline text-xs block"
                        >
                          {prod.model}
                        </a>
                        <span className="text-[11px] text-muted-foreground truncate block max-w-[180px]">
                          {prod.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span>{prod.brand}</span>
                        <span className="mx-1">·</span>
                        <span>{prod.category}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-sm">
                        {prod.viewCount}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      暂无产品数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Visitor Geos, Devices & Environment */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Geos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <GlobeIcon className="size-4 text-emerald-500" />
              <span>访客地域分布</span>
            </CardTitle>
            <CardDescription className="text-xs">
              来源城市与国家代码
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topCities.length ? (
                data.topCities.map((item) => (
                  <div
                    key={item.city}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="font-medium">
                      {item.city} ({item.country})
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {item.count} 次
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground py-4 text-center">
                  暂无地域记录
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Devices */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <LaptopIcon className="size-4 text-blue-500" />
              <span>访问终端类型</span>
            </CardTitle>
            <CardDescription className="text-xs">
              PC 电脑与移动设备占比
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.devices.length ? (
                data.devices.map((d) => (
                  <div
                    key={d.device}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="capitalize font-medium">
                      {d.device === "laptop"
                        ? "电脑 (Laptop/PC)"
                        : d.device === "mobile"
                        ? "移动端 (Mobile)"
                        : d.device}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {d.count} 次
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground py-4 text-center">
                  暂无设备记录
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Browsers & OS */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <SmartphoneIcon className="size-4 text-purple-500" />
              <span>操作系统与浏览器</span>
            </CardTitle>
            <CardDescription className="text-xs">
              客户端运行环境
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.os.length ? (
                data.os.slice(0, 4).map((item) => (
                  <div
                    key={item.os}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="font-medium">{item.os}</span>
                    <span className="font-mono text-muted-foreground">
                      {item.count} 次
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground py-4 text-center">
                  暂无系统记录
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Inquiries & Brand Inventory */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inquiries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <InboxIcon className="size-4 text-primary" />
                <span>询价商机漏斗</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                render={<a href="/admin/inquiries" />}
              >
                查看全部询价
              </Button>
            </CardTitle>
            <CardDescription>
              客户提交的意向需求与处理状态。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded border p-3 text-center">
                <div className="text-xs text-muted-foreground">待处理</div>
                <div className="text-lg font-bold font-mono text-destructive">
                  {data.inquiries.newCount}
                </div>
              </div>
              <div className="rounded border p-3 text-center">
                <div className="text-xs text-muted-foreground">跟进中</div>
                <div className="text-lg font-bold font-mono text-amber-500">
                  {data.inquiries.processingCount}
                </div>
              </div>
              <div className="rounded border p-3 text-center">
                <div className="text-xs text-muted-foreground">已归档</div>
                <div className="text-lg font-bold font-mono text-emerald-500">
                  {data.inquiries.closedCount}
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>询价单号 / 客户</TableHead>
                  <TableHead>国家</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.inquiries.recent.length ? (
                  data.inquiries.recent.map((inq) => (
                    <TableRow key={inq.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium">{inq.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {inq.company || inq.referenceId}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{inq.country}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            inq.status === "NEW"
                              ? "destructive"
                              : inq.status === "PROCESSING"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {inq.status === "NEW"
                            ? "新建"
                            : inq.status === "PROCESSING"
                            ? "处理中"
                            : "关闭"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {inq.createdAt}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                      暂无询价记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Brand Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>品牌产品储备分布</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                render={<a href="/admin/products" />}
              >
                管理产品
              </Button>
            </CardTitle>
            <CardDescription>
              已建档品牌的在库产品款数分布。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.products.brandDistribution.map((brand) => {
                const percent =
                  data.products.totalCount > 0
                    ? Math.round(
                        (brand.count / data.products.totalCount) * 100
                      )
                    : 0;
                return (
                  <div key={brand.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{brand.name}</span>
                      <span className="font-mono text-muted-foreground">
                        {brand.count} 款 ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
