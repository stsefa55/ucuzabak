/// <reference path="../types/string-similarity.d.ts" />
import { Job } from "bullmq";
import { Prisma } from "@prisma/client";
import {
  FeedImport,
  FeedStatus,
  FeedType,
  MatchStatus,
  ProductStatus,
  StoreProduct,
  UnmatchedStatus
} from "@prisma/client";
import {
  coerceFeedItemExternalId,
  getFeedAdapter,
  isTrendyolNormalizedJsonPayload,
  ParsedFeedItem,
  readFeedFile,
  slugSafeSegmentFromExternalId,
  stripFeedFileUtf8Bom,
  trendyolJsonAdapter
} from "../feeds";
import { pickFeedImageUrlsFromParsedItem, primaryFeedImageUrl } from "../feeds/feedImageUrls";
import { loadCategoryMappingOverrides } from "../categoryCanonical/loadCategoryOverrides";
import {
  createCategoryResolutionContext,
  resolveCategoryTextWithTrace
} from "../categoryCanonical/resolveCategoryText";
import {
  buildBrandStemIndex,
  buildCategoryParentMap,
  extractBrandTextFromSpecs,
  extractCategoryTextFromSpecs,
  mergeItemSpecsWithBrand,
  matchStoreProductToCanonical,
  tryFindExistingProductForFeedItem,
  type FeedMatchOptions
} from "../productMatching/feedMatchScoring";
import { resolveDuplicateBeforeCreate } from "../productMatching/duplicateCanonicalGuard";
import { enqueuePriceAlertsForProduct } from "../email/priceAlertEnqueue";
import { prisma } from "../prisma";
import {
  buildFeedImportCanonicalProductSlugBase,
  isGenericFeedImportBrandPhrase,
  isValidCanonicalSlug,
  lastCategorySegmentForSimilarity,
  normalizeCategoryText,
  normalizeFeedBrandMatchKey
} from "@ucuzabak/shared";
import { matchCanonicalBrandForFeedImport } from "../productMatching/feedImportCanonicalBrand";

/**
 * Deploy / oturum kanıtı: loglarda bu string aranırsa doğru worker sürümü yüklenmiş demektir.
 * coerceFeedItemExternalId döngüde; feedProductSlug → slugSafeSegmentFromExternalId + coerce guard.
 */
export const FEED_IMPORT_PROCESSOR_BUILD = "2026-03-29-feed-import-perf-v1";

if (process.env.UCZBK_FEED_SUPPRESS_IDENTITY_BOOT !== "1") {
  // eslint-disable-next-line no-console
  console.log(
    `[feed-import][module-load] build=${FEED_IMPORT_PROCESSOR_BUILD} coerceFeedItemExternalId=active feedProductSlug=slugSafe+coerceGuard (suppress: UCZBK_FEED_SUPPRESS_IDENTITY_BOOT=1)`
  );
}

const AUTO_MATCH_THRESHOLD = 80;
const REVIEW_THRESHOLD = 50;
/** Admin UI poll için ara kayıt — çok sık DB yazmayın (yerel büyük importta kilitlenmeyi azaltır). */
const FEED_IMPORT_PROGRESS_FLUSH_EVERY = Math.max(
  10,
  Math.min(200, Number(process.env.UCZBK_FEED_PROGRESS_FLUSH_EVERY ?? "50") || 50)
);

const FEED_IMPORT_ROW_LOG = process.env.UCZBK_FEED_IMPORT_TRACE === "1";

function mergeSpecsForStoreUpdate(
  itemSpecs: Record<string, unknown> | undefined,
  itemBrand: string | undefined,
  itemCategoryText: string | undefined,
  previous: Prisma.JsonValue | null
): Prisma.InputJsonValue {
  const mergedFeed = mergeItemSpecsWithBrand(itemSpecs, itemBrand, itemCategoryText);
  const prev =
    previous && typeof previous === "object" && !Array.isArray(previous)
      ? (previous as Record<string, unknown>)
      : {};
  return { ...prev, ...mergedFeed } as Prisma.InputJsonValue;
}

function fallbackMatchScore(source: "ean" | "brand_model" | "modelNumber" | "title" | "brand_title"): number {
  switch (source) {
    case "ean":
      return 100;
    case "brand_model":
      return 94;
    case "modelNumber":
      return 92;
    case "brand_title":
      return 78;
    case "title":
      return 68;
  }
}

export interface FeedImportJobData {
  feedImportId: number;
}

/** Feed'den üretilen ürün için benzersiz slug (Product.slug unique). */
function feedProductSlug(storeId: number, externalId: string): string {
  if (coerceFeedItemExternalId({ externalId }) == null) {
    throw new Error(
      `[feed-import] internal: geçersiz externalId ile slug üretildi (coerce atlanmış olmalı): ${JSON.stringify(externalId)}`
    );
  }
  return `feed-${storeId}-${slugSafeSegmentFromExternalId(externalId)}`;
}

/** SEO slug çakılırsa sayısal sonek (bosch-...-2) ile benzersiz Product.slug ayırır. */
async function allocateUniqueProductSlug(base: string): Promise<string> {
  const clean = base
    .trim()
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  const root = clean.length >= 2 && isValidCanonicalSlug(clean) ? clean : "urun";
  for (let n = 0; n < 500; n++) {
    const candidate = n === 0 ? root : `${root}-${n + 1}`;
    const hit = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!hit) return candidate;
  }
  throw new Error("[feed-import] allocateUniqueProductSlug: çok fazla çakışma");
}

