import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  listByUser(userId: number) {
    return this.prisma.favorite.findMany({
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

  async addFavorite(userId: number, productId: number) {
    return this.prisma.favorite.upsert({
      where: {
        userId_productId: {
          userId,
          productId
        }
      },
      create: { userId, productId },
      update: {}
    });
  }

  async removeFavorite(userId: number, productId: number) {
    await this.prisma.favorite.deleteMany({
      where: {
        userId,
        productId
      }
    });
  }
}

