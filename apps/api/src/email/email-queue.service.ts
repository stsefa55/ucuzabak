import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { JobsOptions, Queue } from "bullmq";
import {
  bullmqConnectionProducer,
  bullmqConnectionSummary,
  BulkEmailBatchJobData,
  EMAIL_QUEUE_NAME,
  PriceAlertEmailJobData,
  ResetPasswordEmailJobData,
  TestEmailJobData,
  VerifyEmailJobData,
  WelcomeEmailJobData
} from "@ucuzabak/shared";

const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 3000 },
  removeOnComplete: { count: 2000 },
  removeOnFail: { count: 500 }
};

@Injectable()
export class EmailQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);
  private readonly queue: Queue;

  constructor() {
    const connection = bullmqConnectionProducer();
    this.logger.log(
      `BullMQ e-posta kuyruğu bağlantısı (${bullmqConnectionSummary("producer")}), kuyruk="${EMAIL_QUEUE_NAME}"`,
    );
    this.queue = new Queue(EMAIL_QUEUE_NAME, {
      connection,
      defaultJobOptions
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }

  private async addNamedJob(name: string, data: object): Promise<void> {
    const job = await this.queue.add(name, data);
    this.logger.log(
      `E-posta işi kuyruğa eklendi: queue=${EMAIL_QUEUE_NAME} name=${name} jobId=${job.id ?? "?"}`,
    );
  }

  async enqueueWelcome(data: WelcomeEmailJobData): Promise<void> {
    await this.addNamedJob("welcome_email", data);
  }

  async enqueueResetPassword(data: ResetPasswordEmailJobData): Promise<void> {
    await this.addNamedJob("reset_password", data);
  }

  async enqueueVerifyEmail(data: VerifyEmailJobData): Promise<void> {
    await this.addNamedJob("verify_email", data);
  }

  async enqueuePriceAlert(data: PriceAlertEmailJobData): Promise<void> {
    await this.addNamedJob("price_alert", data);
  }

  async enqueueTestEmail(data: TestEmailJobData): Promise<void> {
    await this.addNamedJob("test_email", data);
  }

  async enqueueBulkEmailBatch(data: BulkEmailBatchJobData): Promise<void> {
    await this.addNamedJob("bulk_email_batch", data);
  }

  /** Admin gözlemi: kuyruk sayıları ve son başarısız işler (işlem yapmaz). */
  async getQueueSnapshot(): Promise<{
    name: string;
    counts: Record<string, number>;
    failedJobs: Array<{
      id: string | undefined;
      name: string | undefined;
      failedReason: string;
      timestamp?: number;
      processedOn?: number | undefined;
    }>;
  }> {
    const counts = await this.queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
      "paused",
    );
    const failed = await this.queue.getJobs(["failed"], 0, 14, true);
    return {
      name: EMAIL_QUEUE_NAME,
      counts,
      failedJobs: failed.map((j) => ({
        id: j.id,
        name: j.name,
        failedReason: (j.failedReason as string) ?? "",
        timestamp: j.timestamp,
        processedOn: j.processedOn
      }))
    };
  }

  /** Kayıt / kritik yol dışı: hata loglanır, istek başarısız olmaz. */
  safeEnqueueWelcome(data: WelcomeEmailJobData): void {
    void this.enqueueWelcome(data).catch((err: unknown) => {
      this.logger.error(
        `Hoş geldin e-postası kuyruğa alınamadı: ${String(err)}${err instanceof Error ? ` | ${err.stack}` : ""}`,
      );
    });
  }

  safeEnqueueVerifyEmail(data: VerifyEmailJobData): void {
    void this.enqueueVerifyEmail(data).catch((err: unknown) => {
      this.logger.error(
        `E-posta doğrulama işi kuyruğa alınamadı: ${String(err)}${err instanceof Error ? ` | ${err.stack}` : ""}`,
      );
    });
  }
}
