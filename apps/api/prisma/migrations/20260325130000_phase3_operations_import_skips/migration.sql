-- CreateEnum
CREATE TYPE "StoreProductReviewFlag" AS ENUM ('NONE', 'FLAGGED', 'REVIEWED', 'IGNORED');

-- AlterTable
ALTER TABLE "StoreProduct" ADD COLUMN "reviewFlag" "StoreProductReviewFlag" NOT NULL DEFAULT 'NONE';
ALTER TABLE "StoreProduct" ADD COLUMN "reviewNotes" TEXT;
ALTER TABLE "StoreProduct" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "StoreProduct" ADD COLUMN "reviewedByUserId" INTEGER;

-- CreateTable
CREATE TABLE "ImportSkippedRow" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "externalId" TEXT,
    "feedSource" TEXT,
    "categoryText" TEXT,
    "normalizedCategoryKey" TEXT,
    "title" TEXT,
    "brand" TEXT,
    "reason" TEXT NOT NULL,
    "categoryResolutionMethod" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportSkippedRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportSkippedRow_storeId_createdAt_idx" ON "ImportSkippedRow"("storeId", "createdAt");
CREATE INDEX "ImportSkippedRow_reason_idx" ON "ImportSkippedRow"("reason");
CREATE INDEX "ImportSkippedRow_feedSource_idx" ON "ImportSkippedRow"("feedSource");

-- AddForeignKey
ALTER TABLE "ImportSkippedRow" ADD CONSTRAINT "ImportSkippedRow_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "StoreProduct_reviewFlag_idx" ON "StoreProduct"("reviewFlag");
