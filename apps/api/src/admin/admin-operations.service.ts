import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  CategoryMatchScope,
  MatchStatus,
  OfferStatus,
  Prisma,
  StoreProductMatchAuditAction,
  StoreProductReviewFlag
} from "@prisma/client";
import { AdminBrandsBulkService } from "./admin-brands-bulk.service";
import {
  classifyFeedBrandSuggestion,
  extractFeedBrandFromSpecsJson,
  matchCanonicalBrandForFeedImport,
  normalizeCategoryText,
  normalizeFeedBrandMatchKey,
  slugifyCanonical
} from "@ucuzabak/shared";
import { PrismaService } from "../prisma/prisma.service";

export type StoreProductListQuery = {
  page?: number;
  pageSize?: number;
  storeId?: number;
  feedSource?: string;
  matchStatus?: MatchStatus;
  productMatchReason?: string;
  categoryResolutionMethod?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  lowConfidenceOnly?: boolean;
  problemOnly?: boolean;
  manualAssignedOnly?: boolean;
  reviewFlag?: StoreProductReviewFlag;
  q?: string;
  createdFrom?: string;
  createdTo?: string;
};

export type ImportSkipsQuery = {
  page?: number;
  pageSize?: number;
  storeId?: number;
  reason?: string;
  feedSource?: string;
  q?: string;
  createdFrom?: string;
  createdTo?: string;
};