/** Compare at 2 decimal places to avoid duplicate PriceHistory for same price. */
function priceChanged(latestPrice: number | string | unknown, newPrice: Prisma.Decimal): boolean {
  const a = Number(latestPrice);
  const b = Number(newPrice);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
  return Math.abs(a - b) >= 0.005;
}

/** Offer.currentPrice @db.Decimal(12,2) — taşan değerler DB’de hata üretir (tüm satır exception sayılır). */
const OFFER_DECIMAL_MAX = 9999999999.99;

function clampOfferDecimal(n: number): Prisma.Decimal {
  if (!Number.isFinite(n) || n < 0) return new Prisma.Decimal("0");
  const c = Math.min(OFFER_DECIMAL_MAX, n);
  return new Prisma.Decimal(c.toFixed(2));
}

function bumpReason(m: Record<string, number>, key: string, n = 1) {
  m[key] = (m[key] ?? 0) + n;
}

/** `/out/:offerId` yönlendirmesi — `import-normalized-json` ile aynı: mobil URL önce. */
function resolveAffiliateOutboundUrl(item: ParsedFeedItem): string | null {
  const m = item.mobileUrl?.trim();
  const u = item.url?.trim();
  const pick = m && m !== "#" ? m : u && u !== "#" ? u : null;
  return pick || null;
}

/**
 * Yerel JSON import ile aynı: ProductImage satırları + gerekirse mainImageUrl doldurma.
 */
async function syncProductImagesFromFeedItem(productId: number, item: ParsedFeedItem): Promise<void> {
  const urls = pickFeedImageUrlsFromParsedItem(item);
  if (urls.length === 0) return;

  const [productRow, existing] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      select: { mainImageUrl: true }
    }),
    prisma.productImage.findMany({
      where: { productId },
      select: { imageUrl: true }
    })
  ]);

  const seen = new Set(existing.map((e) => e.imageUrl.trim()));
  const missing = urls.filter((u) => !seen.has(u));
  const needsMain = !productRow?.mainImageUrl && urls[0];

  if (missing.length === 0 && !needsMain) {
    return;
  }

  const startPos = existing.length;
  if (missing.length > 0) {
    await prisma.$transaction(
      missing.map((url, i) =>
        prisma.productImage.create({
          data: { productId, imageUrl: url, position: startPos + i }
        })
      )
    );
  }

  if (needsMain) {
    await prisma.product.update({
      where: { id: productId },
      data: { mainImageUrl: urls[0] }
    });
  }
}

function classifyFeedImportException(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    const code = String((e as { code?: string }).code);
    if (code === "P2002") return "exception_prisma_unique_violation";
    if (code === "P2003") return "exception_prisma_foreign_key_violation";
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (/numeric field overflow|Out of range|overflow|decimal/i.test(msg)) return "exception_numeric_overflow";
  return "exception_other";
}

type FeedRowSampleLog = {
  index: number;
  externalId: string;
  title: string;
  categoryTextRaw: string;
  categoryResolutionMethod: string;
  categoryId: number | null;
  reason: string;
  errorMessage?: string;
};

