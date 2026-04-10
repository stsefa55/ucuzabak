import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { OfferStatus } from "@prisma/client";
import { CategoriesService } from "../categories/categories.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProductListQueryDto, ProductSortField } from "./dto/product-list.query.dto";
import { PriceHistoryQueryDto, PriceHistoryRange } from "./dto/price-history-range.dto";
import {
  canShowStorefrontListDiscountBadge,
  computeListDiscountPercent
} from "../common/offer-list-discount";
import { STOREFRONT_LISTING_PRODUCT_IMAGES } from "./storefront-listing-images.args";
import { STOREFRONT_PRODUCT_WHERE, storefrontProductWhere } from "./storefront-product.scope";

/** Affiliate tıklama penceresi (gün) — POPULAR_AFFILIATE_CLICK_WINDOW_DAYS */
function popularAffiliateClickWindowDays(): number {
  const n = Number(process.env.POPULAR_AFFILIATE_CLICK_WINDOW_DAYS ?? "30");
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(365, Math.floor(n));
}

/** PriceHistory geriye bakış (gün) */
const PRICE_DROP_HISTORY_DAYS = 60;
/** Son kayıttan önceki max fiyat için pencere (gün) */
const PRICE_DROP_PRIOR_WINDOW_DAYS = 45;

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService
  ) {}

  async list(query: ProductListQueryDto) {
    const t0 = Date.now();
    const { page = 1, pageSize = 20 } = query;

    const extra: Prisma.ProductWhereInput = {};

    if (query.q) {
      extra.name = { contains: query.q, mode: "insensitive" };
    }

    if (query.categorySlug) {
      const categoryIds = await this.categoriesService.getSelfAndDescendantCategoryIdsBySlug(query.categorySlug);
      if (categoryIds.length === 0) {
        return {
          items: [],
          total: 0,
          page,
          pageSize
        };
      }
      extra.categoryId = { in: categoryIds };
    }

    const brandCsv = query.brandSlugs?.trim();
    const brandList = brandCsv
      ? brandCsv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    if (brandList.length > 0) {
      extra.brand = { slug: { in: brandList } };
    } else if (query.brandSlug) {
      extra.brand = { slug: query.brandSlug };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      extra.lowestPriceCache = {};
      if (query.minPrice !== undefined) {
        (extra.lowestPriceCache as Prisma.DecimalFilter).gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        (extra.lowestPriceCache as Prisma.DecimalFilter).lte = query.maxPrice;
      }
    }

    const where = storefrontProductWhere(extra);

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
        select: {
          id: true,
          name: true,
          slug: true,
          mainImageUrl: true,
          lowestPriceCache: true,
          offerCountCache: true,
          ean: true,
          modelNumber: true,
          specsJson: true,
          categoryId: true,
          productImages: STOREFRONT_LISTING_PRODUCT_IMAGES,
          brand: {
            select: { name: true }
          },
          category: {
            select: { name: true, slug: true }
          }
        }
      }),
      this.prisma.product.count({ where })
    ]);

    const enrichedItems = await this.categoriesService.attachCategoryPathToProducts(items);
    const withHints = await this.attachOfferListingHints(enrichedItems);

    const out = {
      items: withHints,
      total,
      page,
      pageSize
    };
    this.logger.log(`[perf] products.list q=${query.q ?? ""} category=${query.categorySlug ?? ""} took ${Date.now() - t0}ms`);
    return out;
  }

  async findBySlug(slug: string) {
    const normalizedSlug = (slug ?? "").trim();
    if (!normalizedSlug) {
      throw new NotFoundException("Ürün bulunamadı.");
    }

    const product = await this.prisma.product.findFirst({
      where: storefrontProductWhere({
        slug: normalizedSlug
      }),
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
    const [enriched] = await this.categoriesService.attachCategoryPathToProducts([product]);
    return enriched;
  }

  async findBySlugs(slugs: string[]): Promise<any[]> {
    if (slugs.length === 0) return [];
    const uniq = [...new Set(slugs)].slice(0, 20);
    const products = await this.prisma.product.findMany({
      where: storefrontProductWhere({
        slug: { in: uniq }
      }),
      include: {
        brand: true,
        category: true,
        productImages: STOREFRONT_LISTING_PRODUCT_IMAGES
      }
    });
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const ordered = uniq.map((slug) => bySlug.get(slug)).filter(Boolean) as typeof products;
    return this.categoriesService.attachCategoryPathToProducts(ordered);
  }

  async getOffersBySlug(slug: string) {
    const normalizedSlug = (slug ?? "").trim();
    const product = await this.prisma.product.findFirst({
      where: storefrontProductWhere({
        slug: normalizedSlug
      }),
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

    return offers.map((o) => {
      const current = Number(o.currentPrice);
      const orig = o.originalPrice != null ? Number(o.originalPrice) : null;
      const listDiscountPercent =
        orig != null && orig > current && orig > 0 ? computeListDiscountPercent(current, orig) : null;
      const storefrontListDiscountEligible = canShowStorefrontListDiscountBadge({
        status: o.status,
        currentPrice: current,
        originalPrice: orig,
        lastSeenAt: o.lastSeenAt,
        updatedAt: o.updatedAt
      });
      return {
        ...o,
        listDiscountPercent,
        storefrontListDiscountEligible
      };
    });
  }

  async getPriceHistoryBySlug(slug: string, query: PriceHistoryQueryDto) {
    const normalizedSlug = (slug ?? "").trim();
    const product = await this.prisma.product.findFirst({
      where: storefrontProductWhere({
        slug: normalizedSlug
      }),
      select: { id: true }
    });
    if (!product) {
      throw new NotFoundException("Ürün bulunamadı.");
    }

    const range = query.range ?? PriceHistoryRange.D90;

    const now = new Date();
    let fromDate: Date | undefined;

    switch (range) {
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

    type PhRow = { price: Prisma.Decimal; recordedAt: Date };
    const [histories, lowestActiveOffer] = await Promise.all([
      this.prisma.$queryRaw<PhRow[]>(
        fromDate
          ? Prisma.sql`
              SELECT ph.price, ph."recordedAt"
              FROM "PriceHistory" ph
              INNER JOIN "Offer" o ON o.id = ph."offerId"
              WHERE o."productId" = ${product.id}
                AND o.status = 'ACTIVE'
                AND ph."recordedAt" >= ${fromDate}
              ORDER BY ph."recordedAt" ASC
            `
          : Prisma.sql`
              SELECT ph.price, ph."recordedAt"
              FROM "PriceHistory" ph
              INNER JOIN "Offer" o ON o.id = ph."offerId"
              WHERE o."productId" = ${product.id}
                AND o.status = 'ACTIVE'
              ORDER BY ph."recordedAt" ASC
            `
      ),
      this.prisma.offer.findFirst({
        where: { productId: product.id, status: OfferStatus.ACTIVE },
        orderBy: { currentPrice: "asc" },
        select: { currentPrice: true }
      })
    ]);

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

    if (lowestActiveOffer) {
      const livePrice = lowestActiveOffer.currentPrice.toString();
      const todayKey = now.toISOString().split("T")[0];
      const todayIdx = points.findIndex((p) => p.date === todayKey);
      const todayPoint = {
        date: todayKey,
        minPrice: livePrice,
        maxPrice: livePrice,
        avgPrice: livePrice,
        count: 1
      };
      if (todayIdx >= 0) {
        points[todayIdx] = todayPoint;
      } else {
        points.push(todayPoint);
      }
    }

    return {
      range,
      points
    };
  }

  /** Admin işaretli vitrin ürünleri — tıklama / teklif sayısından bağımsız. */
  async getFeaturedProducts() {
    const items = await this.prisma.product.findMany({
      where: {
        AND: [STOREFRONT_PRODUCT_WHERE, { isFeatured: true }]
      },
      orderBy: [{ featuredSortOrder: "asc" }, { id: "asc" }],
      take: 60,
      include: {
        brand: true,
        category: true,
        productImages: STOREFRONT_LISTING_PRODUCT_IMAGES
      }
    });
    const withPath = await this.categoriesService.attachCategoryPathToProducts(items);
    return this.attachOfferListingHints(withPath);
  }

  /** Affiliate yönlendirme tıklamalarına göre popülerlik (son N gün). */
  async getPopularProducts() {
    const days = popularAffiliateClickWindowDays();
    const since = new Date(Date.now() - days * 86_400_000);
    const groups = await this.prisma.affiliateClick.groupBy({
      by: ["productId"],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 60
    });
    const productIds = groups.map((g) => g.productId);
    if (productIds.length === 0) {
      return [];
    }
    const products = await this.prisma.product.findMany({
      where: storefrontProductWhere({
        id: { in: productIds }
      }),
      include: {
        brand: true,
        category: true,
        productImages: STOREFRONT_LISTING_PRODUCT_IMAGES
      }
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const ordered = productIds.map((id) => byId.get(id)).filter(Boolean) as typeof products;
    const withPath = await this.categoriesService.attachCategoryPathToProducts(ordered);
    return this.attachOfferListingHints(withPath);
  }

  /**
   * Offer.currentPrice ile PriceHistory'deki önceki penceredeki max fiyatı karşılaştırır.
   * Canlı fiyat kullanıldığı için fiyatı geri yükselen ürünler hariç tutulur.
   * Minimum %3 düşüş eşiği uygulanır; yüzdeye göre sıralanır.
   */
  async getPriceDroppedProducts() {
    type Row = { productId: number; drop_pct: unknown };
    const rows = await this.prisma.$queryRaw<Row[]>`
      WITH active_offers AS (
        SELECT o.id AS offer_id,
               o."productId" AS pid,
               o."currentPrice" AS live_price
        FROM "Offer" o
        INNER JOIN "Product" p ON p.id = o."productId"
        WHERE o.status = 'ACTIVE'
          AND o."currentPrice" IS NOT NULL
          AND o."currentPrice" > 0
          AND p.status = 'ACTIVE'
          AND p.slug <> ''
      ),
      prior_max AS (
        SELECT ph."offerId",
               MAX(ph.price) AS max_price_before
        FROM "PriceHistory" ph
        INNER JOIN active_offers ao ON ao.offer_id = ph."offerId"
        WHERE ph."recordedAt" >= NOW() - (${PRICE_DROP_PRIOR_WINDOW_DAYS}::int * INTERVAL '1 day')
          AND ph.price > ao.live_price
        GROUP BY ph."offerId"
      ),
      per_product AS (
        SELECT ao.pid AS "productId",
               (pm.max_price_before - ao.live_price) AS drop_amt,
               ((pm.max_price_before - ao.live_price) / pm.max_price_before * 100) AS drop_pct
        FROM active_offers ao
        INNER JOIN prior_max pm ON pm."offerId" = ao.offer_id
      )
      SELECT "productId", MAX(drop_pct) AS drop_pct
      FROM per_product
      WHERE drop_pct >= 3
      GROUP BY "productId"
      ORDER BY MAX(drop_pct) DESC
      LIMIT 60
    `;

    const productIds = rows.map((r) => r.productId).filter((id) => Number.isInteger(id));
    if (productIds.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: storefrontProductWhere({
        id: { in: productIds }
      }),
      include: {
        brand: true,
        category: true,
        productImages: STOREFRONT_LISTING_PRODUCT_IMAGES
      }
    });
    const productsById = new Map(products.map((p) => [p.id, p]));
    const ordered = productIds.map((id) => productsById.get(id)).filter(Boolean) as typeof products;
    const withPath = await this.categoriesService.attachCategoryPathToProducts(ordered);
    return this.attachOfferListingHints(withPath);
  }

  /**
   * Fırsat ürünleri: son 21 gün içindeki PriceHistory max ile canlı fiyat karşılaştırması.
   * Minimum %5 düşüş eşiği; yüzdeye göre sıralı.
   */
  async getDealProducts() {
    const DEAL_WINDOW_DAYS = 21;

    type Row = { productId: number; deal_pct: unknown };
    const rows = await this.prisma.$queryRaw<Row[]>`
      WITH active_offers AS (
        SELECT o.id AS offer_id,
               o."productId" AS pid,
               o."currentPrice" AS live_price
        FROM "Offer" o
        INNER JOIN "Product" p ON p.id = o."productId"
        WHERE o.status = 'ACTIVE'
          AND o."currentPrice" IS NOT NULL
          AND o."currentPrice" > 0
          AND p.status = 'ACTIVE'
          AND p.slug <> ''
      ),
      recent_max AS (
        SELECT ph."offerId",
               MAX(ph.price) AS max_price
        FROM "PriceHistory" ph
        INNER JOIN active_offers ao ON ao.offer_id = ph."offerId"
        WHERE ph."recordedAt" >= NOW() - (${DEAL_WINDOW_DAYS}::int * INTERVAL '1 day')
          AND ph.price > ao.live_price
        GROUP BY ph."offerId"
      ),
      per_product AS (
        SELECT ao.pid AS "productId",
               ((rm.max_price - ao.live_price) / rm.max_price * 100) AS deal_pct
        FROM active_offers ao
        INNER JOIN recent_max rm ON rm."offerId" = ao.offer_id
      )
      SELECT "productId", MAX(deal_pct) AS deal_pct
      FROM per_product
      WHERE deal_pct >= 5
      GROUP BY "productId"
      ORDER BY MAX(deal_pct) DESC
      LIMIT 60
    `;

    const productIds = rows.map((r) => r.productId).filter((id) => Number.isInteger(id));
    if (productIds.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: storefrontProductWhere({
        id: { in: productIds }
      }),
      include: {
        brand: true,
        category: true,
        productImages: STOREFRONT_LISTING_PRODUCT_IMAGES
      }
    });
    const productsById = new Map(products.map((p) => [p.id, p]));
    const ordered = productIds.map((id) => productsById.get(id)).filter(Boolean) as typeof products;
    const withPath = await this.categoriesService.attachCategoryPathToProducts(ordered);
    return this.attachOfferListingHints(withPath);
  }

  /** En düşük fiyatlı ACTIVE tekliften kart ipuçları (orijinal fiyat, indirim %, stok, mağaza adı). */
  private async attachOfferListingHints<T extends { id: number; lowestPriceCache?: unknown }>(
    items: T[]
  ): Promise<
    Array<
      T & {
        cardOriginalPrice: string | null;
        cardDiscountPercent: number | null;
        cardInStock: boolean | null;
        cardStoreName: string | null;
        /** Ürün satırındaki lowestPriceCache boş/stale olsa bile vitrin fiyatı (canlı en ucuz teklif). */
        cardListingCurrentPrice: string | null;
        /** ACTIVE teklif sayısı (offerCountCache ile çelişince liste doğru gösterilsin). */
        cardActiveOfferCount: number;
      }
    >
  > {
    if (items.length === 0) return [] as Array<
      T & {
        cardOriginalPrice: string | null;
        cardDiscountPercent: number | null;
        cardInStock: boolean | null;
        cardStoreName: string | null;
        cardListingCurrentPrice: string | null;
        cardActiveOfferCount: number;
      }
    >;
    const ids = items.map((i) => i.id);
    const [offers, offerCounts] = await Promise.all([
      this.prisma.offer.findMany({
        where: { productId: { in: ids }, status: OfferStatus.ACTIVE },
        select: {
          productId: true,
          currentPrice: true,
          originalPrice: true,
          inStock: true,
          lastSeenAt: true,
          updatedAt: true,
          store: { select: { name: true } }
        }
      }),
      this.prisma.offer.groupBy({
        by: ["productId"],
        where: { productId: { in: ids }, status: OfferStatus.ACTIVE },
        _count: { _all: true }
      })
    ]);
    const countByProduct = new Map<number, number>(
      offerCounts.map((r) => [r.productId, r._count._all])
    );
    const best = new Map<
      number,
      {
        current: number;
        original: number | null;
        inStock: boolean;
        storeName: string;
        lastSeenAt: Date | null;
        updatedAt: Date;
      }
    >();
    for (const o of offers) {
      const cur = Number(o.currentPrice);
      const orig = o.originalPrice != null ? Number(o.originalPrice) : null;
      const ex = best.get(o.productId);
      if (!ex || cur < ex.current) {
        best.set(o.productId, {
          current: cur,
          original: orig,
          inStock: o.inStock,
          storeName: o.store.name,
          lastSeenAt: o.lastSeenAt,
          updatedAt: o.updatedAt
        });
      }
    }
    return items.map((item) => {
      const b = best.get(item.id);
      const activeCount = countByProduct.get(item.id) ?? 0;
      if (!b) {
        return {
          ...item,
          cardOriginalPrice: null,
          cardDiscountPercent: null,
          cardInStock: null,
          cardStoreName: null,
          cardListingCurrentPrice: null,
          cardActiveOfferCount: activeCount
        };
      }
      return {
        ...item,
        cardOriginalPrice: null,
        cardDiscountPercent: null,
        cardInStock: b.inStock,
        cardStoreName: b.storeName,
        cardListingCurrentPrice: String(b.current),
        cardActiveOfferCount: activeCount
      };
    });
  }
}

