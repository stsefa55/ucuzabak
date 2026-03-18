import { Queue, Worker } from "bullmq";
import { FeedStatus, FeedType, StoreStatus } from "@prisma/client";
import { prisma } from "./prisma";

async function startFeedScheduler(queue: Queue) {
  const intervalMs = Number(process.env.FEED_IMPORT_INTERVAL_MS || 60 * 60 * 1000);

  // eslint-disable-next-line no-console
  console.log(
    `Feed scheduler başlatıldı. Aralık: ${Math.round(intervalMs / 1000)} saniye.`,
  );

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

  // İlk tick'i hemen çalıştırıp sonra interval'e bağlayabiliriz
  void tick();
  setInterval(() => {
    void tick();
  }, intervalMs);
}

async function bootstrap() {
  const redisHost = process.env.REDIS_HOST || "localhost";
  const redisPort = Number(process.env.REDIS_PORT || 6379);

  const connection = {
    host: redisHost,
    port: redisPort
  };

  const connectionUrl = `redis://${redisHost}:${redisPort}`;

  const { processFeedImportJob } = await import("./processors/feedImportProcessor");

  // Feed import worker
  const feedQueue = new Queue("feed-import", { connection });

  new Worker("feed-import", processFeedImportJob, {
    connection
  });

  await startFeedScheduler(feedQueue);

  // eslint-disable-next-line no-console
  console.log(
    `Worker '${process.env.WORKER_NAME || "ucuzabak-worker"}' listening on Redis at ${connectionUrl}`,
  );
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Worker bootstrap failed", err);
  process.exit(1);
});