async function upsertOfferAndPriceHistory(
  storeProduct: StoreProduct,
  productId: number,
  item: ParsedFeedItem,
  logContext?: { externalId: string },
  offerStats?: { offersUpserted: number }
) {
  const currentPriceNum = Number(item.price);
  const currentPrice = clampOfferDecimal(Number.isFinite(currentPriceNum) ? currentPriceNum : 0);
  const originalPriceVal =
    item.originalPrice != null && Number.isFinite(Number(item.originalPrice))
      ? clampOfferDecimal(Number(item.originalPrice))
      : null;
  const outboundAffiliate = resolveAffiliateOutboundUrl(item);

  type LogData = {
    storeProductId: number;
    offerId: number;
    oldPrice: string;
    newPrice: string;
    priceHistoryCreated: boolean;
    productCacheRecomputed: boolean;
    lowestPriceCache?: string;
    offerCountCache?: number;
  };

  let logData: LogData | null = null;

  logData = await prisma.$transaction(async (tx) => {
    const storeId = storeProduct.storeId;

    let existingOffer = await tx.offer.findFirst({
      where: { storeId, productId }
    });

    const oldPriceStr = existingOffer ? String(existingOffer.currentPrice) : "—";

    if (existingOffer) {
      await tx.offer.update({
        where: { id: existingOffer.id },
        data: {
          storeProductId: storeProduct.id,
          currentPrice,
          originalPrice: originalPriceVal ?? existingOffer.originalPrice ?? currentPrice,
          currency: item.currency || existingOffer.currency,
          inStock: item.inStock,
          stockQuantity: item.stockQuantity ?? existingOffer.stockQuantity,
          affiliateUrl: outboundAffiliate ?? existingOffer.affiliateUrl,
          lastSeenAt: new Date()
        }
      });
    } else {
      existingOffer = await tx.offer.findFirst({
        where: { storeId, storeProductId: storeProduct.id }
      });
      if (existingOffer) {
        await tx.offer.update({
          where: { id: existingOffer.id },
          data: {
            currentPrice,
            originalPrice: originalPriceVal ?? existingOffer.originalPrice ?? currentPrice,
            currency: item.currency || existingOffer.currency,
            inStock: item.inStock,
            stockQuantity: item.stockQuantity ?? existingOffer.stockQuantity,
            affiliateUrl: outboundAffiliate ?? existingOffer.affiliateUrl,
            lastSeenAt: new Date()
          }
        });
      } else {
        const created = await tx.offer.create({
          data: {
            productId,
            storeId,
            storeProductId: storeProduct.id,
            currentPrice,
            originalPrice: originalPriceVal ?? currentPrice,
            currency: item.currency || "TRY",
            inStock: item.inStock,
            stockQuantity: item.stockQuantity ?? null,
            affiliateUrl: outboundAffiliate,
            lastSeenAt: new Date()
          }
        });
        existingOffer = created;
      }
    }

    const offer = await tx.offer.findFirstOrThrow({
      where: { storeId, productId }
    });

    const latestHistory = await tx.priceHistory.findFirst({
      where: { offerId: offer.id },
      orderBy: { recordedAt: "desc" }
    });

    const shouldCreateHistory = !latestHistory || priceChanged(latestHistory.price, currentPrice);
    if (shouldCreateHistory) {
      await tx.priceHistory.create({
        data: {
          offerId: offer.id,
          price: currentPrice,
          currency: item.currency || "TRY",
          inStock: item.inStock
        }
      });
    }

    const offers = await tx.offer.findMany({
      where: { productId },
      orderBy: { currentPrice: "asc" }
    });

    let productCacheRecomputed = false;
    let lowestPriceCache: string | undefined;
    let offerCountCache: number | undefined;

    if (offers.length > 0) {
      const lowest = offers[0];
      const lastHistory = await tx.priceHistory.findFirst({
        where: { offerId: lowest.id },
        orderBy: { recordedAt: "desc" }
      });
      await tx.product.update({
        where: { id: productId },
        data: {
          status: ProductStatus.ACTIVE,
          lowestPriceCache: lowest.currentPrice,
          lowestPriceStoreId: lowest.storeId,
          offerCountCache: offers.length,
          lastPriceUpdatedAt: lastHistory?.recordedAt ?? new Date()
        }
      });
      productCacheRecomputed = true;
      lowestPriceCache = String(lowest.currentPrice);
      offerCountCache = offers.length;
    }

    const txLogData: LogData = {
      storeProductId: storeProduct.id,
      offerId: offer.id,
      oldPrice: oldPriceStr,
      newPrice: currentPrice.toString(),
      priceHistoryCreated: shouldCreateHistory,
      productCacheRecomputed,
      lowestPriceCache,
      offerCountCache
    };

    return txLogData;
  });

  if (offerStats) {
    offerStats.offersUpserted += 1;
  }

  try {
    await syncProductImagesFromFeedItem(productId, item);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[feed-import] syncProductImagesFromFeedItem failed:", err);
  }

  if (FEED_IMPORT_ROW_LOG && logContext && logData) {
    // eslint-disable-next-line no-console
    console.log(
      `[feed-import] updated_offer storeProductId=${logData.storeProductId} offerId=${logData.offerId} externalId=${logContext.externalId} productId=${productId} oldPrice=${logData.oldPrice} newPrice=${logData.newPrice} priceHistoryCreated=${logData.priceHistoryCreated} productCacheRecomputed=${logData.productCacheRecomputed}` +
        (logData.lowestPriceCache != null ? ` lowestPriceCache=${logData.lowestPriceCache} offerCountCache=${logData.offerCountCache}` : "")
    );
  }

  const skipAlerts =
    process.env.UCZBK_FEED_IMPORT_SKIP_PRICE_ALERTS === "1" ||
    process.env.UCZBK_FEED_IMPORT_SKIP_PRICE_ALERTS === "true";
  if (
    !skipAlerts &&
    logData?.productCacheRecomputed &&
    logData.lowestPriceCache != null &&
    logData.priceHistoryCreated
  ) {
    try {
      await enqueuePriceAlertsForProduct(productId, logData.lowestPriceCache);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[feed-import] price alert enqueue failed", err);
    }
  }
}

