import { Injectable } from "@nestjs/common";
import { Prisma, ProductStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProductListQueryDto, ProductSortField } from "../products/dto/product-list.query.dto";

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchProducts(query: ProductListQueryDto) {
    const { page = 1, pageSize = 20 } = query;

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE
    };

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { brand: { name: { contains: query.q, mode: "insensitive" } } },
        { category: { name: { contains: query.q, mode: "insensitive" } } }
      ];
    }

    if (query.categorySlug) {
      where.category = { slug: query.categorySlug };
    }

    if (query.brandSlug) {
      where.brand = { slug: query.brandSlug };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.lowestPriceCache = {};
      if (query.minPrice !== undefined) {
        (where.lowestPriceCache as Prisma.DecimalFilter).gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        (where.lowestPriceCache as Prisma.DecimalFilter).lte = query.maxPrice;
      }
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [];

    switch (query.sort) {
      case ProductSortField.POPULAR:
        orderBy.push({ offerCountCache: "desc" }, { createdAt: "desc" });
        break;
      case ProductSortField.LOWEST_PRICE:
        orderBy.push({ lowestPriceCache: "asc" });
        break;
      case ProductSortField.HIGHEST_PRICE:
        orderBy.push({ lowestPriceCache: "desc" });
        break;
      case ProductSortField.PRICE_DROP:
        orderBy.push({ lastPriceUpdatedAt: "desc" }, { createdAt: "desc" });
        break;
      case ProductSortField.NEWEST:
        orderBy.push({ createdAt: "desc" });
        break;
      case ProductSortField.RELEVANCE:
      default:
        orderBy.push({ offerCountCache: "desc" }, { createdAt: "desc" });
        break;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          brand: true,
          category: true
        }
      }),
      this.prisma.product.count({ where })
    ]);

    // Sadece arama metni (q) varsa ve en az 1 ürün bulunduysa kaydet; saçma/eşleşmeyen aramalar popülere girmesin
    if (query.q && total > 0) {
      this.recordSearchQuery(query.q).catch(() => {});
    }

    return {
      items,
      total,
      page,
      pageSize
    };
  }

  private async recordSearchQuery(q?: string) {
    const normalized = q?.trim().toLowerCase();
    if (!normalized || normalized.length < 2) return;
    await this.prisma.searchQueryStat.upsert({
      where: { query: normalized },
      create: { query: normalized, count: 1 },
      update: { count: { increment: 1 } }
    });
  }

  async getPopularQueries(limit = 12, prefix?: string) {
    const take = Math.min(limit, 20);
    const where = prefix?.trim()
      ? { query: { contains: prefix.trim(), mode: "insensitive" as const } }
      : undefined;
    const list = await this.prisma.searchQueryStat.findMany({
      where,
      orderBy: { count: "desc" },
      take,
      select: { query: true }
    });
    return list.map((r) => r.query);
  }

  async suggest(query: string, limit = 10) {
    if (!query || !query.trim()) {
      return [];
    }

    const normalizedLimit = Math.max(1, Math.min(limit, 20));

    const [products, brands, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          name: { contains: query, mode: "insensitive" }
        },
        select: {
          id: true,
          name: true,
          slug: true
        },
        take: normalizedLimit
      }),
      this.prisma.brand.findMany({
        where: {
          name: { contains: query, mode: "insensitive" }
        },
        select: {
          id: true,
          name: true,
          slug: true
        },
        take: normalizedLimit
      }),
      this.prisma.category.findMany({
        where: {
          name: { contains: query, mode: "insensitive" }
        },
        select: {
          id: true,
          name: true,
          slug: true
        },
        take: normalizedLimit
      })
    ]);

    const suggestions: {
      type: "product" | "brand" | "category";
      label: string;
      slug: string;
    }[] = [];

    for (const p of products) {
      suggestions.push({
        type: "product",
        label: p.name,
        slug: p.slug
      });
    }

    for (const b of brands) {
      suggestions.push({
        type: "brand",
        label: b.name,
        slug: b.slug
      });
    }

    for (const c of categories) {
      suggestions.push({
        type: "category",
        label: c.name,
        slug: c.slug
      });
    }

    return suggestions.slice(0, normalizedLimit);
  }
}

