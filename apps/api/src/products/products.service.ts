import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { OfferStatus, ProductStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProductListQueryDto, ProductSortField } from "./dto/product-list.query.dto";
import { PriceHistoryQueryDto, PriceHistoryRange } from "./dto/price-history-range.dto";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ProductListQueryDto) {
    const { page = 1, pageSize = 20 } = query;

    const where: Prisma.ProductWhereInput = { status: ProductStatus.ACTIVE };

    if (query.q) {
      where.name = { contains: query.q, mode: "insensitive" };
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

    return {
      items,
      total,
      page,
      pageSize
    };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug, status: ProductStatus.ACTIVE },
      include: {
        brand: true,
        category: true,
        productImages: {
          orderBy: { position: "asc" }
        }
      }
    });
    if (!product) {
      throw new NotFoundException("Ürün bulunamadı.");
    }
    return product;
  }

  async findBySlugs(slugs: string[]): Promise<any[]> {
    if (slugs.length === 0) return [];
    const uniq = [...new Set(slugs)].slice(0, 20);
    const products = await this.prisma.product.findMany({
      where: { slug: { in: uniq }, status: ProductStatus.ACTIVE },
      include: { brand: true, category: true }
    });
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    return uniq.map((slug) => bySlug.get(slug)).filter(Boolean);
  }

  async getOffersBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true }
    });
    if (!product) {
      throw new NotFoundException("Ürün bulunamadı.");
    }

    const offers = await this.prisma.offer.findMany({
      where: { productId: product.id, status: OfferStatus.ACTIVE },
      include: {
        store: true
      },
      orderBy: {
        currentPrice: "asc"
      }
    });

    return offers;
  }

  async getPriceHistoryBySlug(slug: string, query: PriceHistoryQueryDto) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true }
    });
    if (!product) {
      throw new NotFoundException("Ürün bulunamadı.");
    }

    const offers = await this.prisma.offer.findMany({
      where: { productId: product.id },
      select: { id: true }
    });

    if (offers.length === 0) {
      return { range: query.range, points: [] };
    }

    const now = new Date();
    let fromDate: Date | undefined;

    switch (query.range) {
      case PriceHistoryRange.D7:
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case PriceHistoryRange.D30:
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case PriceHistoryRange.D90:
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case PriceHistoryRange.Y1:
        fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case PriceHistoryRange.ALL:
      default:
        fromDate = undefined;
        break;
    }

    const where: Prisma.PriceHistoryWhereInput = {
      offerId: { in: offers.map((o) => o.id) }
    };

    if (fromDate) {
      (where.recordedAt as Prisma.DateTimeFilter | undefined) = {
        gte: fromDate
      };
    }

    const histories = await this.prisma.priceHistory.findMany({
      where,
      orderBy: {
        recordedAt: "asc"
      }
    });

    // Aggregate by day, taking min price of the day
    const byDay = new Map<
      string,
      {
        date: string;
        minPrice: string;
        maxPrice: string;
        avgPrice: string;
        count: number;
      }
    >();

    for (const h of histories) {
      const dayKey = h.recordedAt.toISOString().split("T")[0];
      const priceNumber = Number(h.price);

      const existing = byDay.get(dayKey);
      if (!existing) {
        byDay.set(dayKey, {
          date: dayKey,
          minPrice: h.price.toString(),
          maxPrice: h.price.toString(),
          avgPrice: h.price.toString(),
          count: 1
        });
      } else {
        const currentMin = Number(existing.minPrice);
        const currentMax = Number(existing.maxPrice);
        const currentAvg = Number(existing.avgPrice);

        const newCount = existing.count + 1;
        const newAvg = (currentAvg * existing.count + priceNumber) / newCount;

        existing.minPrice = String(Math.min(currentMin, priceNumber));
        existing.maxPrice = String(Math.max(currentMax, priceNumber));
        existing.avgPrice = newAvg.toFixed(2);
        existing.count = newCount;

        byDay.set(dayKey, existing);
      }
    }

    const points = Array.from(byDay.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return {
      range: query.range,
      points
    };
  }

  async getPopularProducts() {
    const items = await this.prisma.product.findMany({
      where: {
        status: "ACTIVE"
      },
      orderBy: [
        { offerCountCache: "desc" },
        { createdAt: "desc" }
      ],
      take: 60,
      include: {
        brand: true,
        category: true
      }
    });

    return items;
  }

  async getPriceDroppedProducts() {
    // originalPrice > currentPrice olan teklifleri baz al
    const discountedOffers = await this.prisma.offer.findMany({
      where: {
        status: "ACTIVE",
        originalPrice: {
          not: null
        },
        currentPrice: {
          lt: new Prisma.Decimal(0) // placeholder, aşağıda filtrelenecek
        }
      },
      take: 0
    });

    // Prisma Decimal ile doğrudan fark hesabı için raw query yerine basit bir yaklaşım:
    const offers = await this.prisma.offer.findMany({
      where: {
        status: "ACTIVE",
        originalPrice: {
          not: null
        }
      },
      select: {
        id: true,
        productId: true,
        currentPrice: true,
        originalPrice: true
      }
    });

    const byProduct = new Map<
      number,
      {
        productId: number;
        discountAmount: number;
      }
    >();

    for (const o of offers) {
      if (!o.originalPrice) continue;
      const current = Number(o.currentPrice);
      const original = Number(o.originalPrice);
      if (current >= original) continue;
      const discount = original - current;
      const existing = byProduct.get(o.productId);
      if (!existing || discount > existing.discountAmount) {
        byProduct.set(o.productId, { productId: o.productId, discountAmount: discount });
      }
    }

    const sorted = Array.from(byProduct.values())
      .sort((a, b) => b.discountAmount - a.discountAmount)
      .slice(0, 60);

    const productIds = sorted.map((x) => x.productId);

    if (productIds.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: "ACTIVE"
      },
      include: {
        brand: true,
        category: true
      }
    });

    // Aynı sırayı koru
    const productsById = new Map(products.map((p) => [p.id, p]));
    return productIds.map((id) => productsById.get(id)).filter(Boolean);
  }

  async getDealProducts() {
    // İndirim miktarına göre en avantajlı ürünler
    const offers = await this.prisma.offer.findMany({
      where: {
        status: "ACTIVE",
        originalPrice: {
          not: null
        }
      },
      select: {
        id: true,
        productId: true,
        currentPrice: true,
        originalPrice: true
      }
    });

    const byProduct = new Map<
      number,
      {
        productId: number;
        discountAmount: number;
      }
    >();

    for (const o of offers) {
      if (!o.originalPrice) continue;
      const current = Number(o.currentPrice);
      const original = Number(o.originalPrice);
      if (current >= original) continue;
      const discount = original - current;
      const existing = byProduct.get(o.productId);
      if (!existing || discount > existing.discountAmount) {
        byProduct.set(o.productId, { productId: o.productId, discountAmount: discount });
      }
    }

    const sorted = Array.from(byProduct.values())
      .sort((a, b) => b.discountAmount - a.discountAmount)
      .slice(0, 60);

    const productIds = sorted.map((x) => x.productId);

    if (productIds.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: "ACTIVE"
      },
      include: {
        brand: true,
        category: true
      }
    });

    const productsById = new Map(products.map((p) => [p.id, p]));
    return productIds.map((id) => productsById.get(id)).filter(Boolean);
  }

  async getMostClickedProducts(limit = 12) {
    const groups = await this.prisma.affiliateClick.groupBy({
      by: ["productId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit
    });
    const productIds = groups.map((g) => g.productId);
    if (productIds.length === 0) return [];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, status: ProductStatus.ACTIVE },
      include: { brand: true, category: true }
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return productIds.map((id) => byId.get(id)).filter(Boolean);
  }
}

