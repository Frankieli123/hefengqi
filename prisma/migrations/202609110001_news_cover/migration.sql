ALTER TABLE "NewsArticle" ADD COLUMN "coverImageId" TEXT;
ALTER TABLE "NewsArticleTranslation" ADD COLUMN "imageAlt" TEXT NOT NULL DEFAULT '';
CREATE INDEX "NewsArticle_coverImageId_idx" ON "NewsArticle"("coverImageId");
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
