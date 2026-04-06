-- CreateTable
CREATE TABLE "BackupRestoreLog" (
    "id" SERIAL NOT NULL,
    "targetBackupFile" TEXT NOT NULL,
    "preRestoreSnapshotFile" TEXT,
    "initiatedByUserId" INTEGER,
    "success" BOOLEAN NOT NULL,
    "errorText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupRestoreLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BackupRestoreLog_createdAt_idx" ON "BackupRestoreLog"("createdAt");

-- CreateTable
CREATE TABLE "BulkEmailQuotaDay" (
    "day" DATE NOT NULL,
    "queuedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BulkEmailQuotaDay_pkey" PRIMARY KEY ("day")
);
