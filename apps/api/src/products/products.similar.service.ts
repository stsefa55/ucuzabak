import { Injectable } from "@nestjs/common";
import { ProductStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProductsSimilarService {
  constructor(private readonly prisma: PrismaService) {}

  async getSimilarBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true, categoryId: true, brandId: true }
    });
    if (!product) {
      return [];
    }

    const where: {
      id?: { not: number };
      categoryId?: number | null;
      brandId?: number | null;
      status?: ProductStatus;
    } = {
      id: { not: product.id },
      status: ProductStatus.ACTIVE
    };

    if (product.categoryId) {
      where.categoryId = product.categoryId;
    }

    const similar = await this.prisma.product.findMany({
      where,
      take: 8,
      orderBy: {
        offerCountCache: "desc"
      },
      include: {
        brand: true,
        category: true
      }
    });

    return similar;
  }
}

