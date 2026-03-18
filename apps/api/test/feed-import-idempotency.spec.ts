import { Job } from "bullmq";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../src/prisma/prisma.service";
import { processFeedImportJob } from "../../worker/src/processors/feedImportProcessor";
import { FeedStatus, FeedType } from "@prisma/client";

describe("Feed import idempotency", () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService]
    }).compile();

    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("does not create duplicate offers or storeProducts when run twice", async () => {
    // ensure a test store exists
    const store =
      (await prisma.store.findUnique({ where: { slug: "trendyol" } })) ??
      (await prisma.store.create({
        data: { name: "Trendyol", slug: "trendyol" }
      }));

    const feedImport = await prisma.feedImport.create({
      data: {
        storeId: store.id,
        type: FeedType.XML,
        status: FeedStatus.PENDING,
        sourceRef: "trendyol_sample.xml"
      }
    });

    const job: Job<{ feedImportId: number }> = {
      id: "test-job-1",
      name: "feed-import",
      data: { feedImportId: feedImport.id }
      // the rest of Job properties are not used by processor
    } as any;

    await processFeedImportJob(job);

    const storeProductCountAfterFirst = await prisma.storeProduct.count({
      where: { storeId: store.id }
    });
    const offerCountAfterFirst = await prisma.offer.count({
      where: { storeId: store.id }
    });

    await processFeedImportJob(job);

    const storeProductCountAfterSecond = await prisma.storeProduct.count({
      where: { storeId: store.id }
    });
    const offerCountAfterSecond = await prisma.offer.count({
      where: { storeId: store.id }
    });

    expect(storeProductCountAfterSecond).toBe(storeProductCountAfterFirst);
    expect(offerCountAfterSecond).toBe(offerCountAfterFirst);
  });
});