@Injectable()
export class AdminOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandsBulk: AdminBrandsBulkService
  ) {}

  private normalizeOverrideSource(source: string): string {
    return String(source ?? "").trim().toLowerCase();
  }

  private normalizeOverrideKey(input: string): string {
    return normalizeCategoryText(String(input ?? ""));
  }

  async recomputeProductCache(productId: number) {
    const activeOffers = await this.prisma.offer.findMany({
      where: { productId, status: OfferStatus.ACTIVE },
      orderBy: { currentPrice: "asc" }
    });
    const lastHistory =
      activeOffers.length > 0
        ? await this.prisma.priceHistory.findFirst({
            where: { offerId: { in: activeOffers.map((o) => o.id) } },
            orderBy: { recordedAt: "desc" }
          })
        : null;
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        lowestPriceCache: activeOffers.length > 0 ? activeOffers[0].currentPrice : null,
        lowestPriceStoreId: activeOffers.length > 0 ? activeOffers[0].storeId : null,
        offerCountCache: activeOffers.length,
        lastPriceUpdatedAt: lastHistory?.recordedAt ?? null
      }
    });
  }

  async getSummary() {
    const [
      importSkipsTotal,
      categoryOverridesTotal,
      storeProductsFlagged,
      storeProductsReviewed,
      storeProductsTotal,
      noMatchCount,
      unmatchedCount,
      createdNewCount,
      manualAssignedCount,
      lowConfidenceCount
    ] = await Promise.all([
      this.prisma.importSkippedRow.count(),
      this.prisma.categoryMappingOverride.count(),
      this.prisma.storeProduct.count({ where: { reviewFlag: StoreProductReviewFlag.FLAGGED } }),
      this.prisma.storeProduct.count({ where: { reviewFlag: StoreProductReviewFlag.REVIEWED } }),
      this.prisma.storeProduct.count(),
      this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count FROM "StoreProduct"
        WHERE COALESCE("matchDetailsJson"->'productMatch'->>'reason','') = 'no_match';
      `),
      this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count FROM "StoreProduct"
        WHERE "matchStatus" = 'UNMATCHED';
      `),
      this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count FROM "StoreProduct"
        WHERE "matchDetailsJson"->'productMatch'->>'reason' = 'created_new';
      `),
      this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count FROM "StoreProduct"
        WHERE COALESCE("matchDetailsJson"->'productMatch'->>'reason','') = 'manual_override'
           OR "matchStatus" = 'MANUAL_MATCHED';
      `),
      this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count FROM "StoreProduct"
        WHERE "matchDetailsJson"->'productMatch'->>'confidence' IS NOT NULL
          AND ("matchDetailsJson"->'productMatch'->>'confidence')::float < 55
          AND COALESCE("matchDetailsJson"->'productMatch'->>'reason','') <> 'created_new';
      `)
    ]);

    const byReason = await this.prisma.importSkippedRow.groupBy({
      by: ["reason"],
      _count: { id: true }
    });

    const byFeedSource = await this.prisma.$queryRaw<
      { feedSource: string | null; count: bigint }[]
    >(Prisma.sql`
      SELECT "feedSource", COUNT(*)::bigint AS count
      FROM "ImportSkippedRow"
      GROUP BY "feedSource"
      ORDER BY count DESC
      LIMIT 12;
    `);

    return {
      importSkipsTotal,
      categoryOverridesTotal,
      storeProductsTotal,
      storeProductsNoMatch: Number(noMatchCount[0]?.count ?? 0n),
      storeProductsAmbiguous: Number(unmatchedCount[0]?.count ?? 0n),
      storeProductsFlagged,
      storeProductsReviewed,
      storeProductsCreatedNew: Number(createdNewCount[0]?.count ?? 0n),
      storeProductsManualAssigned: Number(manualAssignedCount[0]?.count ?? 0n),
      storeProductsLowConfidence: Number(lowConfidenceCount[0]?.count ?? 0n),
      importSkipsByReason: byReason.map((r) => ({ reason: r.reason, count: r._count.id })),
      importSkipsByFeedSource: byFeedSource.map((r) => ({
        feedSource: r.feedSource,
        count: Number(r.count)
      }))
    };
  }

  async listImportSkips(q: ImportSkipsQuery) {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 30));
    const skip = (page - 1) * pageSize;

    const where: Prisma.ImportSkippedRowWhereInput = {};
    if (q.storeId) where.storeId = q.storeId;
    if (q.reason?.trim()) where.reason = q.reason.trim();
    if (q.feedSource?.trim()) where.feedSource = q.feedSource.trim();
    if (q.createdFrom || q.createdTo) {
      where.createdAt = {};
      if (q.createdFrom) where.createdAt.gte = new Date(q.createdFrom);
      if (q.createdTo) where.createdAt.lte = new Date(q.createdTo);
    }
    if (q.q?.trim()) {
      const s = q.q.trim();
      where.OR = [
        { title: { contains: s, mode: "insensitive" } },
        { categoryText: { contains: s, mode: "insensitive" } },
        { externalId: { contains: s, mode: "insensitive" } },
        { brand: { contains: s, mode: "insensitive" } }
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.importSkippedRow.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { store: { select: { id: true, name: true, slug: true } } }
      }),
      this.prisma.importSkippedRow.count({ where })
    ]);

    return { items, total, page, pageSize };
  }

  async listStoreProducts(q: StoreProductListQuery) {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 30));
    const skip = (page - 1) * pageSize;

    const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];

    if (q.storeId) conditions.push(Prisma.sql`sp."storeId" = ${q.storeId}`);
    if (q.matchStatus) {
      conditions.push(Prisma.sql`sp."matchStatus" = ${q.matchStatus}::"MatchStatus"`);
    }
    if (q.feedSource?.trim()) {
      conditions.push(Prisma.sql`sp."matchDetailsJson"->>'feedSource' = ${q.feedSource.trim()}`);
    }
    if (q.productMatchReason?.trim()) {
      conditions.push(
        Prisma.sql`sp."matchDetailsJson"->'productMatch'->>'reason' = ${q.productMatchReason.trim()}`
      );
    }
    if (q.categoryResolutionMethod?.trim()) {
      conditions.push(
        Prisma.sql`sp."matchDetailsJson"->'categoryResolution'->>'method' = ${q.categoryResolutionMethod.trim()}`
      );
    }
    if (q.confidenceMin !== undefined && Number.isFinite(q.confidenceMin)) {
      conditions.push(
        Prisma.sql`(
          sp."matchDetailsJson"->'productMatch'->>'confidence' IS NOT NULL
          AND (sp."matchDetailsJson"->'productMatch'->>'confidence')::float >= ${q.confidenceMin}
        )`
      );
    }
    if (q.confidenceMax !== undefined && Number.isFinite(q.confidenceMax)) {
      conditions.push(
        Prisma.sql`(
          sp."matchDetailsJson"->'productMatch'->>'confidence' IS NOT NULL
          AND (sp."matchDetailsJson"->'productMatch'->>'confidence')::float <= ${q.confidenceMax}
        )`
      );
    }
    if (q.lowConfidenceOnly) {
      conditions.push(
        Prisma.sql`(
          sp."matchDetailsJson"->'productMatch'->>'confidence' IS NOT NULL
          AND (sp."matchDetailsJson"->'productMatch'->>'confidence')::float < 55
          AND COALESCE(sp."matchDetailsJson"->'productMatch'->>'reason','') <> 'created_new'
        )`
      );
    }
    if (q.reviewFlag) {
      conditions.push(Prisma.sql`sp."reviewFlag" = ${q.reviewFlag}::"StoreProductReviewFlag"`);
    }
    if (q.manualAssignedOnly) {
      conditions.push(
        Prisma.sql`(
          COALESCE(sp."matchDetailsJson"->'productMatch'->>'reason','') = 'manual_override'
          OR sp."matchStatus" = 'MANUAL_MATCHED'
        )`
      );
    }
    if (q.problemOnly) {
      // Varsayılan operasyon görünümü: sorunlu + henüz reviewed değil.
      conditions.push(
        Prisma.sql`(
          sp."reviewFlag" <> 'REVIEWED'
          AND (
            sp."matchStatus" = 'UNMATCHED'
            OR COALESCE(sp."matchDetailsJson"->'productMatch'->>'reason','') = 'no_match'
            OR (
              sp."matchDetailsJson"->'productMatch'->>'confidence' IS NOT NULL
              AND (sp."matchDetailsJson"->'productMatch'->>'confidence')::float < 55
              AND COALESCE(sp."matchDetailsJson"->'productMatch'->>'reason','') <> 'created_new'
            )
          )
        )`
      );
    }
    if (q.q?.trim()) {
      const pattern = `%${q.q.trim()}%`;
      conditions.push(
        Prisma.sql`(
          sp."title" ILIKE ${pattern}
          OR COALESCE(sp."ean",'') ILIKE ${pattern}
          OR COALESCE(sp."modelNumber",'') ILIKE ${pattern}
          OR COALESCE(sp."matchDetailsJson"->>'categoryText','') ILIKE ${pattern}
        )`
      );
    }
    if (q.createdFrom) {
      conditions.push(Prisma.sql`sp."createdAt" >= ${new Date(q.createdFrom)}`);
    }
    if (q.createdTo) {
      conditions.push(Prisma.sql`sp."createdAt" <= ${new Date(q.createdTo)}`);
    }

    const whereSql = Prisma.join(conditions, " AND ");

    const rows = await this.prisma.$queryRaw<
      {
        id: number;
        storeId: number;
        productId: number | null;
        title: string;
        ean: string | null;
        modelNumber: string | null;
        matchScore: number;
        matchStatus: string;
        matchDetailsJson: Prisma.JsonValue | null;
        reviewFlag: string;
        createdAt: Date;
        storeName: string;
        storeSlug: string;
      }[]
    >(Prisma.sql`
      SELECT
        sp.id,
        sp."storeId",
        sp."productId",
        sp.title,
        sp.ean,
        sp."modelNumber",
        sp."matchScore",
        sp."matchStatus"::text,
        sp."matchDetailsJson",
        sp."reviewFlag"::text,
        sp."createdAt",
        s.name AS "storeName",
        s.slug AS "storeSlug"
      FROM "StoreProduct" sp
      INNER JOIN "Store" s ON s.id = sp."storeId"
      WHERE ${whereSql}
      ORDER BY sp."createdAt" DESC
      LIMIT ${pageSize}
      OFFSET ${skip};
    `);

    const countRow = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "StoreProduct" sp
      WHERE ${whereSql};
    `);

    const total = Number(countRow[0]?.count ?? 0n);

    return {
      items: rows.map((r) => ({
        id: r.id,
        storeId: r.storeId,
        productId: r.productId,
        title: r.title,
        ean: r.ean,
        modelNumber: r.modelNumber,
        matchScore: r.matchScore,
        matchStatus: r.matchStatus,
        matchDetailsJson: r.matchDetailsJson,
        reviewFlag: r.reviewFlag,
        createdAt: r.createdAt,
        store: { name: r.storeName, slug: r.storeSlug }
      })),
      total,
      page,
      pageSize
    };
  }

  async getStoreProductDetail(id: number) {
    const sp = await this.prisma.storeProduct.findUnique({
      where: { id },
      include: {
        store: true,
        product: { include: { brand: true, category: true } },
        reviewedBy: { select: { id: true, email: true, name: true } }
      }
    });
    if (!sp) throw new NotFoundException("Mağaza ürünü bulunamadı.");
    return sp;
  }

  async patchStoreProductReview(
    id: number,
    body: {
      reviewFlag?: StoreProductReviewFlag;
      reviewNotes?: string | null;
      markReviewed?: boolean;
    },
    userId: number
  ) {
    const data: Prisma.StoreProductUpdateInput = {};
    if (body.reviewFlag !== undefined) data.reviewFlag = body.reviewFlag;
    if (body.reviewNotes !== undefined) data.reviewNotes = body.reviewNotes;
    if (body.markReviewed) {
      data.reviewFlag = StoreProductReviewFlag.REVIEWED;
      data.reviewedAt = new Date();
      data.reviewedBy = { connect: { id: userId } };
    }

    try {
      return await this.prisma.storeProduct.update({
        where: { id },
        data,
        include: {
          store: true,
          product: { include: { brand: true, category: true } },
          reviewedBy: { select: { id: true, email: true, name: true } }
        }
      });
    } catch {
      throw new NotFoundException("Mağaza ürünü bulunamadı.");
    }
  }

  async createCanonicalProductFromStoreProduct(
    storeProductId: number,
    userId: number,
    opts?: { categoryId?: number; brandId?: number; slug?: string }
  ) {
    const sp = await this.prisma.storeProduct.findUnique({
      where: { id: storeProductId },
      include: { offers: true }
    });
    if (!sp) throw new NotFoundException("Mağaza ürünü bulunamadı.");
    if (sp.productId != null) {
      throw new BadRequestException("Bu mağaza satırı zaten bir canonical ürüne bağlı.");
    }

    if (opts?.categoryId != null) {
      const c = await this.prisma.category.findUnique({ where: { id: opts.categoryId } });
      if (!c) throw new BadRequestException("Geçersiz categoryId.");
    }
    if (opts?.brandId != null) {
      const b = await this.prisma.brand.findUnique({ where: { id: opts.brandId } });
      if (!b) throw new BadRequestException("Geçersiz brandId.");
    }

    let baseSlug = slugifyCanonical((opts?.slug ?? "").trim() || sp.title);
    if (!baseSlug) baseSlug = `urun-${storeProductId}`;

    let slug = baseSlug;
    let n = 0;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      n += 1;
      slug = `${baseSlug}-${n}`;
    }

    const name = (sp.title || `Ürün ${storeProductId}`).slice(0, 500);

    const product = await this.prisma.product.create({
      data: {
        name,
        slug,
        categoryId: opts?.categoryId,
        brandId: opts?.brandId,
        ean: sp.ean ?? undefined,
        modelNumber: sp.modelNumber ?? undefined,
        mainImageUrl: sp.imageUrl ?? undefined,
        specsJson: sp.specsJson ?? undefined
      }
    });

    const existingJson =
      sp.matchDetailsJson &&
      typeof sp.matchDetailsJson === "object" &&
      !Array.isArray(sp.matchDetailsJson)
        ? (sp.matchDetailsJson as Record<string, unknown>)
        : {};

    const nextJson: Prisma.InputJsonValue = {
      ...existingJson,
      createdCanonicalFromStoreProduct: {
        byUserId: userId,
        at: new Date().toISOString(),
        newProductId: product.id
      },
      productMatch: {
        ...(typeof existingJson.productMatch === "object" &&
        existingJson.productMatch !== null &&
        !Array.isArray(existingJson.productMatch)
          ? (existingJson.productMatch as Record<string, unknown>)
          : {}),
        reason: "manual_override",
        confidence: 100,
        details: { source: "create_canonical_from_store_product" }
      }
    };

    const metadataJson: Prisma.InputJsonValue = {
      storeId: sp.storeId,
      storeProductTitle: sp.title,
      ean: sp.ean,
      modelNumber: sp.modelNumber,
      offerIds: sp.offers.map((o) => o.id),
      createdProductId: product.id,
      createdProductSlug: product.slug,
      createdProductName: product.name,
      optionalCategoryId: opts?.categoryId ?? null,
      optionalBrandId: opts?.brandId ?? null
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.storeProduct.update({
        where: { id: storeProductId },
        data: {
          productId: product.id,
          matchStatus: MatchStatus.MANUAL_MATCHED,
          matchScore: 100,
          matchDetailsJson: nextJson,
          reviewFlag: StoreProductReviewFlag.REVIEWED,
          reviewedAt: new Date(),
          reviewedByUserId: userId
        }
      });
      for (const offer of sp.offers) {
        await tx.offer.update({
          where: { id: offer.id },
          data: { productId: product.id }
        });
      }
      await tx.storeProductMatchAuditLog.create({
        data: {
          action: StoreProductMatchAuditAction.CREATE_CANONICAL_PRODUCT,
          storeProductId,
          actorUserId: userId,
          previousProductId: null,
          newProductId: product.id,
          metadataJson
        }
      });
    });

    await this.recomputeProductCache(product.id);
    return this.getStoreProductDetail(storeProductId);
  }

  async assignCanonicalProduct(storeProductId: number, productId: number, userId: number) {
    const sp = await this.prisma.storeProduct.findUnique({
      where: { id: storeProductId },
      include: { offers: true }
    });
    if (!sp) throw new NotFoundException("Mağaza ürünü bulunamadı.");

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException("Canonical ürün bulunamadı.");

    const prevProductId = sp.productId;

    const existingJson =
      sp.matchDetailsJson &&
      typeof sp.matchDetailsJson === "object" &&
      !Array.isArray(sp.matchDetailsJson)
        ? (sp.matchDetailsJson as Record<string, unknown>)
        : {};

    const nextJson: Prisma.InputJsonValue = {
      ...existingJson,
      manualAssignment: {
        byUserId: userId,
        at: new Date().toISOString(),
        productId
      },
      productMatch: {
        ...(typeof existingJson.productMatch === "object" &&
        existingJson.productMatch !== null &&
        !Array.isArray(existingJson.productMatch)
          ? (existingJson.productMatch as Record<string, unknown>)
          : {}),
        reason: "manual_override",
        confidence: 100,
        details: {
          previousReason:
            typeof (existingJson.productMatch as { reason?: string } | undefined)?.reason === "string"
              ? (existingJson.productMatch as { reason: string }).reason
              : null
        }
      }
    };

    const assignMetadata: Prisma.InputJsonValue = {
      storeId: sp.storeId,
      storeProductTitle: sp.title,
      ean: sp.ean,
      modelNumber: sp.modelNumber,
      offerIds: sp.offers.map((o) => o.id),
      targetProductId: product.id,
      targetProductSlug: product.slug,
      targetProductName: product.name
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.storeProduct.update({
        where: { id: storeProductId },
        data: {
          productId,
          matchStatus: MatchStatus.MANUAL_MATCHED,
          matchScore: 100,
          matchDetailsJson: nextJson,
          reviewFlag: StoreProductReviewFlag.REVIEWED,
          reviewedAt: new Date(),
          reviewedByUserId: userId,
          reviewNotes: sp.reviewNotes
        }
      });

      for (const offer of sp.offers) {
        await tx.offer.update({
          where: { id: offer.id },
          data: { productId }
        });
      }

      await tx.storeProductMatchAuditLog.create({
        data: {
          action: StoreProductMatchAuditAction.MANUAL_ASSIGN_PRODUCT,
          storeProductId,
          actorUserId: userId,
          previousProductId: prevProductId,
          newProductId: productId,
          metadataJson: assignMetadata
        }
      });
    });

    await this.recomputeProductCache(productId);
    if (prevProductId && prevProductId !== productId) {
      await this.recomputeProductCache(prevProductId);
    }

    return this.getStoreProductDetail(storeProductId);
  }

  async listMatchAuditLogs(query: {
    page?: number;
    pageSize?: number;
    action?: StoreProductMatchAuditAction;
    storeProductId?: number;
    actorUserId?: number;
  }) {
    const p = Math.max(1, query.page ?? 1);
    const ps = Math.min(100, Math.max(1, query.pageSize ?? 30));
    const where: Prisma.StoreProductMatchAuditLogWhereInput = {};
    if (query.action) where.action = query.action;
    if (query.storeProductId != null) where.storeProductId = query.storeProductId;
    if (query.actorUserId != null) where.actorUserId = query.actorUserId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.storeProductMatchAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (p - 1) * ps,
        take: ps,
        include: {
          actor: { select: { id: true, email: true, name: true } },
          storeProduct: {
            select: {
              id: true,
              title: true,
              storeId: true,
              store: { select: { name: true, slug: true } }
            }
          }
        }
      }),
      this.prisma.storeProductMatchAuditLog.count({ where })
    ]);

    return { items, total, page: p, pageSize: ps };
  }

  async listCategoryOverrides(page: number, pageSize: number, source?: string, q?: string) {
    const p = Math.max(1, page);
    const ps = Math.min(200, Math.max(1, pageSize));
    const where: Prisma.CategoryMappingOverrideWhereInput = {};
    if (source?.trim()) where.source = this.normalizeOverrideSource(source);
    if (q?.trim()) {
      const s = q.trim();
      where.OR = [
        { normalizedKey: { contains: s, mode: "insensitive" } },
        { rawSourceText: { contains: s, mode: "insensitive" } },
        { category: { name: { contains: s, mode: "insensitive" } } },
        { category: { slug: { contains: s, mode: "insensitive" } } }
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.categoryMappingOverride.findMany({
        where,
        skip: (p - 1) * ps,
        take: ps,
        orderBy: { updatedAt: "desc" },
        include: {
          category: { select: { id: true, name: true, slug: true, parentId: true } }
        }
      }),
      this.prisma.categoryMappingOverride.count({ where })
    ]);

    return { items, total, page: p, pageSize: ps };
  }

  async listUnmappableCategoryKeys(page: number, pageSize: number, source?: string, q?: string) {
    const p = Math.max(1, page);
    const ps = Math.min(200, Math.max(1, pageSize));
    const sourceNorm = source?.trim() ? this.normalizeOverrideSource(source) : null;
    const qNorm = q?.trim() ? this.normalizeOverrideKey(q.trim()) : null;
    const qRaw = q?.trim() ? q.trim() : null;
    const offset = (p - 1) * ps;

    const whereParts: Prisma.Sql[] = [
      Prisma.sql`"reason" = 'category_unmappable'`,
      Prisma.sql`"normalizedCategoryKey" IS NOT NULL`,
      Prisma.sql`"normalizedCategoryKey" <> ''`
    ];
    if (sourceNorm) {
      whereParts.push(Prisma.sql`LOWER(COALESCE("feedSource", '')) = ${sourceNorm}`);
    }
    if (qNorm) {
      whereParts.push(
        Prisma.sql`(
          "normalizedCategoryKey" ILIKE ${`%${qNorm}%`}
          OR COALESCE("categoryText",'') ILIKE ${`%${qRaw}%`}
        )`
      );
    }
    const whereSql = Prisma.join(whereParts, " AND ");

    // Postgres’te worker’daki `normalizeCategoryText(lastSegment)` benzeri bir normalizasyon.
    // Bu ifade yalnızca admin “etki” sayımına yardımcı olur; worker import’un ana doğruluk kaynağıdır.
    // Not: `replace()` PG’de yalnızca 3 argüman alır; regex + 'g' için `regexp_replace` zincirlenir.
    const lastKeyExpr = `
      btrim(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                replace(
                  replace(
                    replace(
                      replace(
                        replace(
                          replace(
                            replace(
                              lower(
                                btrim(
                                  regexp_replace(
                                    regexp_replace(
                                      regexp_replace(
                                        regexp_replace(
                                          replace(
                                            (regexp_split_to_array(COALESCE(ir2."categoryText", ''), '[>,/\\\\|,;]+'))[
                                              array_length(
                                                regexp_split_to_array(COALESCE(ir2."categoryText", ''), '[>,/\\\\|,;]+'),
                                                1
                                              )
                                            ],
                                            '+',
                                            ' '
                                          ),
                                          '[-–—]+',
                                          ' ',
                                          'g'
                                        ),
                                        '[>/\\\\]+',
                                        ' ',
                                        'g'
                                      ),
                                      '[,;|]+',
                                      ' ',
                                      'g'
                                    ),
                                    '[[:space:]]+',
                                    ' ',
                                    'g'
                                  )
                                )
                              ),
                              '&',
                              ' ve '
                            ),
                            'ç',
                            'c'
                          ),
                          'ğ',
                          'g'
                        ),
                        'ı',
                        'i'
                      ),
                      'ö',
                      'o'
                    ),
                    'ş',
                    's'
                  ),
                  'ü',
                  'u'
                ),
                '[^a-z0-9[:space:]]+',
                ' ',
                'g'
              ),
              '[[:space:]]+',
              ' ',
              'g'
            )
          ),
          '[[:space:]]+',
          ' ',
          'g'
        )
      )
    `;

    const rows = await this.prisma.$queryRaw<
      {
        feedSource: string | null;
        normalizedKey: string;
        sampleRawText: string | null;
        count: bigint;
        lastImpactCount: bigint;
        latestAt: Date;
      }[]
    >(Prisma.sql`
      SELECT
        LOWER(COALESCE(ir."feedSource", '*')) AS "feedSource",
        ir."normalizedCategoryKey" AS "normalizedKey",
        MAX(ir."categoryText") AS "sampleRawText",
        COUNT(*)::bigint AS count,
        (
          SELECT COUNT(*)::bigint
          FROM "ImportSkippedRow" ir2
          WHERE
            ir2."reason" = 'category_unmappable'
            AND LOWER(COALESCE(ir2."feedSource", '*')) = LOWER(COALESCE(ir."feedSource", '*'))
            AND ${Prisma.raw(lastKeyExpr)} = ir."normalizedCategoryKey"
        ) AS "lastImpactCount",
        MAX(ir."createdAt") AS "latestAt"
      FROM "ImportSkippedRow" ir
      WHERE ${whereSql}
      GROUP BY LOWER(COALESCE(ir."feedSource", '*')), ir."normalizedCategoryKey"
      ORDER BY COUNT(*) DESC, MAX(ir."createdAt") DESC
      LIMIT ${ps}
      OFFSET ${offset};
    `);

    const totalRow = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM (
        SELECT 1
        FROM "ImportSkippedRow"
        WHERE ${whereSql}
        GROUP BY LOWER(COALESCE("feedSource", '*')), "normalizedCategoryKey"
      ) x;
    `);

    const keys = rows.map((r) => ({
      source: r.feedSource ?? "*",
      normalizedKey: r.normalizedKey
    }));

    let overrideMap = new Map<string, { id: number; matchScope: CategoryMatchScope; categoryId: number }>();
    if (keys.length > 0) {
      const bySource = new Set(keys.map((k) => k.source));
      const byNorm = new Set(keys.map((k) => k.normalizedKey));
      const overrides = await this.prisma.categoryMappingOverride.findMany({
        where: {
          source: { in: [...bySource, "*"] },
          normalizedKey: { in: [...byNorm] }
        },
        select: { id: true, source: true, normalizedKey: true, matchScope: true, categoryId: true }
      });
      overrideMap = new Map(
        overrides.map((o) => [
          `${this.normalizeOverrideSource(o.source)}|${o.normalizedKey}|${o.matchScope}`,
          { id: o.id, matchScope: o.matchScope, categoryId: o.categoryId }
        ])
      );
    }

    const items = rows.map((r) => {
      const src = this.normalizeOverrideSource(r.feedSource ?? "*");
      const full =
        overrideMap.get(`${src}|${r.normalizedKey}|FULL`) ??
        overrideMap.get(`*|${r.normalizedKey}|FULL`) ??
        null;
      const last =
        overrideMap.get(`${src}|${r.normalizedKey}|LAST_SEGMENT`) ??
        overrideMap.get(`*|${r.normalizedKey}|LAST_SEGMENT`) ??
        null;

      return {
        source: src,
        normalizedKey: r.normalizedKey,
        sampleRawText: r.sampleRawText,
        count: Number(r.count),
        lastImpactCount: Number(r.lastImpactCount),
        latestAt: r.latestAt,
        hasFullOverride: Boolean(full),
        hasLastSegmentOverride: Boolean(last),
        fullOverride: full,
        lastSegmentOverride: last
      };
    });

    return {
      items,
      total: Number(totalRow[0]?.count ?? 0n),
      page: p,
      pageSize: ps
    };
  }

  async createCategoryOverride(data: {
    source: string;
    matchScope: CategoryMatchScope;
    normalizedKey?: string;
    categoryId: number;
    confidence?: number;
    rawSourceText?: string | null;
  }) {
    const source = this.normalizeOverrideSource(data.source);
    const normalizedKey = this.normalizeOverrideKey(data.normalizedKey || data.rawSourceText || "");
    if (!source || !normalizedKey) {
      throw new BadRequestException("source ve normalizedKey (veya rawSourceText) zorunludur.");
    }

    const category = await this.prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new BadRequestException("Geçersiz categoryId.");

    const existing = await this.prisma.categoryMappingOverride.findFirst({
      where: {
        source,
        matchScope: data.matchScope,
        normalizedKey
      },
      select: { id: true }
    });
    if (existing) {
      throw new BadRequestException("Bu source + matchScope + normalizedKey için kayıt zaten var.");
    }

    try {
      return await this.prisma.categoryMappingOverride.create({
        data: {
          source,
          matchScope: data.matchScope,
          normalizedKey,
          categoryId: data.categoryId,
          confidence: data.confidence ?? 1,
          isManual: true,
          rawSourceText: data.rawSourceText?.trim() || null
        },
        include: {
          category: { select: { id: true, name: true, slug: true, parentId: true } }
        }
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Unique constraint")) {
        throw new BadRequestException("Bu source + normalizedKey + matchScope için kayıt zaten var.");
      }
      throw e;
    }
  }

  async updateCategoryOverride(
    id: number,
    data: Partial<{
      source: string;
      matchScope: CategoryMatchScope;
      normalizedKey: string;
      categoryId: number;
      confidence: number;
      rawSourceText: string | null;
    }>
  ) {
    const existing = await this.prisma.categoryMappingOverride.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Override bulunamadı.");

    if (data.categoryId !== undefined) {
      const cat = await this.prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!cat) throw new BadRequestException("Geçersiz categoryId.");
    }

    const nextNormalizedKey =
      data.normalizedKey !== undefined
        ? this.normalizeOverrideKey(data.normalizedKey)
        : data.rawSourceText !== undefined
          ? this.normalizeOverrideKey(data.rawSourceText || "")
          : undefined;

    try {
      return await this.prisma.categoryMappingOverride.update({
        where: { id },
        data: {
          ...(data.source !== undefined
            ? { source: this.normalizeOverrideSource(data.source) }
            : {}),
          ...(data.matchScope !== undefined ? { matchScope: data.matchScope } : {}),
          ...(nextNormalizedKey !== undefined
            ? { normalizedKey: nextNormalizedKey }
            : {}),
          ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
          ...(data.confidence !== undefined ? { confidence: data.confidence } : {}),
          ...(data.rawSourceText !== undefined
            ? { rawSourceText: data.rawSourceText?.trim() || null }
            : {})
        },
        include: {
          category: { select: { id: true, name: true, slug: true, parentId: true } }
        }
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Unique constraint")) {
        throw new BadRequestException("Bu kombinasyon başka bir kayıtla çakışıyor.");
      }
      throw e;
    }
  }

  async deleteCategoryOverride(id: number) {
    try {
      await this.prisma.categoryMappingOverride.delete({ where: { id } });
    } catch {
      throw new NotFoundException("Override bulunamadı.");
    }
    return { ok: true };
  }

  private parseFeedImportBrandDiagnostics(json: unknown): {
    matchedBrandCount: number | null;
    unmatchedFeedBrandRowCount: number | null;
    unmatchedFeedBrandsTop: { text: string; count: number }[];
    unmatchedFeedBrandSamples: string[];
  } {
    const empty = {
      matchedBrandCount: null as number | null,
      unmatchedFeedBrandRowCount: null as number | null,
      unmatchedFeedBrandsTop: [] as { text: string; count: number }[],
      unmatchedFeedBrandSamples: [] as string[]
    };
    if (!json || typeof json !== "object" || Array.isArray(json)) return empty;
    const o = json as Record<string, unknown>;

    const matchedBrandCount =
      typeof o.matchedBrandCount === "number" && Number.isFinite(o.matchedBrandCount)
        ? o.matchedBrandCount
        : null;
    const unmatchedFeedBrandRowCount =
      typeof o.unmatchedFeedBrandRowCount === "number" && Number.isFinite(o.unmatchedFeedBrandRowCount)
        ? o.unmatchedFeedBrandRowCount
        : null;

    const top = o.unmatchedFeedBrandsTop;
    const unmatchedFeedBrandsTop: { text: string; count: number }[] = [];
    if (Array.isArray(top)) {
      for (const row of top) {
        if (!row || typeof row !== "object" || Array.isArray(row)) continue;
        const r = row as Record<string, unknown>;
        if (typeof r.text === "string" && typeof r.count === "number") {
          unmatchedFeedBrandsTop.push({ text: r.text, count: r.count });
        }
      }
    }

    let unmatchedFeedBrandSamples: string[] = [];
    const samples = o.unmatchedFeedBrandSamples;
    if (Array.isArray(samples)) {
      unmatchedFeedBrandSamples = samples.filter((s): s is string => typeof s === "string");
    }
    if (unmatchedFeedBrandSamples.length === 0 && unmatchedFeedBrandsTop.length > 0) {
      unmatchedFeedBrandSamples = unmatchedFeedBrandsTop.slice(0, 12).map((x) => x.text);
    }

    return {
      matchedBrandCount,
      unmatchedFeedBrandRowCount,
      unmatchedFeedBrandsTop,
      unmatchedFeedBrandSamples
    };
  }

  /** Son tamamlanan importların `importSummaryJson` marka alanları (salt okunur). */
  async getFeedImportBrandDiagnostics(limit = 10) {
    const take = Math.min(50, Math.max(1, limit));
    const rows = await this.prisma.feedImport.findMany({
      where: {
        status: { in: ["SUCCESS", "PARTIAL"] },
        finishedAt: { not: null }
      },
      orderBy: { finishedAt: "desc" },
      take,
      select: {
        id: true,
        storeId: true,
        finishedAt: true,
        status: true,
        importSummaryJson: true,
        store: { select: { id: true, name: true, slug: true } }
      }
    });

    return {
      items: rows.map((r) => ({
        feedImportId: r.id,
        storeId: r.storeId,
        store: r.store,
        finishedAt: r.finishedAt,
        status: r.status,
        ...this.parseFeedImportBrandDiagnostics(r.importSummaryJson)
      }))
    };
  }

  /**
   * brandId boş canonical ürünlerde StoreProduct.specsJson markasını okuyup yalnızca sıkı Brand eşleşmesi varsa yazar.
   * Varsayılan dryRun: true (gövde gönderilmezse veya dryRun false değilse).
   */
  async backfillProductBrandsFromStoreSpecs(opts: { dryRun?: boolean; limit?: number }) {
    const dryRun = opts.dryRun !== false;
    const limit = Math.min(5000, Math.max(1, opts.limit ?? 300));

    const brands = await this.prisma.brand.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { id: "asc" }
    });

    const products = await this.prisma.product.findMany({
      where: { brandId: null },
      take: limit,
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        storeProducts: {
          take: 8,
          select: { specsJson: true }
        }
      }
    });

    const assignments: {
      productId: number;
      brandId: number;
      brandName: string;
      feedBrandText: string;
    }[] = [];
    let skippedNoFeedBrandInSpecs = 0;
    const skippedNoMatch: { productId: number; feedBrandText: string }[] = [];

    for (const p of products) {
      let feedBrandText: string | null = null;
      for (const sp of p.storeProducts) {
        feedBrandText = extractFeedBrandFromSpecsJson(sp.specsJson);
        if (feedBrandText) break;
      }
      if (!feedBrandText) {
        skippedNoFeedBrandInSpecs += 1;
        continue;
      }
      const m = matchCanonicalBrandForFeedImport(brands, feedBrandText);
      if (!m) {
        skippedNoMatch.push({ productId: p.id, feedBrandText });
        continue;
      }
      assignments.push({
        productId: p.id,
        brandId: m.id,
        brandName: m.name,
        feedBrandText
      });
      if (!dryRun) {
        await this.prisma.product.update({
          where: { id: p.id },
          data: { brandId: m.id }
        });
      }
    }

    return {
      dryRun,
      limit,
      scannedProducts: products.length,
      assignedCount: assignments.length,
      assignments: assignments.slice(0, 80),
      skippedNoFeedBrandInSpecs,
      skippedNoStrictBrandMatch: skippedNoMatch.length,
      skippedNoMatchSample: skippedNoMatch.slice(0, 25)
    };
  }

  /**
   * StoreProduct.specsJson içindeki marka alanlarından frekans; normalize anahtarına göre birleştirilebilir.
   */
  async listFeedBrandSuggestions(opts: {
    limit?: number;
    minCount?: number;
    merge?: boolean;
  }) {
    const limit = Math.min(5000, Math.max(1, opts.limit ?? 2000));
    const minCount = Math.min(1_000_000, Math.max(1, opts.minCount ?? 1));
    const merge = opts.merge !== false;

    const sqlRows = await this.prisma.$queryRaw<{ brand_text: string; cnt: number }[]>(Prisma.sql`
      SELECT brand_text, COUNT(*)::int AS cnt
      FROM (
        SELECT NULLIF(
          TRIM(BOTH FROM COALESCE(
            sp."specsJson"->>'Marka',
            sp."specsJson"->>'marka',
            sp."specsJson"->>'Brand',
            sp."specsJson"->>'brand',
            sp."specsJson"->>'BRAND',
            sp."specsJson"->>'Üretici',
            sp."specsJson"->>'Manufacturer'
          )),
          ''
        ) AS brand_text
        FROM "StoreProduct" sp
        WHERE sp."specsJson" IS NOT NULL
      ) AS sub
      WHERE brand_text IS NOT NULL AND LENGTH(brand_text) >= 2
      GROUP BY brand_text
      HAVING COUNT(*) >= ${minCount}
      ORDER BY cnt DESC
      LIMIT ${limit}
    `);

    type Entry = { rawBrand: string; count: number; mergeKey: string };
    let entries: Entry[] = [];

    if (merge) {
      const acc = new Map<string, { rawBrand: string; count: number; maxCnt: number }>();
      for (const row of sqlRows) {
        const k = normalizeFeedBrandMatchKey(row.brand_text);
        if (k.length < 2) continue;
        const a = acc.get(k);
        if (!a) {
          acc.set(k, { rawBrand: row.brand_text, count: row.cnt, maxCnt: row.cnt });
        } else {
          a.count += row.cnt;
          if (row.cnt > a.maxCnt) {
            a.maxCnt = row.cnt;
            a.rawBrand = row.brand_text;
          }
        }
      }
      entries = [...acc.entries()].map(([mergeKey, v]) => ({
        rawBrand: v.rawBrand,
        count: v.count,
        mergeKey
      }));
    } else {
      entries = sqlRows.map((row) => ({
        rawBrand: row.brand_text,
        count: row.cnt,
        mergeKey: row.brand_text
      }));
    }

    entries.sort((a, b) => b.count - a.count);

    const brands = await this.prisma.brand.findMany({
      select: { id: true, name: true, slug: true }
    });

    const items = entries.map((e) => {
      const { class: classification, suggestedCanonical, normalizedKey } = classifyFeedBrandSuggestion(e.rawBrand);
      const existing =
        matchCanonicalBrandForFeedImport(brands, e.rawBrand) ??
        matchCanonicalBrandForFeedImport(brands, suggestedCanonical);
      return {
        mergeKey: e.mergeKey,
        rawBrand: e.rawBrand,
        count: e.count,
        classification,
        suggestedCanonical,
        suggestedSlug: slugifyCanonical(suggestedCanonical),
        normalizedKey,
        alreadyCanonical: existing != null,
        existingBrandId: existing?.id ?? null,
        existingBrandName: existing?.name ?? null
      };
    });

    const byClass: Record<string, number> = {
      STRONG: 0,
      NORMALIZABLE: 0,
      SUSPICIOUS: 0,
      GENERIC: 0
    };
    for (const it of items) {
      byClass[it.classification] = (byClass[it.classification] ?? 0) + 1;
    }

    return {
      source: "store_product_specs_json" as const,
      merge,
      limit,
      minCount,
      total: items.length,
      byClass,
      items
    };
  }

  /**
   * Operatör seçimiyle canonical marka oluşturur. Gönderilen ad jenerik sınıftaysa atlanır; aksi halde mevcut toplu içe aktarma kuralları uygulanır.
   */
  async approveFeedBrandSuggestions(
    items: { canonicalName: string }[],
    dryRun?: boolean
  ) {
    const skippedAsGeneric: string[] = [];
    const dedupByKey = new Map<string, string>();

    for (const it of items) {
      const name = it.canonicalName?.trim() ?? "";
      if (name.length < 2) continue;
      const { class: cls } = classifyFeedBrandSuggestion(name);
      if (cls === "GENERIC") {
        skippedAsGeneric.push(name);
        continue;
      }
      const k = normalizeFeedBrandMatchKey(name);
      if (k.length < 2) continue;
      if (!dedupByKey.has(k)) dedupByKey.set(k, name);
    }

    const names = [...dedupByKey.values()];
    const bulk = await this.brandsBulk.createFromCanonicalNames(names, dryRun !== false);

    return {
      skippedAsGeneric,
      bulk
    };
  }
}
