-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductAlarm" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "alarmCode" JSONB NOT NULL,
    "ledStatus" JSONB NOT NULL,
    "cause" JSONB NOT NULL,
    "procedure" JSONB NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MAJOR',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAlarm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductAlarm_productId_sortOrder_idx" ON "ProductAlarm"("productId", "sortOrder");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ProductAlarm_productId_fkey'
    ) THEN
        ALTER TABLE "ProductAlarm"
            ADD CONSTRAINT "ProductAlarm_productId_fkey"
            FOREIGN KEY ("productId") REFERENCES "Product"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
