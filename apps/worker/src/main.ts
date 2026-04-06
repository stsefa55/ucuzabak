import "./bootstrap-env";
import { Queue, Worker } from "bullmq";
import { bullmqConnectionProducer, bullmqConnectionSummary, bullmqConnectionWorker } from "@ucuzabak/shared";
import { FeedStatus, FeedType, StoreStatus } from "@prisma/client";
import { parseFeedImportIntervalMs } from "./feedSchedulerInterval";
import { prisma } from "./prisma";

async function startFeedScheduler(queue: Queue) {
  const tickMs = Math.max(
    15_000,
    Number(process.env.FEED_SCHEDULER_TICK_MS || 60_000),
  );
  const defaultStoreIntervalMs = Math.max(
    60_000,
    Number(process.env.FEED_IMPORT_INTERVAL_MS || 60 * 60 * 1000),
  );

  // eslint-disable-next-line no-console
  console.log(
    `Feed scheduler: kontrol aralığı ${Math.round(tickMs / 1000)} sn; mağaza sıklığı DB’deki etiket (varsayılan ${Math.round(defaultStoreIntervalMs / 1000)} sn).`,
  );

  const terminalStatuses: FeedStatus[] = [
    FeedStatus.SUCCESS,
    FeedStatus.FAILED,
    FeedStatus.PARTIAL,
  ];

  const tick = async () => {
    try {
      const activeStores = await prisma.store.findMany({
        where: {
          status: StoreStatus.ACTIVE,
          feedIsActive: true,
          feedUrl: {
            not: null
          }
        }
      });

      if (activeStores.length === 0) {
        return;
      }

      const now = Date.now();

      for (const store of activeStores) {
        // Aynı mağaza için RUNNING durumunda import varsa tekrar başlatma
        const runningImport = await prisma.feedImport.findFirst({
          where: {
            storeId: store.id,
            status: FeedStatus.RUNNING
          }
        });

        if (runningImport) {
          // eslint-disable-next-line no-console
          console.log(
            `[feed-scheduler] Mağaza ${store.slug} için zaten çalışan import var (id=${runningImport.id}).`,
          );
          continue;
        }

        const storeIntervalMs = parseFeedImportIntervalMs(
          store.feedImportIntervalLabel,
          defaultStoreIntervalMs,
        );

        const lastDone = await prisma.feedImport.findFirst({
          where: {
            storeId: store.id,
            status: { in: terminalStatuses },
            finishedAt: { not: null }
          },
          orderBy: { finishedAt: "desc" }
        });

        if (lastDone?.finishedAt) {
          const elapsed = now - lastDone.finishedAt.getTime();
          if (elapsed < storeIntervalMs) {
            continue;
          }
        }

        const feedImport = await prisma.feedImport.create({
          data: {
            storeId: store.id,
            type: FeedType.XML,
            status: FeedStatus.PENDING,
            sourceRef: store.feedUrl!
          }
        });

        await queue.add("feed-import", { feedImportId: feedImport.id });

        // eslint-disable-next-line no-console
        console.log(
          `[feed-scheduler] Mağaza ${store.slug} için planlı import kuyruğa eklendi (feedImportId=${feedImport.id}).`,
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[feed-scheduler] Tick sırasında hata oluştu:", err);
    }
  };

  void tick();
  setInterval(() => {
    void tick();
  }, tickMs);
}

async function bootstrap() {
  const feedConnection = bullmqConnectionProducer();
  const feedWorkerConnection = bullmqConnectionWorker();
  const emailWorkerConnection = bullmqConnectionWorker();

  const feedProcessorModule = await import("./processors/feedImportProcessor");
  const { processFeedImportJob, FEED_IMPORT_PROCESSOR_BUILD } = feedProcessorModule;
  const { processEmailJob } = await import("./email/emailProcessor");

  let feedProcessorResolved = "unknown";
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    feedProcessorResolved = require.resolve("./processors/feedImportProcessor");
  } catch {
    /* ignore */
  }
  // eslint-disable-next-line no-console
  console.log(
    `[worker] feed-import processor: resolvedPath=${feedProcessorResolved} build=${FEED_IMPORT_PROCESSOR_BUILD} (pnpm dev=src ts-node; pnpm start=dist/main.js — resolved mutlaka .../dist/processors/feedImportProcessor.js olmalı)`,
  );

  // eslint-disable-next-line no-console
  console.log(`[worker] BullMQ feed-import producer: ${bullmqConnectionSummary("producer")}`);
  // eslint-disable-next-line no-console
  console.log(`[worker] BullMQ feed-import consumer: ${bullmqConnectionSummary("worker")}`);
  // eslint-disable-next-line no-console
  console.log(`[worker] BullMQ email consumer: ${bullmqConnectionSummary("worker")}`);

  // Feed import worker
  const feedQueue = new Queue("feed-import", { connection: feedConnection });

  new Worker("feed-import", processFeedImportJob, {
    connection: feedWorkerConnection
  });

  const emailConcurrency = Math.max(1, Number(process.env.EMAIL_WORKER_CONCURRENCY || 3));
  const emailWorker = new Worker(
    "email",
    async (job) => {
      // eslint-disable-next-line no-console
      console.log(`[email-worker] job alındı id=${job.id} name=${job.name} queue=email`);
      await processEmailJob(job);
      // eslint-disable-next-line no-console
      console.log(`[email-worker] job bitti id=${job.id} name=${job.name}`);
    },
    {
      connection: emailWorkerConnection,
      concurrency: emailConcurrency
    }
  );

  emailWorker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`[email-worker] BAŞARISIZ id=${job?.id} name=${job?.name}:`, err);
  });
  emailWorker.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("[email-worker] Worker hatası:", err);
  });
  emailWorker.on("stalled", (jobId) => {
    // eslint-disable-next-line no-console
    console.warn(`[email-worker] stalled jobId=${jobId}`);
  });

  // eslint-disable-next-line no-console
  console.log(
    `[worker] Email Worker başlatıldı (concurrency=${emailConcurrency}), kuyruk adı: "email"`,
  );

  await startFeedScheduler(feedQueue);

  // eslint-disable-next-line no-console
  console.log(
    `Worker '${process.env.WORKER_NAME || "ucuzabak-worker"}' — kuyruklar: feed-import, email`,
  );
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Worker bootstrap failed", err);
  process.exit(1);
});

