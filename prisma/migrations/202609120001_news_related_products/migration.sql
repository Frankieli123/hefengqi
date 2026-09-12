CREATE TABLE "NewsArticleProduct" (
  "articleId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "NewsArticleProduct_pkey" PRIMARY KEY ("articleId", "productId")
);

CREATE UNIQUE INDEX "NewsArticleProduct_articleId_sortOrder_key"
ON "NewsArticleProduct"("articleId", "sortOrder");

CREATE INDEX "NewsArticleProduct_productId_idx"
ON "NewsArticleProduct"("productId");

ALTER TABLE "NewsArticleProduct"
ADD CONSTRAINT "NewsArticleProduct_articleId_fkey"
FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NewsArticleProduct"
ADD CONSTRAINT "NewsArticleProduct_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
