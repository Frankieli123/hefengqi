-- Let each category choose one existing product whose current primary image is
-- used by the home-page product-series card. The relation is intentionally to
-- the product rather than a media asset so changing the product primary image
-- automatically updates the home page.
ALTER TABLE "Category"
ADD COLUMN "homeFeaturedProductId" TEXT;

CREATE INDEX "Category_homeFeaturedProductId_idx"
ON "Category"("homeFeaturedProductId");

ALTER TABLE "Category"
ADD CONSTRAINT "Category_homeFeaturedProductId_fkey"
FOREIGN KEY ("homeFeaturedProductId") REFERENCES "Product"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
