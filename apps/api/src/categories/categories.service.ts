import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, ProductStatus } from "@prisma/client";
import { CacheService } from "../cache/cache.service";
import { PrismaService } from "../prisma/prisma.service";

export type CategoryNavigationFilters = {
  brandSlug?: string;
  /** Çoklu marka (CSV), ürün listesi / arama ile aynı */
  brandSlugs?: string;
  minPrice?: number;
  maxPrice?: number;
};

function parseBrandSlugsCsv(csv?: string): string[] {
  return String(csv ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function applyBrandFilterToWhere(
  where: Prisma.ProductWhereInput,
  f?: Pick<CategoryNavigationFilters, "brandSlug" | "brandSlugs">
) {
  const list = parseBrandSlugsCsv(f?.brandSlugs);
  if (list.length > 0) {
    where.brand = { slug: { in: list } };
  } else if (f?.brandSlug?.trim()) {
    where.brand = { slug: f.brandSlug.trim() };
  }
}

type CanonicalCategoryRow = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  iconName: string | null;
  imageUrl: string | null;
  sortOrder: number | null;
  isActive: boolean;
};

type CompactCategoryNode = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
};

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService
  ) {}

  private logTiming(scope: string, startedAt: number) {
    const elapsedMs = Date.now() - startedAt;
    this.logger.log(`[perf] ${scope} took ${elapsedMs}ms`);
  }

  private async getActiveCategoryNodes(): Promise<CompactCategoryNode[]> {
    return this.cache.getOrSet("cat:active:nodes:v1", 120, async () => {
      return this.prisma.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, parentId: true }
      });
    });
  }

  private async getDescendantIdsByRootIdCached(rootId: number): Promise<number[]> {
    return this.cache.getOrSet(`cat:desc:${rootId}:v1`, 300, async () => {
      const nodes = await this.getActiveCategoryNodes();
      const childrenByParent = new Map<number, number[]>();
      for (const n of nodes) {
        if (n.parentId == null) continue;
        const arr = childrenByParent.get(n.parentId) ?? [];
        arr.push(n.id);
        childrenByParent.set(n.parentId, arr);
      }
      const ids: number[] = [rootId];
      const queue: number[] = [rootId];
      let cursor = 0;
      while (cursor < queue.length) {
        const cur = queue[cursor++];
        const children = childrenByParent.get(cur) ?? [];
        for (const id of children) {
          ids.push(id);
          queue.push(id);
        }
      }
      return ids;
    });
  }

  /** Kök kategoriler — canonical alanlar için parametresiz Prisma.sql (şema/DB uyumlu). */
  async listTree() {
    const rows = await this.prisma.$queryRaw<CanonicalCategoryRow[]>(
      Prisma.sql`
      SELECT
        id,
        name,
        slug,
        "parentId",
        "iconName",
        "imageUrl",
        "sortOrder",
        "isActive"
      FROM "Category"
      WHERE "parentId" IS NULL
        AND "isActive" = true
      ORDER BY
        "sortOrder" ASC NULLS LAST,
        "position" ASC,
        "name" ASC
    `
    );
    if (process.env.NODE_ENV !== "production") {
      this.logger.debug(`GET /categories: ${rows.length} root category row(s)`);
    }
    return rows;
  }

  /** Kategori listesi + her kategorideki aktif ürün sayısı (sadece üst kategoriler) */
  async listWithProductCount() {
    const canonical = await this.prisma.$queryRaw<CanonicalCategoryRow[]>(
      Prisma.sql`
      SELECT
        id,
        name,
        slug,
        "parentId",
        "iconName",
        "imageUrl",
        "sortOrder",
        "isActive"
      FROM "Category"
      WHERE "parentId" IS NULL
        AND "isActive" = true
      ORDER BY
        "sortOrder" ASC NULLS LAST,
        "position" ASC,
        "name" ASC
    `
    );

    const countRows = await this.prisma.product.groupBy({
      by: ["categoryId"],
      _count: { id: true },
      where: { status: ProductStatus.ACTIVE, categoryId: { not: null } }
    });

    const countByCategoryId = Object.fromEntries(countRows.map((r) => [r.categoryId, r._count.id]));

    return canonical.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      iconName: c.iconName,
      imageUrl: c.imageUrl,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      productCount: countByCategoryId[c.id] ?? 0
    }));

    /*
    const [categories, countRows] = await Promise.all([
      this.prisma.product.groupBy({
        by: ["categoryId"],
        _count: { id: true },
        where: { status: ProductStatus.ACTIVE, categoryId: { not: null } }
      })
    ]);

    const countByCategoryId = Object.fromEntries(countRows.map((r) => [r.categoryId, r._count.id]));
    return canonical.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      iconName: c.iconName,
      imageUrl: c.imageUrl,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      productCount: countByCategoryId[c.id] ?? 0
    }));
    */
  }

  async findBySlug(slug: string) {
    const rows = await this.prisma.$queryRaw<CanonicalCategoryRow[]>(
      Prisma.sql`
        SELECT
          id,
          name,
          slug,
          "parentId",
          "iconName",
          "imageUrl",
          "sortOrder",
          "isActive"
        FROM "Category"
        WHERE "slug" = ${slug}
          AND "isActive" = true
        LIMIT 1;
      `
    );

    const category = rows[0];
    if (!category) throw new NotFoundException("Kategori bulunamadı.");
    return category;
  }

  async listChildrenByParentSlug(parentSlug: string) {
    const parentRows = await this.prisma.$queryRaw<Pick<CanonicalCategoryRow, "id">[]>(
      Prisma.sql`
        SELECT id
        FROM "Category"
        WHERE slug = ${parentSlug}
          AND "isActive" = true
        LIMIT 1;
      `
    );

    const parentId = parentRows[0]?.id;
    if (!parentId) throw new NotFoundException("Kategori bulunamadı.");

    const rows = await this.prisma.$queryRaw<CanonicalCategoryRow[]>(
      Prisma.sql`
        SELECT
          id,
          name,
          slug,
          "parentId",
          "iconName",
          "imageUrl",
          "sortOrder",
          "isActive"
        FROM "Category"
        WHERE "parentId" = ${parentId}
          AND "isActive" = true
        ORDER BY
          "sortOrder" ASC NULLS LAST,
          "position" ASC,
          "name" ASC;
      `
    );
    if (rows.length === 0) return rows;
    const ids = rows.map((r) => r.id);
    const groups = await this.prisma.category.groupBy({
      by: ["parentId"],
      where: { parentId: { in: ids }, isActive: true },
      _count: { _all: true }
    });
    const hasChild = new Map(groups.map((g) => [g.parentId as number, true]));
    return rows.map((r) => ({ ...r, hasChildren: hasChild.has(r.id) })) as Array<
      CanonicalCategoryRow & { hasChildren: boolean }
    >;
  }

  /**
   * Yaprak (leaf) slug için kökten yaprağa tam yol — hiyerarşik URL ve breadcrumb için.
   */
  async getPathByLeafSlug(leafSlug: string): Promise<{ pathSlugs: string[]; pathNames: string[] }> {
    const leaf = await this.prisma.category.findFirst({
      where: { slug: leafSlug, isActive: true },
      select: { id: true, name: true, slug: true, parentId: true }
    });
    if (!leaf) throw new NotFoundException("Kategori bulunamadı.");
    return this.buildPathSegmentsFromLeafRow(leaf);
  }

  private async buildPathSegmentsFromLeafRow(row: {
    id: number;
    name: string;
    slug: string;
    parentId: number | null;
  }): Promise<{ pathSlugs: string[]; pathNames: string[] }> {
    const all = await this.getActiveCategoryNodes();
    const byId = new Map(all.map((c) => [c.id, c]));
    const chain: { slug: string; name: string }[] = [];
    let current: { id: number; name: string; slug: string; parentId: number | null } | null = row;
    let safety = 0;
    while (current && safety < 64) {
      chain.push({ slug: current.slug, name: current.name });
      current = current.parentId != null ? byId.get(current.parentId) ?? null : null;
      safety += 1;
    }
    chain.reverse();
    return {
      pathSlugs: chain.map((c) => c.slug),
      pathNames: chain.map((c) => c.name)
    };
  }

  /**
   * Ürün yanıtlarında kategori chip ve mağaza linkleri için tam yol alanları.
   */
  async attachCategoryPathToProducts<
    T extends { categoryId: number | null; category?: { name: string | null; slug: string } | null }
  >(items: T[]): Promise<(T & { categoryPathSlugs: string[]; categoryPathNames: string[] })[]> {
    const ids = [...new Set(items.map((p) => p.categoryId).filter((id): id is number => id != null))];
    const pathMap = new Map<number, { pathSlugs: string[]; pathNames: string[] }>();
    await Promise.all(
      ids.map(async (id) => {
        const row = await this.prisma.category.findUnique({
          where: { id },
          select: { id: true, name: true, slug: true, parentId: true }
        });
        if (!row) {
          pathMap.set(id, { pathSlugs: [], pathNames: [] });
          return;
        }
        const path = await this.buildPathSegmentsFromLeafRow(row);
        pathMap.set(id, path);
      })
    );
    return items.map((p) => {
      const fromMap = p.categoryId != null ? pathMap.get(p.categoryId) : undefined;
      const pathSlugs =
        fromMap && fromMap.pathSlugs.length > 0
          ? fromMap.pathSlugs
          : p.category?.slug
            ? [p.category.slug]
            : [];
      const pathNames =
        fromMap && fromMap.pathNames.length > 0
          ? fromMap.pathNames
          : p.category?.slug
            ? [p.category.name ?? p.category.slug]
            : [];
      return { ...p, categoryPathSlugs: pathSlugs, categoryPathNames: pathNames };
    });
  }

  /** Alt ağaçtaki tüm kategori id'leri (kök dahil). */
  async getDescendantCategoryIdsById(rootId: number): Promise<number[]> {
    return this.getDescendantIdsByRootIdCached(rootId);
  }

  /**
   * Yaprak slug ile bu kategori + tüm alt kategoriler (ürün listesi `categorySlug` ile aynı kapsam).
   */
  async getSelfAndDescendantCategoryIdsBySlug(slug: string): Promise<number[]> {
    const nodes = await this.getActiveCategoryNodes();
    const root = nodes.find((n) => n.slug === slug);
    if (!root) return [];
    return this.getDescendantIdsByRootIdCached(root.id);
  }

  /**
   * Kategori sayfası filtreleri: yalnız bu alt ağaçtaki ürünlerden markalar + fiyat aralığı.
   * Marka listesi: URL'deki min/max fiyat uygulanır (ürün listesiyle uyum), marka filtresi uygulanmaz (diğer markaya geçilebilsin).
   * priceExtent: yalnız kategori kapsamı (fiyat filtresi yok) — form ipuçları için.
   */
  async getFacetsForCategoryLeaf(
    leafSlug: string,
    query: { minPrice?: number; maxPrice?: number }
  ): Promise<{
    brands: Array<{
      id: number;
      name: string;
      slug: string;
      logoUrl: string | null;
      productCount: number;
    }>;
    priceExtent: { min: number | null; max: number | null };
  }> {
    const startedAt = Date.now();
    const cacheKey = `cat:facets:${leafSlug}:min:${query.minPrice ?? ""}:max:${query.maxPrice ?? ""}:v2`;
    const cached = await this.cache.get<{
      brands: Array<{
        id: number;
        name: string;
        slug: string;
        logoUrl: string | null;
        productCount: number;
      }>;
      priceExtent: { min: number | null; max: number | null };
    }>(cacheKey);
    if (cached) {
      this.logTiming(`categories.facets(cache-hit) slug=${leafSlug}`, startedAt);
      return cached;
    }

    const categoryIds = await this.getSelfAndDescendantCategoryIdsBySlug(leafSlug);
    const empty = (): {
      brands: Array<{
        id: number;
        name: string;
        slug: string;
        logoUrl: string | null;
        productCount: number;
      }>;
      priceExtent: { min: number | null; max: number | null };
    } => ({ brands: [], priceExtent: { min: null, max: null } });

    if (categoryIds.length === 0) return empty();

    const extentWhere: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      categoryId: { in: categoryIds },
      lowestPriceCache: { not: null }
    };
    const extentAgg = await this.prisma.product.aggregate({
      where: extentWhere,
      _min: { lowestPriceCache: true },
      _max: { lowestPriceCache: true }
    });

    const priceExtent = {
      min: extentAgg._min.lowestPriceCache != null ? Number(extentAgg._min.lowestPriceCache) : null,
      max: extentAgg._max.lowestPriceCache != null ? Number(extentAgg._max.lowestPriceCache) : null
    };

    const brandWhere: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      categoryId: { in: categoryIds }
    };
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      brandWhere.lowestPriceCache = {};
      if (query.minPrice !== undefined) {
        (brandWhere.lowestPriceCache as Prisma.DecimalFilter).gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        (brandWhere.lowestPriceCache as Prisma.DecimalFilter).lte = query.maxPrice;
      }
    }

    const group = await this.prisma.product.groupBy({
      by: ["brandId"],
      where: brandWhere,
      _count: { id: true }
    });

    const withBrand = group.filter((g): g is typeof g & { brandId: number } => g.brandId != null);

    if (withBrand.length === 0) {
      const out = { brands: [], priceExtent };
      await this.cache.set(cacheKey, out, 90);
      this.logTiming(`categories.facets slug=${leafSlug}`, startedAt);
      return out;
    }

    const brandIds = withBrand.map((g) => g.brandId);
    const brands = await this.prisma.brand.findMany({
      where: { id: { in: brandIds } },
      orderBy: { name: "asc" }
    });
    const countBy = new Map(withBrand.map((g) => [g.brandId, g._count.id]));
    const out = {
      brands: brands.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        logoUrl: b.logoUrl,
        productCount: countBy.get(b.id) ?? 0
      })).sort((a, b) => {
        if (b.productCount !== a.productCount) return b.productCount - a.productCount;
        return a.name.localeCompare(b.name, "tr");
      }),
      priceExtent
    };
    await this.cache.set(cacheKey, out, 90);
    this.logTiming(`categories.facets slug=${leafSlug}`, startedAt);
    return out;
  }

  /**
   * Kategori alt ağacındaki aktif ürün sayısı; isteğe bağlı marka / fiyat ile
   * (kategori sayfası filtre paneli ile uyumlu).
   */
  async countProductsUnderCategorySubtree(
    categoryId: number,
    filters?: CategoryNavigationFilters
  ): Promise<number> {
    const ids = await this.getDescendantCategoryIdsById(categoryId);
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      categoryId: { in: ids }
    };
    applyBrandFilterToWhere(where, filters);
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.lowestPriceCache = {};
      if (filters.minPrice !== undefined) {
        (where.lowestPriceCache as Prisma.DecimalFilter).gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        (where.lowestPriceCache as Prisma.DecimalFilter).lte = filters.maxPrice;
      }
    }
    return this.prisma.product.count({ where });
  }

  private sanitizeNavigationFilters(f?: CategoryNavigationFilters): CategoryNavigationFilters | undefined {
    if (!f) return undefined;
    const out: CategoryNavigationFilters = {};
    const brands = parseBrandSlugsCsv(f.brandSlugs);
    if (brands.length > 0) {
      out.brandSlugs = brands.join(",");
    } else if (f.brandSlug?.trim()) {
      out.brandSlug = f.brandSlug.trim();
    }
    if (f.minPrice !== undefined && Number.isFinite(f.minPrice) && !Number.isNaN(f.minPrice)) {
      out.minPrice = f.minPrice;
    }
    if (f.maxPrice !== undefined && Number.isFinite(f.maxPrice) && !Number.isNaN(f.maxPrice)) {
      out.maxPrice = f.maxPrice;
    }
    return Object.keys(out).length ? out : undefined;
  }

  /**
   * Kategori sayfası sol panel:
   * - Mevcut kategorinin doğrudan çocuğu varsa → çocukları listele (kök veya ara seviye).
   * - Yaprak (çocuğu yok) → aynı üstteki kardeşleri listele.
   * - Üst kategori linki: parentId varsa her zaman bir üst.
   */
  async getNavigationPanelForLeaf(leafSlug: string, filters?: CategoryNavigationFilters) {
    const startedAt = Date.now();
    const f = this.sanitizeNavigationFilters(filters);
    const cacheKey = `cat:nav:${leafSlug}:br:${f?.brandSlugs ?? ""}:${f?.brandSlug ?? ""}:min:${f?.minPrice ?? ""}:max:${f?.maxPrice ?? ""}:v4`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) {
      this.logTiming(`categories.navigation(cache-hit) slug=${leafSlug}`, startedAt);
      return cached;
    }

    const leaf = await this.prisma.category.findFirst({
      where: { slug: leafSlug, isActive: true },
      select: { id: true, name: true, slug: true, parentId: true }
    });
    if (!leaf) throw new NotFoundException("Kategori bulunamadı.");

    const currentPath = await this.buildPathSegmentsFromLeafRow(leaf);
    const nodes = await this.getActiveCategoryNodes();
    const byId = new Map(nodes.map((n) => [n.id, n]));

    let parentInfo: {
      slug: string;
      name: string;
      pathSlugs: string[];
      pathNames: string[];
    } | null = null;

    const panelChildrenOfLeaf = await this.prisma.category.findMany({
      where: { parentId: leaf.id, isActive: true },
      select: { id: true, name: true, slug: true, parentId: true, iconName: true, imageUrl: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });

    let navigationMode: "current_children" | "siblings";
    let panelCategories: typeof panelChildrenOfLeaf;

    if (panelChildrenOfLeaf.length > 0) {
      navigationMode = "current_children";
      panelCategories = panelChildrenOfLeaf;
    } else {
      navigationMode = "siblings";
      if (leaf.parentId == null) {
        panelCategories = [];
      } else {
        panelCategories = await this.prisma.category.findMany({
          where: { parentId: leaf.parentId, isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            iconName: true,
            imageUrl: true,
            sortOrder: true
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
        });
      }
    }

    if (leaf.parentId != null) {
      const parentRow = await this.prisma.category.findUnique({
        where: { id: leaf.parentId },
        select: { id: true, name: true, slug: true, parentId: true }
      });
      if (parentRow) {
        const pPath = await this.buildPathSegmentsFromLeafRow(parentRow);
        parentInfo = {
          slug: parentRow.slug,
          name: parentRow.name,
          pathSlugs: pPath.pathSlugs,
          pathNames: pPath.pathNames
        };
      }
    }

    // Compute descendants once per visible panel category.
    const panelDescendants = await Promise.all(
      panelCategories.map(async (s) => ({
        id: s.id,
        ids: await this.getDescendantIdsByRootIdCached(s.id)
      }))
    );
    const allPanelCategoryIds = Array.from(new Set(panelDescendants.flatMap((x) => x.ids)));
    const productWhere: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      categoryId: { in: allPanelCategoryIds }
    };
    applyBrandFilterToWhere(productWhere, f);
    if (f?.minPrice !== undefined || f?.maxPrice !== undefined) {
      productWhere.lowestPriceCache = {};
      if (f.minPrice !== undefined) (productWhere.lowestPriceCache as Prisma.DecimalFilter).gte = f.minPrice;
      if (f.maxPrice !== undefined) (productWhere.lowestPriceCache as Prisma.DecimalFilter).lte = f.maxPrice;
    }

    const grouped = allPanelCategoryIds.length
      ? await this.prisma.product.groupBy({
          by: ["categoryId"],
          where: productWhere,
          _count: { id: true }
        })
      : [];
    const countByCategoryId = new Map(grouped.map((g) => [g.categoryId as number, g._count.id]));
    const descendantSetByRoot = new Map(panelDescendants.map((d) => [d.id, new Set(d.ids)]));

    const pathCache = new Map<number, { pathSlugs: string[]; pathNames: string[] }>();
    const buildPathFromId = (id: number) => {
      const hit = pathCache.get(id);
      if (hit) return hit;
      const chain: CompactCategoryNode[] = [];
      let current: CompactCategoryNode | undefined = byId.get(id);
      let safety = 0;
      while (current && safety < 64) {
        chain.push(current);
        current = current.parentId != null ? byId.get(current.parentId) : undefined;
        safety += 1;
      }
      chain.reverse();
      const out = {
        pathSlugs: chain.map((c) => c.slug),
        pathNames: chain.map((c) => c.name)
      };
      pathCache.set(id, out);
      return out;
    };

    const childPresenceGroups =
      panelCategories.length > 0
        ? await this.prisma.category.groupBy({
            by: ["parentId"],
            where: {
              parentId: { in: panelCategories.map((c) => c.id) },
              isActive: true
            },
            _count: { _all: true }
          })
        : [];
    const panelIdHasChildren = new Map(
      childPresenceGroups.map((g) => [g.parentId as number, (g._count._all ?? 0) > 0])
    );

    const siblingEntries = panelCategories.map((s) => {
      const descendants = descendantSetByRoot.get(s.id) ?? new Set<number>([s.id]);
      let productCount = 0;
      descendants.forEach((id) => {
        productCount += countByCategoryId.get(id) ?? 0;
      });
      const path = buildPathFromId(s.id);
      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        iconName: s.iconName,
        imageUrl: s.imageUrl,
        productCount,
        pathSlugs: path.pathSlugs,
        pathNames: path.pathNames,
        hasChildren: panelIdHasChildren.get(s.id) ?? false
      };
    });

    const result = {
      navigationMode,
      current: {
        slug: leaf.slug,
        name: leaf.name,
        pathSlugs: currentPath.pathSlugs,
        pathNames: currentPath.pathNames
      },
      parent: parentInfo,
      siblings: siblingEntries
    };
    await this.cache.set(cacheKey, result, 90);
    this.logTiming(`categories.navigation slug=${leafSlug}`, startedAt);
    return result;
  }
}

