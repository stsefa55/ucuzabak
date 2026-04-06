-- DropIndex
DROP INDEX "EmailDeliveryLog_createdAt_idx";

-- DropIndex
DROP INDEX "EmailDeliveryLog_status_createdAt_idx";

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_status_createdAt_idx" ON "EmailDeliveryLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_createdAt_idx" ON "EmailDeliveryLog"("createdAt");
