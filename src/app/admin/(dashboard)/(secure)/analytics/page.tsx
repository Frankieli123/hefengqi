import { Suspense } from "react";
import { requireSecureAdmin } from "@/lib/admin-session";
import { analyticsPeriodKeys, getAnalyticsOverview, getVisitorAnalyticsData, type AnalyticsPeriod } from "@/lib/analytics-service";
import { AnalyticsOverviewHeader, AnalyticsVisitorSection, AnalyticsSummarySection, AnalyticsAuditSection } from "./analytics-sections";

export const metadata = { title: "统计分析", robots: { index: false, follow: false } };

type AnalyticsSearchParams = {
  period?: string | string[];
  startDate?: string | string[];
  endDate?: string | string[];
  page?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const dynamic = "force-dynamic";

function SectionLoading({ label }: { label: string }) {
  return <div role="status" aria-live="polite" className="rounded-xl border p-5 text-sm text-muted-foreground">{label}加载中…</div>;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<AnalyticsSearchParams> }) {
  // Never start requests for protected visitor data before authorization.
  await requireSecureAdmin();
  const query = await searchParams;
  const periodParam = firstParam(query.period);
  const selectedPeriod = analyticsPeriodKeys.includes(periodParam as AnalyticsPeriod) ? periodParam as AnalyticsPeriod : "30d";
  const visitorOptions = {
    startDate: firstParam(query.startDate),
    endDate: firstParam(query.endDate),
    page: Number.parseInt(firstParam(query.page) ?? "1", 10),
  };
  // Independent promises: a slow visitor lookup cannot hold up summary rendering.
  const overviewPromise = getAnalyticsOverview(selectedPeriod);
  const visitorPromise = getVisitorAnalyticsData(visitorOptions);
  const sectionKey = JSON.stringify([selectedPeriod, visitorOptions]);

  return <main className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-6 p-4 text-sm [font-variant-numeric:tabular-nums] md:p-7 [&_[data-slot=card]]:min-w-0">
    <Suspense key={`overview-${sectionKey}`} fallback={<SectionLoading label="统计分析 · 访问周期概览" />}>
      <AnalyticsOverviewHeader dataPromise={overviewPromise} selectedPeriod={selectedPeriod} visitorOptions={visitorOptions} />
    </Suspense>
    <Suspense key={`summary-${sectionKey}`} fallback={<SectionLoading label="其他统计" />}>
      <AnalyticsSummarySection dataPromise={overviewPromise} selectedPeriod={selectedPeriod} visitorOptions={visitorOptions} />
    </Suspense>
    <Suspense key={`visitors-${sectionKey}`} fallback={<SectionLoading label="访客访问轨迹" />}>
      <AnalyticsVisitorSection dataPromise={visitorPromise} selectedPeriod={selectedPeriod} />
    </Suspense>
    <Suspense key={`audit-${sectionKey}`} fallback={<SectionLoading label="历史审计与口径" />}>
      <AnalyticsAuditSection dataPromise={overviewPromise} selectedPeriod={selectedPeriod} visitorOptions={visitorOptions} />
    </Suspense>
  </main>;
}
