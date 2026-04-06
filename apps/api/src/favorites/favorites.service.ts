import { Injectable } from "@nestjs/common";
import { ProductStatus } from "@prisma/client";
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

  /**
   * Misafir tarayıcıda saklanan slug’ları hesap favorilerine aktarır (upsert, çift kayıt yok).
   */
  async importFromSlugs(userId: number, slugs: string[]) {
    const normalized = [
      ...new Set(
        slugs
          .map((s) => (typeof s === "string" ? s.trim().toLowerCase() : ""))
          .filter((s) => s.length > 0),
      ),
    ].slice(0, 50);

    if (normalized.length === 0) {
      return { merged: 0, notFound: 0 };
    }

    const products = await this.prisma.product.findMany({
      where: {
        slug: { in: normalized },
        status: ProductStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (products.length > 0) {
      await this.prisma.favorite.createMany({
        data: products.map((p) => ({ userId, productId: p.id })),
        skipDuplicates: true,
      });
    }

    return {
      merged: products.length,
      notFound: normalized.length - products.length,
    };
  }
}

