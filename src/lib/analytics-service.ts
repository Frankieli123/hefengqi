import { db } from "@/lib/db";

export interface AnalyticsData {
  traffic: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    bounceRate: number;
    avgDurationSec: number;
    avgDurationFormatted: string;
  };
  events: Array<{ name: string; count: number }>;
  topPaths: Array<{ path: string; count: number }>;
  topCities: Array<{ city: string; country: string; count: number }>;
  topCountries: Array<{ code: string; count: number }>;
  devices: Array<{ device: string; count: number }>;
  browsers: Array<{ browser: string; count: number }>;
  os: Array<{ os: string; count: number }>;
  products: {
    totalCount: number;
    totalViews: number;
    topViewed: Array<{
      id: string;
      model: string;
      brand: string;
      category: string;
      name: string;
      viewCount: number;
      status: string;
      updatedAt: string;
    }>;
    brandDistribution: Array<{ name: string; count: number }>;
  };
  inquiries: {
    totalCount: number;
    newCount: number;
    processingCount: number;
    closedCount: number;
    conversionRate: number;
    recent: Array<{
      id: string;
      referenceId: string;
      name: string;
      country: string;
      status: string;
      createdAt: string;
    }>;
  };
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0秒";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}秒`;
  return `${m}分${s > 0 ? ` ${s}秒` : ""}`;
}

export async function getCompleteAnalyticsData(): Promise<AnalyticsData> {
  // 1. Fetch main application DB metrics
  const [
    totalProducts,
    productViewsAgg,
    topViewedProducts,
    brandsWithProducts,
    totalInquiries,
    newInquiries,
    processingInquiries,
    closedInquiries,
    recentInquiries,
  ] = await Promise.all([
    db.product.count(),
    db.product.aggregate({ _sum: { viewCount: true } }),
    db.product.findMany({
      take: 8,
      orderBy: { viewCount: "desc" },
      include: {
        brand: true,
        category: {
          include: { translations: { where: { locale: "zh" } } },
        },
        translations: { where: { locale: "zh" } },
      },
    }),
    db.brand.findMany({
      select: {
        name: true,
        _count: { select: { products: true } },
      },
      orderBy: { products: { _count: "desc" } },
      take: 8,
    }),
    db.inquiry.count(),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.inquiry.count({ where: { status: "PROCESSING" } }),
    db.inquiry.count({ where: { status: "CLOSED" } }),
    db.inquiry.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        referenceId: true,
        name: true,
        country: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const totalProductViews = productViewsAgg._sum.viewCount ?? 0;

  // 2. Fetch Umami Traffic Analytics
  let umamiStats = {
    pageviews: 0,
    visitors: 0,
    visits: 0,
    bounces: 0,
    totaltime: 0,
  };
  let paths: Array<{ path: string; count: number }> = [];
  let cities: Array<{ city: string; country: string; count: number }> = [];
  let countries: Array<{ code: string; count: number }> = [];
  let browsers: Array<{ browser: string; count: number }> = [];
  let osList: Array<{ os: string; count: number }> = [];
  let devicesList: Array<{ device: string; count: number }> = [];
  let eventsList: Array<{ name: string; count: number }> = [];

  try {
    const loginRes = await fetch("http://127.0.0.1:3008/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "umami" }),
      signal: AbortSignal.timeout(3000),
    });

    if (loginRes.ok) {
      const { token } = await loginRes.json();
      const websiteId = "b1d58872-d6a6-48c0-bf28-7f8294583e98";
      const startAt = Date.now() - 30 * 24 * 3600 * 1000;
      const endAt = Date.now() + 24 * 3600 * 1000;

      const fetchMetric = async (type: string) => {
        const res = await fetch(
          `http://127.0.0.1:3008/api/websites/${websiteId}/metrics?type=${type}&startAt=${startAt}&endAt=${endAt}&limit=8`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(3000),
          }
        );
        return res.ok ? res.json() : [];
      };

      const statsRes = await fetch(
        `http://127.0.0.1:3008/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(3000),
        }
      );

      if (statsRes.ok) {
        umamiStats = await statsRes.json();
      }

      const [rawPaths, rawCities, rawCountries, rawBrowsers, rawOs, rawDevices, rawEvents] =
        await Promise.all([
          fetchMetric("path"),
          fetchMetric("city"),
          fetchMetric("country"),
          fetchMetric("browser"),
          fetchMetric("os"),
          fetchMetric("device"),
          fetchMetric("event"),
        ]);

      paths = (rawPaths || []).map((item: { x: string; y: number }) => ({
        path: item.x,
        count: item.y,
      }));

      cities = (rawCities || []).map((item: { x: string; y: number; country?: string }) => ({
        city: item.x || "未知",
        country: item.country || "CN",
        count: item.y,
      }));

      countries = (rawCountries || []).map((item: { x: string; y: number }) => ({
        code: item.x || "CN",
        count: item.y,
      }));

      browsers = (rawBrowsers || []).map((item: { x: string; y: number }) => ({
        browser: item.x || "其他",
        count: item.y,
      }));

      osList = (rawOs || []).map((item: { x: string; y: number }) => ({
        os: item.x || "其他",
        count: item.y,
      }));

      devicesList = (rawDevices || []).map((item: { x: string; y: number }) => ({
        device: item.x || "未知",
        count: item.y,
      }));

      eventsList = (rawEvents || []).map((item: { x: string; y: number }) => ({
        name: item.x,
        count: item.y,
      }));
    }
  } catch (e) {
    console.error("Failed to fetch Umami stats for dashboard:", e);
  }

  const bounceRate =
    umamiStats.visits > 0
      ? Math.round((umamiStats.bounces / umamiStats.visits) * 100)
      : 0;

  const avgDurationSec =
    umamiStats.visits > 0
      ? Math.round(umamiStats.totaltime / umamiStats.visits)
      : 0;

  const conversionRate =
    umamiStats.visitors > 0
      ? Number(((totalInquiries / umamiStats.visitors) * 100).toFixed(1))
      : 0;

  return {
    traffic: {
      pageviews: umamiStats.pageviews || totalProductViews,
      visitors: umamiStats.visitors,
      visits: umamiStats.visits,
      bounces: umamiStats.bounces,
      bounceRate,
      avgDurationSec,
      avgDurationFormatted: formatDuration(avgDurationSec),
    },
    events: eventsList,
    topPaths: paths,
    topCities: cities,
    topCountries: countries,
    devices: devicesList,
    browsers: browsers,
    os: osList,
    products: {
      totalCount: totalProducts,
      totalViews: totalProductViews,
      topViewed: topViewedProducts.map((p) => ({
        id: p.id,
        model: p.model,
        brand: p.brand.name,
        category: p.category.translations[0]?.name ?? p.category.key,
        name: p.translations[0]?.name ?? "—",
        viewCount: p.viewCount,
        status: p.status,
        updatedAt: p.updatedAt.toISOString().slice(0, 10),
      })),
      brandDistribution: brandsWithProducts.map((b) => ({
        name: b.name,
        count: b._count.products,
      })),
    },
    inquiries: {
      totalCount: totalInquiries,
      newCount: newInquiries,
      processingCount: processingInquiries,
      closedCount: closedInquiries,
      conversionRate,
      recent: recentInquiries.map((i) => ({
        id: i.id,
        referenceId: i.referenceId,
        name: i.name,
        country: i.country,
        status: i.status,
        createdAt: i.createdAt.toISOString().slice(0, 10),
      })),
    },
  };
}
