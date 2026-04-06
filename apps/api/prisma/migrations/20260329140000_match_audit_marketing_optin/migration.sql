-- CreateEnum
CREATE TYPE "StoreProductMatchAuditAction" AS ENUM ('MANUAL_ASSIGN_PRODUCT', 'CREATE_CANONICAL_PRODUCT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "marketingEmailOptIn" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "marketingEmailOptOutAt" TIMESTAMP(3);

CREATE INDEX "User_marketingEmailOptIn_status_idx" ON "User"("marketingEmailOptIn", "status");

-- CreateTable
CREATE TABLE "StoreProductMatchAuditLog" (
    "id" SERIAL NOT NULL,
    "action" "StoreProductMatchAuditAction" NOT NULL,
    "storeProductId" INTEGER NOT NULL,
    "actorUserId" INTEGER NOT NULL,
    "previousProductId" INTEGER,
    "newProductId" INTEGER,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreProductMatchAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StoreProductMatchAuditLog_storeProductId_createdAt_idx" ON "StoreProductMatchAuditLog"("storeProductId", "createdAt");
CREATE INDEX "StoreProductMatchAuditLog_actorUserId_createdAt_idx" ON "StoreProductMatchAuditLog"("actorUserId", "createdAt");
CREATE INDEX "StoreProductMatchAuditLog_createdAt_idx" ON "StoreProductMatchAuditLog"("createdAt");

ALTER TABLE "StoreProductMatchAuditLog" ADD CONSTRAINT "StoreProductMatchAuditLog_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "StoreProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StoreProductMatchAuditLog" ADD CONSTRAINT "StoreProductMatchAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
