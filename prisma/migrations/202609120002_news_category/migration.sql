CREATE TYPE "NewsCategory" AS ENUM (
  'INDUSTRY_INSIGHTS',
  'BUYING_GUIDE',
  'TUTORIAL_GUIDE'
);

ALTER TABLE "NewsArticle"
ADD COLUMN "category" "NewsCategory" NOT NULL DEFAULT 'INDUSTRY_INSIGHTS';

UPDATE "NewsArticle"
SET "category" = 'BUYING_GUIDE'
WHERE "key" IN (
  '800g-1-6t-optical-transceiver-ai-cluster-guide-2026',
  'urban-edge-data-centers-telecom-cabinets-guide-2026',
  'hvdc-rectifier-guide-2026'
);

UPDATE "NewsArticle"
SET "category" = 'TUTORIAL_GUIDE'
WHERE "key" = 'huawei-r4850g2-pinout-standalone-wiring-guide-2026';

CREATE INDEX "NewsArticle_category_publishedAt_idx"
ON "NewsArticle"("category", "publishedAt");
