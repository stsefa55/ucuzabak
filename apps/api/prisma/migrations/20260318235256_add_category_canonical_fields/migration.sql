-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "iconName" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER;
