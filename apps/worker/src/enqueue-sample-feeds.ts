import { Queue } from "bullmq";
import { FeedStatus, FeedType } from "@prisma/client";
import { prisma } from "./prisma";

async function main() {
  const redisHost = process.env.REDIS_HOST || "localhost";
  const redisPort = Number(process.env.REDIS_PORT || 6379);

  const queue = new Queue("feed-import", {
    connection: { host: redisHost, port: redisPort }
  });

  // Ensure stores exist or create simple ones
  const trendyol =
    (await prisma.store.findUnique({ where: { slug: "trendyol" } })) ??
    (await prisma.store.create({
      data: { name: "Trendyol", slug: "trendyol" }
    }));

  const hepsiburada =
    (await prisma.store.findUnique({ where: { slug: "hepsiburada" } })) ??
    (await prisma.store.create({
      data: { name: "Hepsiburada", slug: "hepsiburada" }
    }));

  const amazon =
    (await prisma.store.findUnique({ where: { slug: "amazon" } })) ??
    (await prisma.store.create({
      data: { name: "Amazon", slug: "amazon" }
    }));

  const imports = await prisma.$transaction([
    prisma.feedImport.create({
      data: {
        storeId: trendyol.id,
        type: FeedType.XML,
        status: FeedStatus.PENDING,
        sourceRef: "trendyol_sample.xml"
      }
    }),
    prisma.feedImport.create({
      data: {
        storeId: hepsiburada.id,
        type: FeedType.CSV,
        status: FeedStatus.PENDING,
        sourceRef: "hepsiburada_sample.csv"
      }
    }),
    prisma.feedImport.create({
      data: {
        storeId: amazon.id,
        type: FeedType.JSON_API,
        status: FeedStatus.PENDING,
        sourceRef: "amazon_sample.json"
      }
    })
  ]);

  for (const fi of imports) {
    await queue.add("feed-import", { feedImportId: fi.id });
  }

  // eslint-disable-next-line no-console
  console.log("Sample feed imports enqueued:", imports.map((fi) => fi.id));

  await queue.close();
  await prisma.$disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to enqueue sample feeds", err);
  process.exit(1);
});

