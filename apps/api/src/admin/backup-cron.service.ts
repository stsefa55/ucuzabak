import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { BackupService } from "./backup.service";

/**
 * Otomatik PostgreSQL yedekleri.
 * BACKUP_AUTO_ENABLED=false ile kapatılır.
 * BACKUP_CRON ile ifade (varsayılan: her gün 03:00 sunucu saati).
 */
@Injectable()
export class BackupCronService implements OnModuleInit {
  private readonly logger = new Logger(BackupCronService.name);

  constructor(
    private readonly backup: BackupService,
    private readonly schedulerRegistry: SchedulerRegistry
  ) {}

  onModuleInit(): void {
    if (process.env.BACKUP_AUTO_ENABLED === "false") {
      this.logger.log("Otomatik yedek kapalı (BACKUP_AUTO_ENABLED=false).");
      return;
    }
    const expr = process.env.BACKUP_CRON?.trim() || "0 3 * * *";
    const job = new CronJob(expr, () => {
      void this.runSafe();
    });
    this.schedulerRegistry.addCronJob("db-backup", job);
    job.start();
    this.logger.log(`Otomatik yedek zamanlaması: "${expr}"`);
  }

  private async runSafe(): Promise<void> {
    try {
      const r = await this.backup.createBackup();
      this.logger.log(`Otomatik yedek tamam: ${r.id} (${r.sizeBytes} B)`);
    } catch (e: unknown) {
      this.logger.error(`Otomatik yedek başarısız: ${String(e)}`);
    }
  }
}
