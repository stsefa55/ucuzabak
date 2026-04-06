-- CreateEnum
CREATE TYPE "CategoryMatchScope" AS ENUM ('FULL', 'LAST_SEGMENT');

-- CreateTable
CREATE TABLE "CategoryMappingOverride" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "matchScope" "CategoryMatchScope" NOT NULL DEFAULT 'FULL',
    "normalizedKey" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isManual" BOOLEAN NOT NULL DEFAULT true,
    "rawSourceText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryMappingOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryMappingOverride_source_matchScope_normalizedKey_key" ON "CategoryMappingOverride"("source", "matchScope", "normalizedKey");

-- CreateIndex
CREATE INDEX "CategoryMappingOverride_categoryId_idx" ON "CategoryMappingOverride"("categoryId");

-- AddForeignKey
ALTER TABLE "CategoryMappingOverride" ADD CONSTRAINT "CategoryMappingOverride_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
