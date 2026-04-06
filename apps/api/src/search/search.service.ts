import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CacheService } from "../cache/cache.service";
import { CategoriesService } from "../categories/categories.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProductListQueryDto, ProductSortField } from "../products/dto/product-list.query.dto";
import { STOREFRONT_LISTING_PRODUCT_IMAGES } from "../products/storefront-listing-images.args";
import { storefrontProductWhere } from "../products/storefront-product.scope";

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
    private readonly cache: CacheService
  ) {}

  async searchProducts(query: ProductListQueryDto) {
    const t0 = Date.now();
    const { page = 1, pageSize = 20 } = query;
    const { where, earlyEmpty } = await this.buildSearchWhere(query);
    if (earlyEmpty) {
      return { items: [], total: 0, page, pageSize };
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
          brand: { select: { name: true } },
          category: { select: { name: true, slug: true } }
        }
      }),
      this.prisma.product.count({ where })
    ]);

    // Sadece arama metni (q) varsa ve en az 1 ürün bulunduysa kaydet; saçma/eşleşmeyen aramalar popülere girmesin
    if (query.q && total > 0) {
      this.recordSearchQuery(query.q).catch(() => {});
    }

    const enrichedItems = await this.categoriesService.attachCategoryPathToProducts(items);

    const out = {
      items: enrichedItems,
      total,
      page,
      pageSize
    };
    this.logger.log(`[perf] search.products q=${query.q ?? ""} took ${Date.now() - t0}ms`);
    return out;
  }

  private getSelectedCategorySlugs(query: ProductListQueryDto): string[] {
    const fromCsv = (query.categorySlugs ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (fromCsv.length > 0) return Array.from(new Set(fromCsv));
    if (query.categorySlug?.trim()) return [query.categorySlug.trim()];
    return [];
  }

  private getSelectedBrandSlugs(query: ProductListQueryDto): string[] {
    const fromCsv = (query.brandSlugs ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (fromCsv.length > 0) return Array.from(new Set(fromCsv));
    if (query.brandSlug?.trim()) return [query.brandSlug.trim()];
    return [];
  }

  private async buildSearchWhere(
    query: ProductListQueryDto,
    opts?: { excludeCategorySlug?: boolean; excludeBrandFilter?: boolean }
  ): Promise<{ where: Prisma.ProductWhereInput; earlyEmpty: boolean }> {
    const extra: Prisma.ProductWhereInput = {};

    if (query.q) {
      extra.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { brand: { name: { contains: query.q, mode: "insensitive" } } },
        { category: { name: { contains: query.q, mode: "insensitive" } } }
      ];
    }

    if (!opts?.excludeCategorySlug) {
      const selectedSlugs = this.getSelectedCategorySlugs(query);
      if (selectedSlugs.length > 0) {
        const union = new Set<number>();
        const idsBySlug = await Promise.all(
          selectedSlugs.map((slug) => this.categoriesService.getSelfAndDescendantCategoryIdsBySlug(slug))
        );
        for (const ids of idsBySlug) for (const id of ids) union.add(id);
        if (union.size === 0) {
          return { where: storefrontProductWhere({ id: { in: [] } }), earlyEmpty: true };
        }
        extra.categoryId = { in: Array.from(union) };
      }
    }

    if (!opts?.excludeBrandFilter) {
      const brandSlugs = this.getSelectedBrandSlugs(query);
      if (brandSlugs.length > 0) {
        const brands = await this.prisma.brand.findMany({
          where: { slug: { in: brandSlugs } },
          select: { id: true }
        });
        const brandIds = brands.map((b) => b.id);
        if (brandIds.length === 0) {
          return { where: storefrontProductWhere({ id: { in: [] } }), earlyEmpty: true };
        }
        extra.brandId = { in: brandIds };
      }
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

    return { where: storefrontProductWhere(extra), earlyEmpty: false };
  }

  /**
   * Arama sayfası kategori facet'leri: ürün listesi ile aynı filtre seti.
   * Böylece facet sayısı ile liste sonucu her zaman tutarlı kalır.
   */
  async getSearchCategoryFacets(query: ProductListQueryDto) {
    const t0 = Date.now();
    const cacheKey = `search:cat-facets:q:${query.q ?? ""}:cat:${query.categorySlug ?? ""}:cats:${query.categorySlugs ?? ""}:brand:${query.brandSlug ?? ""}:brands:${query.brandSlugs ?? ""}:min:${query.minPrice ?? ""}:max:${query.maxPrice ?? ""}:v2`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) {
      this.logger.log(`[perf] search.category-facets(cache-hit) ${Date.now() - t0}ms`);
      return cached;
    }
    const built = await this.buildSearchWhere(query);
    if (built.earlyEmpty) return [];
    const where = built.where;

    // Ürünleri categoryId ile grupla (filtrelenmiş sonuç kümesi).
    const grouped = await this.prisma.product.groupBy({
      by: ["categoryId"],
      where: { ...where, categoryId: { not: null } },
      _count: { id: true }
    });

    const categoryIds = grouped
      .map((g) => g.categoryId)
      .filter((id): id is number => typeof id === "number");

    if (categoryIds.length === 0) return [];

    // Aktif kategorileri çekip root'a roll-up yap.
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, parentId: true, iconName: true, imageUrl: true, sortOrder: true }
    });
    const byId = new Map(categories.map((c) => [c.id, c]));

    const rootCache = new Map<number, number>(); // categoryId -> rootId
    const getRootId = (id: number): number => {
      const hit = rootCache.get(id);
      if (hit) return hit;
      let cursor = byId.get(id);
      let safety = 0;
      while (cursor && cursor.parentId != null) {
        cursor = byId.get(cursor.parentId);
        safety += 1;
        if (safety > 20) break;
      }
      const rootId = cursor?.id ?? id;
      rootCache.set(id, rootId);
      return rootId;
    };

    const countByRoot = new Map<number, number>();
    for (const g of grouped) {
      if (g.categoryId == null) continue;
      const rootId = getRootId(g.categoryId);
      countByRoot.set(rootId, (countByRoot.get(rootId) ?? 0) + g._count.id);
    }

    const rootRows = categories
      .filter((c) => c.parentId == null)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        iconName: c.iconName,
        imageUrl: c.imageUrl,
        sortOrder: c.sortOrder,
        productCount: countByRoot.get(c.id) ?? 0
      }))
      .filter((c) => c.productCount > 0)
      .sort((a, b) => {
        const sa = a.sortOrder ?? 999999;
        const sb = b.sortOrder ?? 999999;
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name, "tr");
      });

    await this.cache.set(cacheKey, rootRows, 60);
    this.logger.log(`[perf] search.category-facets ${Date.now() - t0}ms`);
    return rootRows;
  }

  /**
   * Arama sayfası marka facet'leri: mevcut q + kategori + fiyat ile eşleşen ürünü olan markalar.
   * Marka filtresi facet hesabına dahil edilmez (kullanıcı diğer markaları seçebilsin).
   */
  async getSearchBrandFacets(query: ProductListQueryDto) {
    const t0 = Date.now();
    const cacheKey = `search:brand-facets:q:${query.q ?? ""}:cat:${query.categorySlug ?? ""}:cats:${query.categorySlugs ?? ""}:min:${query.minPrice ?? ""}:max:${query.maxPrice ?? ""}:v1`;
    const cached = await this.cache.get<
      Array<{ id: number; name: string; slug: string; productCount: number }>
    >(cacheKey);
    if (cached) {
      this.logger.log(`[perf] search.brand-facets(cache-hit) ${Date.now() - t0}ms`);
      return cached;
    }

    const built = await this.buildSearchWhere(query, { excludeBrandFilter: true });
    if (built.earlyEmpty) {
      return [];
    }
    const where = built.where;

    const grouped = await this.prisma.product.groupBy({
      by: ["brandId"],
      where: { ...where, brandId: { not: null } },
      _count: { id: true }
    });

    const brandIds = grouped.map((g) => g.brandId).filter((id): id is number => typeof id === "number");
    if (brandIds.length === 0) {
      await this.cache.set(cacheKey, [], 60);
      return [];
    }

    const brandRows = await this.prisma.brand.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true, slug: true }
    });
    const byId = new Map(brandRows.map((b) => [b.id, b]));

    const rows: Array<{ id: number; name: string; slug: string; productCount: number }> = [];
    for (const g of grouped) {
      if (g.brandId == null) continue;
      const b = byId.get(g.brandId);
      if (!b) continue;
      rows.push({
        id: b.id,
        name: b.name,
        slug: b.slug,
        productCount: g._count.id
      });
    }

    rows.sort((a, b) => {
      if (b.productCount !== a.productCount) return b.productCount - a.productCount;
      return a.name.localeCompare(b.name, "tr");
    });

    const selectedSlugs = this.getSelectedBrandSlugs(query);
    if (selectedSlugs.length > 0) {
      const have = new Set(rows.map((r) => r.slug));
      const missing = selectedSlugs.filter((s) => !have.has(s));
      if (missing.length > 0) {
        const extra = await this.prisma.brand.findMany({
          where: { slug: { in: missing } },
          select: { id: true, name: true, slug: true }
        });
        for (const b of extra) {
          rows.push({ ...b, productCount: 0 });
        }
      }
    }

    await this.cache.set(cacheKey, rows, 60);
    this.logger.log(`[perf] search.brand-facets ${Date.now() - t0}ms`);
    return rows;
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
        where: storefrontProductWhere({
          name: { contains: query, mode: "insensitive" }
        }),
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

