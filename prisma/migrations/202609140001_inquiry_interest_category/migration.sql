-- Keep existing inquiry history while allowing the simplified contact form.
ALTER TABLE "Inquiry" ALTER COLUMN "company" SET DEFAULT '';

-- Store the category selected by visitors independently of a specific product.
ALTER TABLE "Inquiry" ADD COLUMN "interestedCategoryId" TEXT;
CREATE INDEX "Inquiry_interestedCategoryId_idx" ON "Inquiry"("interestedCategoryId");
ALTER TABLE "Inquiry"
ADD CONSTRAINT "Inquiry_interestedCategoryId_fkey"
FOREIGN KEY ("interestedCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
