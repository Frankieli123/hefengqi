-- CreateTable
CREATE TABLE "HomeHeroSlide" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "desktopAssetId" TEXT,
    "mobileAssetId" TEXT,
    "desktopFocusX" INTEGER NOT NULL DEFAULT 72,
    "desktopFocusY" INTEGER NOT NULL DEFAULT 50,
    "mobileFocusX" INTEGER NOT NULL DEFAULT 50,
    "mobileFocusY" INTEGER NOT NULL DEFAULT 70,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeHeroSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeHeroSlideTranslation" (
    "id" TEXT NOT NULL,
    "slideId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "eyebrow" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "primaryLabel" TEXT NOT NULL,
    "primaryHref" TEXT NOT NULL,
    "secondaryLabel" TEXT,
    "secondaryHref" TEXT,
    "imageAlt" TEXT NOT NULL,

    CONSTRAINT "HomeHeroSlideTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeHeroSlide_key_key" ON "HomeHeroSlide"("key");

-- CreateIndex
CREATE INDEX "HomeHeroSlide_enabled_sortOrder_idx" ON "HomeHeroSlide"("enabled", "sortOrder");

-- CreateIndex
CREATE INDEX "HomeHeroSlide_desktopAssetId_idx" ON "HomeHeroSlide"("desktopAssetId");

-- CreateIndex
CREATE INDEX "HomeHeroSlide_mobileAssetId_idx" ON "HomeHeroSlide"("mobileAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeHeroSlideTranslation_slideId_locale_key" ON "HomeHeroSlideTranslation"("slideId", "locale");

-- CreateIndex
CREATE INDEX "HomeHeroSlideTranslation_locale_idx" ON "HomeHeroSlideTranslation"("locale");

-- AddForeignKey
ALTER TABLE "HomeHeroSlide" ADD CONSTRAINT "HomeHeroSlide_desktopAssetId_fkey" FOREIGN KEY ("desktopAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeHeroSlide" ADD CONSTRAINT "HomeHeroSlide_mobileAssetId_fkey" FOREIGN KEY ("mobileAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeHeroSlideTranslation" ADD CONSTRAINT "HomeHeroSlideTranslation_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "HomeHeroSlide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