export async function processFeedImportJob(job: Job<FeedImportJobData>) {
  const feedImport = await prisma.feedImport.findUnique({
    where: { id: job.data.feedImportId },
    include: { store: true }
  });

  if (!feedImport) {
    return;
  }

  if (process.env.UCZBK_FEED_IMPORT_TRACE === "1") {
    // eslint-disable-next-line no-console
    console.log(
      `[feed-import][job-start] build=${FEED_IMPORT_PROCESSOR_BUILD} feedImportId=${feedImport.id} storeId=${feedImport.storeId} type=${feedImport.type} storeSlug=${JSON.stringify(feedImport.store.slug)}`
    );
  }

  await prisma.feedImport.update({
    where: { id: feedImport.id },
    data: {
      status: FeedStatus.RUNNING,
      startedAt: new Date()
    }
  });

  try {
    const contentRaw = await readFeedFile(feedImport.sourceRef ?? "");
    const content = stripFeedFileUtf8Bom(contentRaw);
    const trendyolPayloadDetected =
      feedImport.type === FeedType.JSON_API && isTrendyolNormalizedJsonPayload(content);
    const baseAdapter = getFeedAdapter(feedImport.type as FeedType, feedImport.store.slug);
    const adapter =
      feedImport.type === FeedType.JSON_API &&
      (feedImport.store.slug.toLowerCase() === "trendyol" || trendyolPayloadDetected)
        ? trendyolJsonAdapter
        : baseAdapter;
    const selectedAdapterName = adapter.constructor.name;

    const traceImport = process.env.UCZBK_FEED_IMPORT_TRACE === "1";
    const adapterDebug = process.env.UCZBK_FEED_ADAPTER_DEBUG === "1" || traceImport;

    if (adapterDebug) {
      // eslint-disable-next-line no-console
      console.log(
        `[feed-import][adapter] build=${FEED_IMPORT_PROCESSOR_BUILD} feedType=${feedImport.type} storeSlug=${JSON.stringify(feedImport.store.slug)} baseAdapter=${baseAdapter.constructor.name} selectedAdapter=${selectedAdapterName} trendyolPayloadDetected=${trendyolPayloadDetected} contentHead=${JSON.stringify(content.slice(0, 120))}`
      );
    }

    const parseResult = adapter.parse(content);
    const items = parseResult.items;

    if (traceImport) {
      // eslint-disable-next-line no-console
      console.log(
        `[feed-import][parse-done] build=${FEED_IMPORT_PROCESSOR_BUILD} feedImportId=${feedImport.id} items=${items.length} dropped=${parseResult.droppedByReason ? JSON.stringify(parseResult.droppedByReason) : "{}"}`
      );
    }

    const [categoriesDb, overrideByKey, brandsDb] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true, slug: true, parentId: true } }),
      loadCategoryMappingOverrides(prisma),
      prisma.brand.findMany({ select: { id: true, name: true, slug: true } })
    ]);
    const categoryParentById = buildCategoryParentMap(categoriesDb);
    const brandStemToIds = buildBrandStemIndex(brandsDb);
    const categoryResolutionCtx = createCategoryResolutionContext(categoriesDb, {
      feedSource: feedImport.store.slug,
      overrideByKey
    });

    await prisma.feedImport.update({
      where: { id: feedImport.id },
      data: {
        totalItems: items.length,
        processedCount: 0,
        createdCount: 0,
        updatedCount: 0,
        matchedCount: 0,
        unmatchedCount: 0,
        errorCount: 0
      }
    });

    let processed = 0;
    let created = 0;
    let updated = 0;
    let matchedCount = 0;
    let unmatchedCount = 0;
    let errors = 0;
    const itemErrors: { index: number; externalId: string; error: string; reasonCode?: string }[] = [];
    const reasonCounts: Record<string, number> = {};
    if (parseResult.droppedByReason) {
      for (const [k, v] of Object.entries(parseResult.droppedByReason)) {
        bumpReason(reasonCounts, `parse_${k}`, v);
      }
    }
    const rowSamples: FeedRowSampleLog[] = [];
    const rowLogMax = Math.min(
      120,
      Math.max(0, Number(process.env.UCZBK_FEED_ROW_LOG_MAX ?? "40") || 40)
    );
    let canonicalProductsCreated = 0;
    let canonicalMergedDuplicateGuard = 0;
    let skippedInvalidExternalId = 0;
    let reusedStoreProductByExternalId = 0;
    const offerStats = { offersUpserted: 0 };
    const identitySamples: Array<{
      index: number;
      externalId: string;
      feedIdentityTrace: ParsedFeedItem["feedIdentityTrace"] | null;
      reusedExistingStoreProductByExternalId: boolean;
      createdNewStoreProduct: boolean;
      storeProductId: number;
    }> = [];
    const unmatchedFeedBrandCounts: Record<string, number> = {};
    let feedImportMatchedBrandStrictCount = 0;
    let feedImportUnmatchedBrandRowStrictCount = 0;

    const logCtx = (externalId: string) => ({ externalId });

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (item == null || typeof item !== "object") {
        bumpReason(reasonCounts, "row_skipped_invalid_row_shape");
        skippedInvalidExternalId += 1;
        continue;
      }
      const rawExternalIdBeforeCoerce = item.externalId;
      const coercedExternalId = coerceFeedItemExternalId(item);
      if (traceImport && index < 20) {
        const slugPreview =
          coercedExternalId != null
            ? feedProductSlug(feedImport.storeId, coercedExternalId)
            : "(atlandı-coerce-null)";
        // eslint-disable-next-line no-console
        console.log(
          `[feed-import][row-coerce] build=${FEED_IMPORT_PROCESSOR_BUILD} idx=${index} rawExternalId=${JSON.stringify(rawExternalIdBeforeCoerce)} typeofRaw=${typeof rawExternalIdBeforeCoerce} coerced=${JSON.stringify(coercedExternalId)} slugPreview=${JSON.stringify(slugPreview)}`
        );
      }
      if (coercedExternalId == null) {
        bumpReason(reasonCounts, "row_skipped_invalid_external_id");
        skippedInvalidExternalId += 1;
        continue;
      }
      item.externalId = coercedExternalId;

      let categoryTextRaw = "";
      let categoryResolutionMethod = "none";
      let categoryResolvedId: number | null = null;
      try {
        processed += 1;

        if (process.env.UCZBK_FEED_ADAPTER_DEBUG === "1" && index < 8) {
          // eslint-disable-next-line no-console
          console.log(
            `[feed-import][before-store-product] idx=${index} adapter=${selectedAdapterName} trendyolPayloadDetected=${trendyolPayloadDetected} externalId=${JSON.stringify(item.externalId)} feedIdentityTrace=${JSON.stringify(item.feedIdentityTrace ?? null)} slugPreview=${JSON.stringify(feedProductSlug(feedImport.storeId, item.externalId))}`
          );
        }

        categoryTextRaw =
          item.categoryText?.trim() ||
          extractCategoryTextFromSpecs(item.specs) ||
          "";
        const categoryResolution = categoryTextRaw
          ? resolveCategoryTextWithTrace(
              categoryResolutionCtx,
              categoryTextRaw,
              feedImport.store.slug
            )
          : { categoryId: null as number | null, method: "none" as const };
        categoryResolutionMethod = String(categoryResolution.method);
        categoryResolvedId = categoryResolution.categoryId;

        if (process.env.UCZBK_FEED_CATEGORY_DEBUG === "1" && categoryTextRaw) {
          const seg = lastCategorySegmentForSimilarity(categoryTextRaw);
          const normLast = normalizeCategoryText(seg).slice(0, 120);
          const sim =
            categoryResolution.method === "auto_similarity"
              ? categoryResolution.similarityScore
              : undefined;
          const reject =
            categoryResolution.method === "none" ? categoryResolution.autoSimilarityReject : undefined;
          console.log(
            [
              "[feed-import]",
              "category",
              `externalId=${item.externalId}`,
              `method=${categoryResolution.method}`,
              `categoryId=${categoryResolution.categoryId ?? "null"}`,
              `score=${sim != null ? sim.toFixed(3) : "-"}`,
              `norm_last=${JSON.stringify(normLast)}`,
              reject ? `similarity_reject=${reject}` : "",
              `raw=${JSON.stringify(categoryTextRaw.slice(0, 100))}`
            ]
              .filter(Boolean)
              .join(" ")
          );
        }

        const matchOpts: FeedMatchOptions = {
          brandStemToIds,
          categoryParentById,
          feedCategoryId: categoryResolution.categoryId,
          categoryResolutionMethod: categoryResolution.method
        };

        let rowOutcomeTag = "result_unknown";

        let storeProduct: StoreProduct;
        let productIdForOffer: number | null = null;
        let reusedByProductId = false;
        let existingHitByExternalId = false;
        let createdNewStoreRow = false;

        const existingByExternalId = await prisma.storeProduct.findUnique({
          where: {
            storeId_externalId: {
              storeId: feedImport.storeId,
              externalId: item.externalId
            }
          }
        });

        if (existingByExternalId) {
          existingHitByExternalId = true;
          reusedStoreProductByExternalId += 1;
          storeProduct = await prisma.storeProduct.update({
            where: { id: existingByExternalId.id },
            data: {
              title: item.title,
              ean: item.ean ?? existingByExternalId.ean,
              modelNumber: item.modelNumber ?? existingByExternalId.modelNumber,
              specsJson: mergeSpecsForStoreUpdate(
                item.specs,
                item.brand,
                item.categoryText,
                existingByExternalId.specsJson
              ),
              url: item.url,
              imageUrl: primaryFeedImageUrl(item) ?? item.imageUrl ?? existingByExternalId.imageUrl,
              updatedAt: new Date()
            }
          });
          updated += 1;
        } else {
          const existingProduct = await tryFindExistingProductForFeedItem(prisma, item, matchOpts);
          const existingByStoreProduct =
            existingProduct &&
            (await prisma.storeProduct.findFirst({
              where: {
                storeId: feedImport.storeId,
                productId: existingProduct.productId
              }
            }));

          if (existingByStoreProduct) {
            storeProduct = await prisma.storeProduct.update({
              where: { id: existingByStoreProduct.id },
              data: {
                externalId: item.externalId,
                title: item.title,
                ean: item.ean ?? existingByStoreProduct.ean,
                modelNumber: item.modelNumber ?? existingByStoreProduct.modelNumber,
                specsJson: mergeSpecsForStoreUpdate(
                  item.specs,
                  item.brand,
                  item.categoryText,
                  existingByStoreProduct.specsJson
                ),
                url: item.url,
                imageUrl: primaryFeedImageUrl(item) ?? item.imageUrl ?? existingByStoreProduct.imageUrl,
                productId: existingProduct.productId,
                matchStatus: MatchStatus.AUTO_MATCHED,
                matchScore: fallbackMatchScore(existingProduct.source),
                matchDetailsJson: { matchedBy: existingProduct.source, reusedStoreProduct: true },
                updatedAt: new Date()
              }
            });
            productIdForOffer = existingProduct.productId;
            reusedByProductId = true;
            updated += 1;
            if (FEED_IMPORT_ROW_LOG) {
              // eslint-disable-next-line no-console
              console.log(
                `[feed-import] reused_store_product externalId=${item.externalId} productId=${existingProduct.productId} by=${existingProduct.source}`
              );
            }
          } else {
            createdNewStoreRow = true;
            storeProduct = await prisma.storeProduct.create({
              data: {
                storeId: feedImport.storeId,
                externalId: item.externalId,
                title: item.title,
                ean: item.ean,
                modelNumber: item.modelNumber,
                specsJson: mergeItemSpecsWithBrand(item.specs, item.brand, item.categoryText) as Prisma.InputJsonValue,
                url: item.url,
                imageUrl: primaryFeedImageUrl(item) ?? item.imageUrl,
                matchStatus: MatchStatus.UNMATCHED,
                matchScore: 0
              }
            });
            created += 1;
          }
        }

        if (identitySamples.length < 20) {
          identitySamples.push({
            index: index + 1,
            externalId: item.externalId,
            feedIdentityTrace: item.feedIdentityTrace ?? null,
            reusedExistingStoreProductByExternalId: existingHitByExternalId,
            createdNewStoreProduct: createdNewStoreRow,
            storeProductId: storeProduct.id
          });
        }
        if (process.env.UCZBK_FEED_IDENTITY_LOG === "1" && index < 50) {
          // eslint-disable-next-line no-console
          console.log(
            `[feed-import][identity] idx=${index + 1} externalId=${JSON.stringify(item.externalId)} trace=${JSON.stringify(item.feedIdentityTrace ?? null)} reusedByExternalId=${existingHitByExternalId} createdStoreRow=${createdNewStoreRow} storeProductId=${storeProduct.id}`
          );
        }

        if (reusedByProductId && productIdForOffer != null) {
          if (categoryTextRaw.trim()) {
            if (categoryResolvedId != null) bumpReason(reasonCounts, "row_feed_category_resolved");
            else bumpReason(reasonCounts, "row_feed_category_unresolved");
          } else {
            bumpReason(reasonCounts, "row_feed_category_missing");
          }
          bumpReason(reasonCounts, "result_reuse_store_row");
          await upsertOfferAndPriceHistory(storeProduct, productIdForOffer, item, logCtx(item.externalId), offerStats);
          matchedCount += 1;
          continue;
        }

        // Matching pipeline (when not already resolved by reuse)
        const matchResult = await matchStoreProductToCanonical(prisma, storeProduct, matchOpts);

        if (matchResult.productId && matchResult.score >= AUTO_MATCH_THRESHOLD) {
          rowOutcomeTag = "result_matched_high";
          productIdForOffer = matchResult.productId;
          await prisma.storeProduct.update({
            where: { id: storeProduct.id },
            data: {
              productId: matchResult.productId,
              matchStatus: MatchStatus.AUTO_MATCHED,
              matchScore: matchResult.score,
              matchDetailsJson: matchResult.details
            }
          });
          await upsertOfferAndPriceHistory(storeProduct, productIdForOffer, item, logCtx(item.externalId), offerStats);
          if (FEED_IMPORT_ROW_LOG) {
            // eslint-disable-next-line no-console
            console.log(
              `[feed-import] matched_existing_product externalId=${item.externalId} productId=${matchResult.productId} score=${matchResult.score}`
            );
          }
        } else if (matchResult.productId && matchResult.score >= REVIEW_THRESHOLD) {
          rowOutcomeTag = "result_matched_review";
          await prisma.storeProduct.update({
            where: { id: storeProduct.id },
            data: {
              productId: matchResult.productId,
              matchStatus: MatchStatus.UNMATCHED,
              matchScore: matchResult.score,
              matchDetailsJson: matchResult.details
            }
          });
          const existingPendingReview = await prisma.unmatchedProductReview.findFirst({
            where: {
              storeProductId: storeProduct.id,
              status: UnmatchedStatus.PENDING
            }
          });
          if (!existingPendingReview) {
            const det = matchResult.details as {
              lowConfidence?: boolean;
              adminHintsTr?: string[];
              humanSummaryTr?: string;
              reviewSeverity?: string;
            };
            const baseNote =
              det.lowConfidence === true
                ? "Skorlar birbirine yakın veya düşük güven — otomatik eşik altı; manuel kontrol önerilir."
                : "Otomatik eşleştirme eşiğin altında kaldı, manuel inceleme gerekli.";
            const extra = [det.adminHintsTr?.[0], det.humanSummaryTr].filter(Boolean).join(" — ");
            const notes = extra ? `${baseNote} ${extra}`.slice(0, 1900) : baseNote;
            await prisma.unmatchedProductReview.create({
              data: {
                storeProductId: storeProduct.id,
                suggestedProductId: matchResult.productId,
                status: UnmatchedStatus.PENDING,
                notes
              }
            });
          } else if (existingPendingReview.suggestedProductId !== matchResult.productId) {
            await prisma.unmatchedProductReview.update({
              where: { id: existingPendingReview.id },
              data: { suggestedProductId: matchResult.productId }
            });
          }
          productIdForOffer = matchResult.productId;
          await upsertOfferAndPriceHistory(storeProduct, productIdForOffer, item, logCtx(item.externalId), offerStats);
          if (FEED_IMPORT_ROW_LOG) {
            // eslint-disable-next-line no-console
            console.log(
              `[feed-import] matched_existing_product externalId=${item.externalId} productId=${matchResult.productId} score=${matchResult.score} (review)`
            );
          }
        } else if (!matchResult.productId) {
          const existingProduct = await tryFindExistingProductForFeedItem(prisma, item, matchOpts);
          if (existingProduct) {
            rowOutcomeTag = "result_matched_fallback_lookup";
            productIdForOffer = existingProduct.productId;
            await prisma.storeProduct.update({
              where: { id: storeProduct.id },
              data: {
                productId: existingProduct.productId,
                matchStatus: MatchStatus.AUTO_MATCHED,
                matchScore: fallbackMatchScore(existingProduct.source),
                matchDetailsJson: { matchedBy: existingProduct.source }
              }
            });
            await upsertOfferAndPriceHistory(storeProduct, productIdForOffer, item, logCtx(item.externalId), offerStats);
            if (FEED_IMPORT_ROW_LOG) {
              // eslint-disable-next-line no-console
              console.log(
                `[feed-import] matched_existing_product externalId=${item.externalId} productId=${existingProduct.productId} by=${existingProduct.source}`
              );
            }
          } else {
            const brandFromItem = item.brand?.trim() ?? extractBrandTextFromSpecs(item.specs) ?? undefined;
            const strictBrand = matchCanonicalBrandForFeedImport(brandsDb, brandFromItem);
            const newProductBrandId = strictBrand?.id ?? null;

            if (strictBrand) {
              feedImportMatchedBrandStrictCount += 1;
            } else if (brandFromItem) {
              const fk = normalizeFeedBrandMatchKey(brandFromItem);
              if (fk.length >= 2 && !isGenericFeedImportBrandPhrase(fk)) {
                feedImportUnmatchedBrandRowStrictCount += 1;
                const lbl = brandFromItem.slice(0, 100).trim();
                unmatchedFeedBrandCounts[lbl] = (unmatchedFeedBrandCounts[lbl] ?? 0) + 1;
              }
            }

            const slugBaseSeo = buildFeedImportCanonicalProductSlugBase({
              title: item.title,
              feedBrandRaw: brandFromItem ?? null,
              matchedCanonicalBrandName: strictBrand?.name ?? null,
              mpn: item.modelNumber ?? null
            });
            let slugBaseFinal = slugBaseSeo;
            if (!isValidCanonicalSlug(slugBaseFinal) || slugBaseFinal.length < 2) {
              slugBaseFinal = feedProductSlug(feedImport.storeId, item.externalId);
            }

            const slug = await allocateUniqueProductSlug(slugBaseFinal);
            let newProduct = await prisma.product.findUnique({ where: { slug } });
            let newProductMatchMeta: Record<string, unknown> = {
              createdFromFeed: true,
              feedImportBrandStrictMatch: strictBrand ? { id: strictBrand.id, name: strictBrand.name } : null,
              feedImportSlugBaseSeo: slugBaseSeo,
              feedImportSlugFallbackUsed: slugBaseFinal !== slugBaseSeo,
              feedImportSlugAllocated: slug
            };

            if (newProduct) {
              rowOutcomeTag = "result_reused_feed_slug";
            } else {
              const dup = await resolveDuplicateBeforeCreate(
                prisma,
                {
                  ean: item.ean ?? null,
                  modelNumber: item.modelNumber ?? null,
                  brandId: newProductBrandId,
                  categoryId: categoryResolution.categoryId,
                  title: item.title
                },
                categoryParentById
              );

              if (dup.action === "use_existing") {
                const existing = await prisma.product.findUnique({ where: { id: dup.productId } });
                if (existing) {
                  newProduct = existing;
                  newProductMatchMeta = {
                    duplicatePrevented: true,
                    mergedToExistingProductId: dup.productId,
                    duplicateReasons: dup.reasons
                  };
                  rowOutcomeTag = "result_merged_duplicate_guard";
                  canonicalMergedDuplicateGuard += 1;
                }
              }
              if (!newProduct) {
                if (dup.action === "create_new" && dup.nearDuplicate) {
                  newProductMatchMeta.nearDuplicateCandidate = dup.nearDuplicate;
                }
                newProduct = await prisma.product.create({
                  data: {
                    name: item.title,
                    slug,
                    ean: item.ean ?? null,
                    modelNumber: item.modelNumber ?? null,
                    description: item.description?.trim() || undefined,
                    mainImageUrl: primaryFeedImageUrl(item) ?? item.imageUrl ?? null,
                    brandId: newProductBrandId ?? undefined,
                    categoryId: categoryResolution.categoryId ?? undefined,
                    status: ProductStatus.ACTIVE
                  }
                });
                rowOutcomeTag = "result_new_canonical";
                canonicalProductsCreated += 1;
              }
            }
            productIdForOffer = newProduct.id;
            await prisma.storeProduct.update({
              where: { id: storeProduct.id },
              data: {
                productId: newProduct.id,
                matchStatus: MatchStatus.AUTO_MATCHED,
                matchScore: newProductMatchMeta.duplicatePrevented === true ? 99 : 100,
                matchDetailsJson: newProductMatchMeta as Prisma.InputJsonValue
              }
            });
            await upsertOfferAndPriceHistory(storeProduct, productIdForOffer, item, logCtx(item.externalId), offerStats);
            if (FEED_IMPORT_ROW_LOG) {
              // eslint-disable-next-line no-console
              console.log(
                `[feed-import] created_new_product externalId=${item.externalId} productId=${newProduct.id} slug=${newProduct.slug}`
              );
            }
          }
        } else {
          rowOutcomeTag = "result_stuck_unmatched";
          await prisma.storeProduct.update({
            where: { id: storeProduct.id },
            data: {
              matchStatus: MatchStatus.UNMATCHED,
              matchScore: matchResult.score,
              matchDetailsJson: matchResult.details
            }
          });
        }

        if (categoryTextRaw.trim()) {
          if (categoryResolvedId != null) bumpReason(reasonCounts, "row_feed_category_resolved");
          else bumpReason(reasonCounts, "row_feed_category_unresolved");
        } else {
          bumpReason(reasonCounts, "row_feed_category_missing");
        }
        bumpReason(reasonCounts, rowOutcomeTag);

        const spFinal = await prisma.storeProduct.findUnique({
          where: { id: storeProduct.id },
          select: { productId: true }
        });
        if (spFinal?.productId != null) matchedCount += 1;
        else unmatchedCount += 1;
      } catch (e) {
        errors += 1;
        const errMsg = e instanceof Error ? e.message : String(e);
        const reasonCode = classifyFeedImportException(e);
        bumpReason(reasonCounts, "row_exception");
        bumpReason(reasonCounts, reasonCode);
        if (categoryTextRaw.trim()) {
          if (categoryResolvedId != null) {
            bumpReason(reasonCounts, "exception_context_category_resolved");
          } else {
            bumpReason(reasonCounts, "exception_context_category_unresolved");
          }
        } else {
          bumpReason(reasonCounts, "exception_context_category_missing");
        }
        itemErrors.push({
          index: index + 1,
          externalId: item.externalId,
          error: errMsg,
          reasonCode
        });
        console.error(`[feed-import] Item failed (externalId=${item.externalId}):`, e);
        if (rowSamples.length < rowLogMax) {
          rowSamples.push({
            index: index + 1,
            externalId: item.externalId,
            title: (item.title ?? "").slice(0, 200),
            categoryTextRaw: categoryTextRaw.slice(0, 300),
            categoryResolutionMethod,
            categoryId: categoryResolvedId,
            reason: reasonCode,
            errorMessage: errMsg.slice(0, 500)
          });
        }
        if (process.env.UCZBK_FEED_ROW_LOG === "1") {
          // Güvenli tek satır: PII yok varsayımı; başlık/kategori kısaltılmış.
          // eslint-disable-next-line no-console
          console.warn(
            `[feed-import][row-fail] externalId=${item.externalId} title=${JSON.stringify((item.title ?? "").slice(0, 100))} categoryRaw=${JSON.stringify(categoryTextRaw.slice(0, 160))} categoryMethod=${categoryResolutionMethod} categoryId=${categoryResolvedId ?? "null"} reason=${reasonCode} err=${JSON.stringify(errMsg.slice(0, 240))}`
          );
        }
      }

      const done = index + 1;
      if (done % FEED_IMPORT_PROGRESS_FLUSH_EVERY === 0 || done === items.length) {
        await prisma.feedImport.update({
          where: { id: feedImport.id },
          data: {
            processedCount: processed,
            createdCount: created,
            updatedCount: updated,
            matchedCount,
            unmatchedCount,
            errorCount: errors
          }
        });
      }
    }

    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    const unmatchedFeedBrandsSorted = Object.entries(unmatchedFeedBrandCounts).sort((a, b) => b[1] - a[1]);
    const unmatchedFeedBrandsTop = unmatchedFeedBrandsSorted
      .slice(0, 40)
      .map(([text, count]) => ({ text, count }));
    const unmatchedFeedBrandSamples = unmatchedFeedBrandsSorted.slice(0, 15).map(([text]) => text);

    const importSummaryJson = {
      version: 1 as const,
      legend: {
        jobStatusTr:
          "Durum (SUCCESS/PARTIAL/FAILED) iş düzeyindedir. PARTIAL = en az bir satırda beklenmeyen hata (exception). Kategori çözülemedi diye satır düşmez; reasonCounts içinde row_feed_category_* olarak sayılır.",
        columnsTr: {
          processedCount:
            "Geçerli externalId ile işlenen satır (importer öncesi geçersiz kimlik atlanır; parse sonrası satır sayısı parse.rowsAfterParse)",
          createdCount: "Yeni StoreProduct (mağaza satırı) oluşturuldu",
          updatedCount: "Mevcut StoreProduct güncellendi (aynı externalId ile tekrar import)",
          matchedCount: "İşlem sonunda productId dolu olan mağaza satırı",
          unmatchedCount: "productId hâlâ boş (ör. aday skoru düşük ve teklif oluşmadı)",
          errorCount: "Exception ile biten satır (try/catch)",
          matchedBrandCount:
            "Yeni canonical ürün yolunda feed markası → sıkı DB Brand eşleşmesi başarılı satır (yalnızca bu import işinde)",
          unmatchedFeedBrandRowCount:
            "Aynı yolda feed’de anlamlı marka vardı ama canonical Brand satırı eşleşmedi (jenerik ifadeler sayılmaz)",
          unmatchedFeedBrandSamples: "Eşleşmeyen ham feed marka metinlerinden örnek (üst sıradan)",
          unmatchedFeedBrandsTop: "Eşleşmeyen marka metni → satır sayısı (en çok tekrar edenler)"
        },
        topReasonsTr: "Gerçek dağılım: result_* = başarılı yol; row_exception / exception_* = hata; parse_* = dosyada parse öncesi elenen satır"
      },
      parse: {
        rowsAfterParse: items.length,
        droppedByReason: parseResult.droppedByReason ?? {}
      },
      counts: {
        parsedRows: items.length,
        processedRows: processed,
        skippedInvalidExternalId,
        rowExceptions: errors,
        newStoreProducts: created,
        updatedStoreProducts: updated,
        reusedExistingStoreProductByExternalId: reusedStoreProductByExternalId,
        offersUpserted: offerStats.offersUpserted,
        matchedStoreRows: matchedCount,
        unmatchedStoreRows: unmatchedCount,
        canonicalProductsCreated,
        canonicalMergedDuplicateGuard
      },
      reasonCounts,
      topReasons,
      rowSamples,
      identitySamples,
      matchedBrandCount: feedImportMatchedBrandStrictCount,
      unmatchedFeedBrandRowCount: feedImportUnmatchedBrandRowStrictCount,
      unmatchedFeedBrandSamples,
      unmatchedFeedBrandsTop
    };

    const MAX_ERROR_LOG_ITEMS = 80;
    const errorLogStr =
      itemErrors.length > 0
        ? JSON.stringify(
            {
              truncated: itemErrors.length > MAX_ERROR_LOG_ITEMS,
              totalErrors: itemErrors.length,
              items: itemErrors.slice(0, MAX_ERROR_LOG_ITEMS)
            },
            null,
            2
          )
        : null;

    await prisma.feedImport.update({
      where: { id: feedImport.id },
      data: {
        status: errors > 0 ? FeedStatus.PARTIAL : FeedStatus.SUCCESS,
        finishedAt: new Date(),
        totalItems: items.length,
        processedCount: processed,
        createdCount: created,
        updatedCount: updated,
        matchedCount,
        unmatchedCount,
        errorCount: errors,
        errorLog: errorLogStr,
        importSummaryJson
      }
    });
  } catch (e) {
    await prisma.feedImport.update({
      where: { id: feedImport.id },
      data: {
        status: FeedStatus.FAILED,
        finishedAt: new Date(),
        errorLog: String(e instanceof Error ? e.message : e)
      }
    });
    throw e;
  }
}

