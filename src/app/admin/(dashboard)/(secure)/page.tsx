import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3Icon } from "lucide-react";
import { db } from "@/lib/db";

export const metadata = { title: "后台概览", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const [products, inquiries, review, dead, viewsAggregate] = await Promise.all([
    db.product.count(),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.product.count({ where: { status: "NEEDS_REVIEW" } }),
    db.crawlJob.count({ where: { status: "DEAD" } }),
    db.product.aggregate({ _sum: { viewCount: true } }),
  ]);
  const totalViews = viewsAggregate._sum.viewCount ?? 0;
  const stats = [
    ["产品总数", products],
    ["产品总浏览量", totalViews],
    ["新询价", inquiries],
    ["待复核内容", review],
    ["死信任务", dead],
  ] as const;

  return (
    <main className="flex flex-col gap-6 p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">工作概览</h1>
          <p className="mt-2 text-sm text-muted-foreground">查看需要处理的内容、询价、产品浏览统计和站点流量。</p>
        </div>
        <Button variant="outline" render={<a href="/admin/analytics" />}>
          <BarChart3Icon data-icon="inline-start" />
          查看详细统计分析大屏
        </Button>
      </div>
      {denied ? (
        <Alert variant="destructive">
          <AlertTitle>权限不足</AlertTitle>
          <AlertDescription>此操作仅管理员可用。</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl font-mono">{value}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">实时数据库统计</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
