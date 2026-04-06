import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FeedStatus, FeedType, StoreStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { Queue } from "bullmq";
import * as fs from "fs/promises";
import * as path from "path";
import { bullmqConnectionProducer } from "@ucuzabak/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ManualFeedImportService {
  constructor(private readonly prisma: PrismaService) {}

  /** API ve worker aynı dizini paylaşmalı (Docker’da ortak volume). */
  uploadDir(): string {
    const custom = process.env.FEED_IMPORT_UPLOAD_DIR?.trim();
    if (custom) return custom;
    return path.join(process.cwd(), "data", "feed-imports");
  }

  async savePastedContent(feedType: FeedType, raw: string): Promise<string> {
    const dir = this.uploadDir();
    await fs.mkdir(dir, { recursive: true });
    const ext = feedType === FeedType.XML ? "xml" : feedType === FeedType.CSV ? "csv" : "json";
    const name = `manual-paste-${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    const full = path.join(dir, name);
    await fs.writeFile(full, raw, "utf8");
    return full;
  }

  async enqueueFeedImport(
    storeId: number,
    feedType: FeedType,
    sourceRef: string,
  ): Promise<{ id: number; status: FeedStatus }> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException("Mağaza bulunamadı.");
    }
    if (store.status !== StoreStatus.ACTIVE) {
      throw new BadRequestException("Mağaza aktif değil.");
    }

    const feedImport = await this.prisma.feedImport.create({
      data: {
        storeId,
        type: feedType,
        status: FeedStatus.PENDING,
        sourceRef
      }
    });

    const queue = new Queue("feed-import", {
      connection: bullmqConnectionProducer()
    });
    try {
      await queue.add("feed-import", { feedImportId: feedImport.id });
    } finally {
      await queue.close();
    }

    return { id: feedImport.id, status: feedImport.status };
  }
}
