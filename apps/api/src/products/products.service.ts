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

    /** Offer id listesi + IN(...) yerine JOIN: çok teklifte daha güvenilir ve hızlı. */
    type PhRow = { price: Prisma.Decimal; recordedAt: Date };
    const histories = await this.prisma.$queryRaw<PhRow[]>(
      fromDate
        ? Prisma.sql`
            SELECT ph.price, ph."recordedAt"
            FROM "PriceHistory" ph
            INNER JOIN "Offer" o ON o.id = ph."offerId"
            WHERE o."productId" = ${product.id}
              AND ph."recordedAt" >= ${fromDate}
            ORDER BY ph."recordedAt" ASC
          `
        : Prisma.sql`
            SELECT ph.price, ph."recordedAt"
            FROM "PriceHistory" ph
            INNER JOIN "Offer" o ON o.id = ph."offerId"
            WHERE o."productId" = ${product.id}
            ORDER BY ph."recordedAt" ASC
          `
    );

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
   * PriceHistory: teklif bazında son kayıt, önceki penceredeki max fiyattan düşükse anlamlı düşüş.
   * Ürün skoru = teklif başına düşüş tutarının ürün içi maksimumu; azalan sıra.
   */
  async getPriceDroppedProducts() {
    type Row = { productId: number; drop_amt: unknown };
    const rows = await this.prisma.$queryRaw<Row[]>`
      WITH latest_per_offer AS (
        SELECT DISTINCT ON (ph."offerId")
          ph."offerId",
          o."productId" AS pid,
          ph.price AS latest_price,
          ph."recordedAt" AS latest_at
        FROM "PriceHistory" ph
        INNER JOIN "Offer" o ON o.id = ph."offerId"
        INNER JOIN "Product" p ON p.id = o."productId"
        WHERE o.status = 'ACTIVE'
          AND p.status = 'ACTIVE'
          AND p.slug <> ''
          AND ph."recordedAt" >= NOW() - (${PRICE_DROP_HISTORY_DAYS}::int * INTERVAL '1 day')
        ORDER BY ph."offerId", ph."recordedAt" DESC
      ),
      prior_max AS (
        SELECT ph."offerId", MAX(ph.price) AS max_price_before
        FROM "PriceHistory" ph
        INNER JOIN latest_per_offer l ON l."offerId" = ph."offerId"
        WHERE ph."recordedAt" < l.latest_at
          AND ph."recordedAt" >= l.latest_at - (${PRICE_DROP_PRIOR_WINDOW_DAYS}::int * INTERVAL '1 day')
        GROUP BY ph."offerId"
      ),
      per_product AS (
        SELECT l.pid AS "productId",
               (pm.max_price_before - l.latest_price) AS drop_amt
        FROM latest_per_offer l
        INNER JOIN prior_max pm ON pm."offerId" = l."offerId"
        WHERE pm.max_price_before > l.latest_price
      )
      SELECT "productId", MAX(drop_amt) AS drop_amt
      FROM per_product
      GROUP BY "productId"
      ORDER BY MAX(drop_amt) DESC
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
   * Liste indirimi: originalPrice > currentPrice; önce indirim oranı, sonra tutar (ACTIVE teklif + vitrin ürünü).
   */
  async getDealProducts() {
    const offers = await this.prisma.offer.findMany({
      where: {
        status: OfferStatus.ACTIVE,
        originalPrice: { not: null }
      },
      select: {
        productId: true,
        currentPrice: true,
        originalPrice: true,
        lastSeenAt: true,
        updatedAt: true
      }
    });

    type Score = { productId: number; pct: number; amount: number };
    const byProduct = new Map<number, Score>();

    for (const o of offers) {
      if (!o.originalPrice) continue;
      const current = Number(o.currentPrice);
      const original = Number(o.originalPrice);
      if (!(original > 0) || current >= original) continue;
      if (
        !canShowStorefrontListDiscountBadge({
          status: OfferStatus.ACTIVE,
          currentPrice: current,
          originalPrice: original,
          lastSeenAt: o.lastSeenAt,
          updatedAt: o.updatedAt
        })
      ) {
        continue;
      }
      const amount = original - current;
      const pct = amount / original;
      const prev = byProduct.get(o.productId);
      if (!prev || pct > prev.pct || (pct === prev.pct && amount > prev.amount)) {
        byProduct.set(o.productId, { productId: o.productId, pct, amount });
      }
    }

    const sorted = Array.from(byProduct.values())
      .sort((a, b) => b.pct - a.pct || b.amount - a.amount)
      .slice(0, 60);

    const productIds = sorted.map((x) => x.productId);
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
      }
    >
  > {
    if (items.length === 0) return [] as Array<
      T & {
        cardOriginalPrice: string | null;
        cardDiscountPercent: number | null;
        cardInStock: boolean | null;
        cardStoreName: string | null;
      }
    >;
    const ids = items.map((i) => i.id);
    const offers = await this.prisma.offer.findMany({
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
    });
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
      if (!b) {
        return {
          ...item,
          cardOriginalPrice: null,
          cardDiscountPercent: null,
          cardInStock: null,
          cardStoreName: null
        };
      }
      const loParsed =
        item.lowestPriceCache != null && item.lowestPriceCache !== ""
          ? Number(String(item.lowestPriceCache))
          : NaN;
      const lo = Number.isFinite(loParsed) ? loParsed : b.current;
      const showOrig =
        b.original != null &&
        b.original > lo &&
        b.original > 0 &&
        canShowStorefrontListDiscountBadge({
          status: OfferStatus.ACTIVE,
          currentPrice: lo,
          originalPrice: b.original,
          lastSeenAt: b.lastSeenAt,
          updatedAt: b.updatedAt
        });
      const pct =
        showOrig && b.original != null ? computeListDiscountPercent(lo, b.original) : null;
      return {
        ...item,
        cardOriginalPrice: showOrig ? String(b.original) : null,
        cardDiscountPercent: pct,
        cardInStock: b.inStock,
        cardStoreName: b.storeName
      };
    });
  }
}

