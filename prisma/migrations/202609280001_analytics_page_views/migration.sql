CREATE TABLE "AnalyticsPageView" (
    "id" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "ipMasked" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "locale" TEXT,
    "referrer" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsPageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsPageView_createdAt_idx"
    ON "AnalyticsPageView"("createdAt");

CREATE INDEX "AnalyticsPageView_ipHash_createdAt_idx"
    ON "AnalyticsPageView"("ipHash", "createdAt");

CREATE INDEX "AnalyticsPageView_sessionKey_createdAt_idx"
    ON "AnalyticsPageView"("sessionKey", "createdAt");

CREATE INDEX "AnalyticsPageView_visitorHash_createdAt_idx"
    ON "AnalyticsPageView"("visitorHash", "createdAt");
