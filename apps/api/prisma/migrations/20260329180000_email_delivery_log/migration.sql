-- E-posta teslim günlüğü (worker yazar, admin okur / yeniden dener)
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('SENT', 'FAILED');

CREATE TABLE "EmailDeliveryLog" (
    "id" SERIAL NOT NULL,
    "jobName" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL,
    "errorText" TEXT,
    "bullJobId" VARCHAR(128),
    "retryPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailDeliveryLog_status_createdAt_idx" ON "EmailDeliveryLog"("status", "createdAt" DESC);
CREATE INDEX "EmailDeliveryLog_createdAt_idx" ON "EmailDeliveryLog"("createdAt" DESC);
CREATE INDEX "EmailDeliveryLog_jobName_idx" ON "EmailDeliveryLog"("jobName");
