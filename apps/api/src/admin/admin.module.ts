import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "../auth/auth.module";
import { BannersModule } from "../banners/banners.module";
import { PrismaService } from "../prisma/prisma.service";
import { AdminBackupsController } from "./admin-backups.controller";
import { AdminOperationsController } from "./admin-operations.controller";
import { AdminOperationsService } from "./admin-operations.service";
import { AdminDiagnosticsService } from "./admin-diagnostics.service";
import { AdminQueueMetricsService } from "./admin-queue-metrics.service";
import { AdminBrandsBulkService } from "./admin-brands-bulk.service";
import { AdminController } from "./admin.controller";
import { BackupCronService } from "./backup-cron.service";
import { BackupService } from "./backup.service";
import { ManualFeedImportService } from "./manual-feed-import.service";

@Module({
  imports: [ScheduleModule, AuthModule, BannersModule],
  controllers: [AdminController, AdminOperationsController, AdminBackupsController],
  providers: [
    PrismaService,
    AdminBrandsBulkService,
    AdminOperationsService,
    AdminQueueMetricsService,
    AdminDiagnosticsService,
    ManualFeedImportService,
    BackupService,
    BackupCronService
  ]
})
export class AdminModule {}

