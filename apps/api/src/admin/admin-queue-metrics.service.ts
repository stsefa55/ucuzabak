import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import { bullmqConnectionProducer } from "@ucuzabak/shared";
import { EmailQueueService } from "../email/email-queue.service";

const FEED_IMPORT_QUEUE = "feed-import";

@Injectable()
export class AdminQueueMetricsService implements OnModuleDestroy {
  private readonly logger = new Logger(AdminQueueMetricsService.name);
  private readonly feedQueue: Queue;

  constructor(private readonly emailQueue: EmailQueueService) {
    const connection = bullmqConnectionProducer();
    this.feedQueue = new Queue(FEED_IMPORT_QUEUE, { connection });
  }

  async onModuleDestroy(): Promise<void> {
    await this.feedQueue.close();
  }

  async getOverview(): Promise<{
    email: Awaited<ReturnType<EmailQueueService["getQueueSnapshot"]>>;
    feedImport: {
      name: string;
      counts: Record<string, number>;
      failedJobs: Array<{
        id: string | undefined;
        name: string | undefined;
        failedReason: string;
        timestamp?: number;
        processedOn?: number | undefined;
      }>;
    };
  }> {
    try {
      const [email, feedCounts, feedFailed] = await Promise.all([
        this.emailQueue.getQueueSnapshot(),
        this.feedQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"),
        this.feedQueue.getJobs(["failed"], 0, 14, true)
      ]);
      return {
        email,
        feedImport: {
          name: FEED_IMPORT_QUEUE,
          counts: feedCounts,
          failedJobs: feedFailed.map((j) => ({
            id: j.id,
            name: j.name,
            failedReason: (j.failedReason as string) ?? "",
            timestamp: j.timestamp,
            processedOn: j.processedOn
          }))
        }
      };
    } catch (e: unknown) {
      this.logger.warn(`Kuyruk metrikleri alınamadı: ${String((e as Error)?.message ?? e)}`);
      throw e;
    }
  }
}
