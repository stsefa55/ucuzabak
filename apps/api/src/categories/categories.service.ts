import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ProductStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type CategoryNavigationFilters = {
  brandSlug?: string;
  minPrice?: number;
  maxPrice?: number;
};

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

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  listTree() {
    // Prisma client henüz yeni alanları (iconName/imageUrl/isActive/sortOrder) tanımıyor olabilir.
    // Bu nedenle storefront için gerekli veriyi DB'den raw SQL ile çekiyoruz.
    return this.prisma.$queryRawUnsafe<CanonicalCategoryRow[]>(`
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
        "name" ASC;
    `);
  }

  /** Kategori listesi + her kategorideki aktif ürün sayısı (sadece üst kategoriler) */
  async listWithProductCount() {
    const canonical = await this.prisma.$queryRawUnsafe<CanonicalCategoryRow[]>(`
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
        "name" ASC;
    `);

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

    return this.prisma.$queryRaw<CanonicalCategoryRow[]>(
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
    const chain: { slug: string; name: string }[] = [];
    let current: { id: number; name: string; slug: string; parentId: number | null } | null = row;
    while (current) {
      chain.push({ slug: current.slug, name: current.name });
      if (!current.parentId) break;
      current = await this.prisma.category.findUnique({
        where: { id: current.parentId },
        select: { id: true, name: true, slug: true, parentId: true }
      });
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
    const ids: number[] = [rootId];
    let frontier: number[] = [rootId];
    while (frontier.length > 0) {
      const children = await this.prisma.category.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true }
      });
      if (children.length === 0) break;
      frontier = children.map((c) => c.id);
      ids.push(...frontier);
    }
    return ids;
  }

  /**
   * Yaprak slug ile bu kategori + tüm alt kategoriler (ürün listesi `categorySlug` ile aynı kapsam).
   */
  async getSelfAndDescendantCategoryIdsBySlug(slug: string): Promise<number[]> {
    const root = await this.prisma.category.findFirst({
      where: { slug, isActive: true },
      select: { id: true }
    });
    if (!root) return [];
    return this.getDescendantCategoryIdsById(root.id);
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
      return { brands: [], priceExtent };
    }

    const brandIds = withBrand.map((g) => g.brandId);
    const brands = await this.prisma.brand.findMany({
      where: { id: { in: brandIds } },
      orderBy: { name: "asc" }
    });
    const countBy = new Map(withBrand.map((g) => [g.brandId, g._count.id]));
    return {
      brands: brands.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        logoUrl: b.logoUrl,
        productCount: countBy.get(b.id) ?? 0
      })),
      priceExtent
    };
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
    if (filters?.brandSlug) {
      where.brand = { slug: filters.brandSlug };
    }
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
    if (f.brandSlug?.trim()) out.brandSlug = f.brandSlug.trim();
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
    const leaf = await this.prisma.category.findFirst({
      where: { slug: leafSlug, isActive: true },
      select: { id: true, name: true, slug: true, parentId: true }
    });
    if (!leaf) throw new NotFoundException("Kategori bulunamadı.");

    const currentPath = await this.buildPathSegmentsFromLeafRow(leaf);
    const f = this.sanitizeNavigationFilters(filters);

    let parentInfo: {
      slug: string;
      name: string;
      pathSlugs: string[];
      pathNames: string[];
    } | null = null;

    const directChildren = await this.prisma.category.findMany({
      where: { parentId: leaf.id, isActive: true },
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

    let navigationMode: "current_children" | "siblings";
    let panelCategories: typeof directChildren;

    if (directChildren.length > 0) {
      navigationMode = "current_children";
      panelCategories = directChildren;
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

    const siblingEntries = await Promise.all(
      panelCategories.map(async (s) => {
        const path = await this.buildPathSegmentsFromLeafRow(s);
        const productCount = await this.countProductsUnderCategorySubtree(s.id, f);
        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          iconName: s.iconName,
          imageUrl: s.imageUrl,
          productCount,
          pathSlugs: path.pathSlugs,
          pathNames: path.pathNames
        };
      })
    );

    return {
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
  }
}

