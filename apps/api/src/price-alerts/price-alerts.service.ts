import { Injectable, NotFoundException } from "@nestjs/common";
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

  create(userId: number, dto: CreatePriceAlertDto) {
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
    return this.prisma.priceAlert.update({
      where: { id },
      data: dto
    });
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

