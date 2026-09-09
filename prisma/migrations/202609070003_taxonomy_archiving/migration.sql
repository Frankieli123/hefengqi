ALTER TABLE "Brand" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "AttributeDefinition" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Brand_archivedAt_idx" ON "Brand"("archivedAt");
CREATE INDEX "AttributeDefinition_archivedAt_idx" ON "AttributeDefinition"("archivedAt");
