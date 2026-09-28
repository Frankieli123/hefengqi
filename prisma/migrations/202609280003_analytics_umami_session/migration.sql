ALTER TABLE "AnalyticsPageView"
    ADD COLUMN "umamiSessionId" TEXT;

CREATE INDEX "AnalyticsPageView_umamiSessionId_createdAt_idx"
    ON "AnalyticsPageView"("umamiSessionId", "createdAt");
