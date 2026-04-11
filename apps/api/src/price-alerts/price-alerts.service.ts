import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePriceAlertDto } from "./dto/create-price-alert.dto";
import { UpdatePriceAlertDto } from "./dto/update-price-alert.dto";

@Injectable()
export class PriceAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  listByUser(userId: number) {
    return this.prisma.priceAlert.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            brand: true,
            category: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(userId: number, dto: CreatePriceAlertDto) {
    await this.assertTargetBelowProductLowest(dto.productId, dto.targetPrice);
    return this.prisma.priceAlert.create({
      data: {
        userId,
        productId: dto.productId,
        targetPrice: dto.targetPrice
      }
    });
  }

  async update(userId: number, id: number, dto: UpdatePriceAlertDto) {
    const existing = await this.prisma.priceAlert.findFirst({
      where: { id, userId }
    });
    if (!existing) {
      throw new NotFoundException("Fiyat alarmı bulunamadı.");
    }
    if (dto.targetPrice !== undefined) {
      await this.assertTargetBelowProductLowest(existing.productId, dto.targetPrice);
    }
    const data: Prisma.PriceAlertUpdateInput = {};
    if (dto.targetPrice !== undefined) {
      data.targetPrice = dto.targetPrice;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    return this.prisma.priceAlert.update({
      where: { id },
      data
    });
  }

  /**
   * Hedef, önbellekteki güncel en düşük fiyattan düşük olmalı; aksi halde anlamsız veya anında tetiklenir.
   */
  private async assertTargetBelowProductLowest(productId: number, targetPrice: number): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { lowestPriceCache: true }
    });
    if (!product) {
      throw new NotFoundException("Ürün bulunamadı.");
    }
    if (product.lowestPriceCache == null || product.lowestPriceCache.lte(0)) {
      throw new BadRequestException(
        "Bu ürün için güncel en düşük fiyat bilgisi yok; alarm kurulamıyor."
      );
    }
    const target = new Prisma.Decimal(targetPrice);
    if (target.gte(product.lowestPriceCache)) {
      throw new BadRequestException(
        "Hedef fiyat, güncel en düşük fiyatın altında olmalıdır."
      );
    }
  }

  async delete(userId: number, id: number) {
    const existing = await this.prisma.priceAlert.findFirst({
      where: { id, userId }
    });
    if (!existing) {
      throw new NotFoundException("Fiyat alarmı bulunamadı.");
    }
    await this.prisma.priceAlert.delete({
      where: { id }
    });
  }
}

