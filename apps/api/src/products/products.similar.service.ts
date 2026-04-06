import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CategoriesService } from "../categories/categories.service";
import { PrismaService } from "../prisma/prisma.service";
import { STOREFRONT_LISTING_PRODUCT_IMAGES } from "./storefront-listing-images.args";
import { storefrontProductWhere } from "./storefront-product.scope";

@Injectable()
export class ProductsSimilarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService
  ) {}

  async getSimilarBySlug(slug: string) {
    const normalized = (slug ?? "").trim();
    if (!normalized) {
      return [];
    }

    const product = await this.prisma.product.findFirst({
      where: storefrontProductWhere({
        slug: normalized
      }),
      select: { id: true, categoryId: true, brandId: true }
    });
    if (!product) {
      return [];
    }

    const extra: Prisma.ProductWhereInput = {
      id: { not: product.id }
    };

    if (product.categoryId) {
      extra.categoryId = product.categoryId;
    }

    const similar = await this.prisma.product.findMany({
      where: storefrontProductWhere(extra),
      take: 8,
      orderBy: {
        offerCountCache: "desc"
      },
      include: {
        brand: true,
        category: true,
        productImages: STOREFRONT_LISTING_PRODUCT_IMAGES
      }
    });

    return this.categoriesService.attachCategoryPathToProducts(similar);
  }
}
