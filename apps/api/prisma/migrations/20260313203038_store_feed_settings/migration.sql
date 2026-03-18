-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "feedImportIntervalLabel" TEXT,
ADD COLUMN     "feedIsActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;
