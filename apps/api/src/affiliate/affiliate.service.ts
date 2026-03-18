import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface LogClickParams {
  offerId: number;
  productId: number;
  storeId: number;
  userId?: number | null;
  ipHash: string;
  userAgent?: string | null;
  referer?: string | null;
}

@Injectable()
export class AffiliateService {
  constructor(private readonly prisma: PrismaService) {}

  async logClick(params: LogClickParams) {
    const { offerId, productId, storeId, userId, ipHash, userAgent, referer } = params;

    await this.prisma.affiliateClick.create({
      data: {
        offerId,
        productId,
        storeId,
        userId: userId ?? null,
        ipHash,
        userAgent: userAgent ?? null,
        referer: referer ?? null
      }
    });
  }
}

