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
import { compareTwoStrings } from "string-similarity";
import { getFeedAdapter, ParsedFeedItem, readFeedFile } from "../feeds";
import { prisma } from "../prisma";

const AUTO_MATCH_THRESHOLD = 80;
const REVIEW_THRESHOLD = 50;

export interface FeedImportJobData {
  feedImportId: number;
}

function normalizeTr(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ş]/g, "s")
    .replace(/[ü]/g, "u")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Feed'den üretilen ürün için benzersiz slug (Product.slug unique). */
function feedProductSlug(storeId: number, externalId: string): string {
  const safe = String(externalId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `feed-${storeId}-${safe || "item"}`;
}

/** Item verisiyle mevcut Product ara: EAN (en güçlü) → modelNumber → normalized title similarity. */
async function tryFindExistingProductForItem(
  item: ParsedFeedItem
): Promise<{ productId: number; source: "ean" | "modelNumber" | "title" } | null> {
  const eanStr = item.ean != null && String(item.ean).trim() !== "" ? String(item.ean).trim() : null;
  const modelStr =
    item.modelNumber != null && String(item.modelNumber).trim() !== ""
      ? String(item.modelNumber).trim()
      : null;

  if (eanStr) {
    const byEan = await prisma.product.findFirst({
      where: { ean: eanStr }
    });
    if (byEan) return { productId: byEan.id, source: "ean" };
  }

  if (modelStr) {
    const byModel = await prisma.product.findFirst({
      where: {
        modelNumber: { equals: modelStr, mode: "insensitive" }
      }
    });
    if (byModel) return { productId: byModel.id, source: "modelNumber" };
  }

  const titleWords = item.title.trim().split(/\s+/).slice(0, 3).join(" ");
  if (titleWords.length < 2) return null;
  const byTitle = await prisma.product.findMany({
    where: {
      name: { contains: titleWords, mode: "insensitive" }
    },
    take: 20
  });
  if (byTitle.length === 0) return null;
  const normalizedItemTitle = normalizeTr(item.title);
  let best: { productId: number; score: number } | null = null;
  for (const p of byTitle) {
    const sim = compareTwoStrings(normalizedItemTitle, normalizeTr(p.name));
    if (sim >= 0.5 && (!best || sim > best.score)) {
      best = { productId: p.id, score: sim };
    }
  }
  return best ? { productId: best.productId, source: "title" } : null;
}

type MatchDetails = {
  candidateProductId: number;
  components: {
    [key: string]: unknown;
  };
  total?: number;
};

async function matchProductForStoreProduct(
  storeProduct: StoreProduct,
): Promise<{ productId: number | null; score: number; details: Prisma.JsonObject }> {
  const hasStrictMatch = Boolean(storeProduct.ean || storeProduct.modelNumber);
  const candidates = hasStrictMatch
    ? await prisma.product.findMany({
        where: {
          OR: [
            storeProduct.ean ? { ean: storeProduct.ean } : undefined,
            storeProduct.modelNumber ? { modelNumber: storeProduct.modelNumber } : undefined
          ].filter(Boolean) as object[]
        },
        take: 50
      })
    : [];

  // If no strict candidates, broaden search by title
  const allCandidates =
    candidates.length > 0
      ? candidates
      : await prisma.product.findMany({
          where: {
            name: {
              contains: storeProduct.title.split(" ").slice(0, 3).join(" "),
              mode: "insensitive"
            }
          },
          take: 50
        });

  if (allCandidates.length === 0) {
    return { productId: null, score: 0, details: {} as Prisma.JsonObject };
  }

  const normalizedStoreTitle = normalizeTr(storeProduct.title);

  let bestScore = 0;
  let bestCandidate: (typeof allCandidates)[number] | null = null;
  let bestDetails: MatchDetails | null = null;

  for (const product of allCandidates) {
    let score = 0;
    const details: MatchDetails = {
      candidateProductId: product.id,
      components: {}
    };

    // EAN exact
    if (storeProduct.ean && product.ean && storeProduct.ean === product.ean) {
      score += 60;
      details.components.ean = { matched: true, score: 60 };
    } else {
      details.components.ean = { matched: false, score: 0 };
    }

    // Model exact
    if (
      storeProduct.modelNumber &&
      product.modelNumber &&
      storeProduct.modelNumber.toLowerCase() === product.modelNumber.toLowerCase()
    ) {
      score += 20;
      details.components.model = { matched: true, score: 20 };
    } else {
      details.components.model = { matched: false, score: 0 };
    }

    // Title similarity
    const normalizedProductTitle = normalizeTr(product.name);
    const titleSim = compareTwoStrings(normalizedStoreTitle, normalizedProductTitle);
    const titleScore = Math.round(titleSim * 10);
    score += titleScore;
    details.components.title = { similarity: titleSim, score: titleScore };

    // Fuzzy similarity (same metric but different weight)
    const fuzzyScore = Math.round(titleSim * 5);
    score += fuzzyScore;
    details.components.fuzzy = { similarity: titleSim, score: fuzzyScore };

    // Spec comparison (very simple: shared keys count)
    let specsScore = 0;
    const matchedFields: string[] = [];
    if (storeProduct.specsJson && product.specsJson) {
      const s = storeProduct.specsJson as Prisma.JsonObject;
      const p = product.specsJson as Prisma.JsonObject;
      for (const key of Object.keys(s)) {
        const sv = s[key as keyof typeof s];
        const pv = p[key as keyof typeof p];
        if (pv && String(pv).toLowerCase() === String(sv).toLowerCase()) {
          matchedFields.push(key);
          specsScore += 2;
        }
        if (specsScore >= 10) break;
      }
    }
    score += specsScore;
    details.components.specs = { matchedFields, score: specsScore };

    details.total = score;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = product;
      bestDetails = details;
    }
  }

  return {
    productId: bestCandidate ? bestCandidate.id : null,
    score: bestScore,
    details: (bestDetails ?? { candidateProductId: 0, components: {}, total: 0 }) as unknown as Prisma.JsonObject
  };
}

/** Compare at 2 decimal places to avoid duplicate PriceHistory for same price. */
function priceChanged(latestPrice: number | string | unknown, newPrice: Prisma.Decimal): boolean {
  const a = Number(latestPrice);
  const b = Number(newPrice);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
  return Math.abs(a - b) >= 0.005;
}

async function upsertOfferAndPriceHistory(
  storeProduct: StoreProduct,
  productId: number,
  item: ParsedFeedItem,
  logContext?: { externalId: string }
) {
  const currentPriceNum = Number(item.price);
  const currentPrice = new Prisma.Decimal(Number.isFinite(currentPriceNum) ? currentPriceNum.toFixed(2) : "0");
  const originalPriceVal =
    item.originalPrice != null && Number.isFinite(Number(item.originalPrice))
      ? new Prisma.Decimal(Number(item.originalPrice).toFixed(2))
      : null;

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
    const store = await tx.store.findUniqueOrThrow({
      where: { id: storeProduct.storeId }
    });

    let existingOffer = await tx.offer.findFirst({
      where: { storeId: store.id, productId }
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
          lastSeenAt: new Date()
        }
      });
    } else {
      existingOffer = await tx.offer.findFirst({
        where: { storeId: store.id, storeProductId: storeProduct.id }
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
            lastSeenAt: new Date()
          }
        });
      } else {
        const created = await tx.offer.create({
          data: {
            productId,
            storeId: store.id,
            storeProductId: storeProduct.id,
            currentPrice,
            originalPrice: originalPriceVal ?? currentPrice,
            currency: item.currency || "TRY",
            inStock: item.inStock,
            stockQuantity: item.stockQuantity ?? null,
            lastSeenAt: new Date()
          }
        });
        existingOffer = created;
      }
    }

    const offer = await tx.offer.findFirstOrThrow({
      where: { storeId: store.id, productId }
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

  if (logContext && logData) {
    console.log(
      `[feed-import] updated_offer storeProductId=${logData.storeProductId} offerId=${logData.offerId} externalId=${logContext.externalId} productId=${productId} oldPrice=${logData.oldPrice} newPrice=${logData.newPrice} priceHistoryCreated=${logData.priceHistoryCreated} productCacheRecomputed=${logData.productCacheRecomputed}` +
        (logData.lowestPriceCache != null ? ` lowestPriceCache=${logData.lowestPriceCache} offerCountCache=${logData.offerCountCache}` : "")
    );
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

  await prisma.feedImport.update({
    where: { id: feedImport.id },
    data: {
      status: FeedStatus.RUNNING,
      startedAt: new Date()
    }
  });

  try {
    const adapter = getFeedAdapter(feedImport.type as FeedType, feedImport.store.slug);
    const content = await readFeedFile(feedImport.sourceRef ?? "");
    const items = adapter.parse(content);

    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;
    const itemErrors: { index: number; externalId: string; error: string }[] = [];

    const logCtx = (externalId: string) => ({ externalId });

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      try {
        processed += 1;

        let storeProduct: StoreProduct;
        let productIdForOffer: number | null = null;
        let reusedByProductId = false;

        const existingByExternalId = await prisma.storeProduct.findUnique({
          where: {
            storeId_externalId: {
              storeId: feedImport.storeId,
              externalId: item.externalId
            }
          }
        });

        if (existingByExternalId) {
          storeProduct = await prisma.storeProduct.update({
            where: { id: existingByExternalId.id },
            data: {
              title: item.title,
              ean: item.ean ?? existingByExternalId.ean,
              modelNumber: item.modelNumber ?? existingByExternalId.modelNumber,
              specsJson: (item.specs ?? existingByExternalId.specsJson) as Prisma.InputJsonValue,
              url: item.url,
              imageUrl: item.imageUrl ?? existingByExternalId.imageUrl,
              updatedAt: new Date()
            }
          });
          updated += 1;
        } else {
          const existingProduct = await tryFindExistingProductForItem(item);
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
                specsJson: (item.specs ?? existingByStoreProduct.specsJson) as Prisma.InputJsonValue,
                url: item.url,
                imageUrl: item.imageUrl ?? existingByStoreProduct.imageUrl,
                productId: existingProduct.productId,
                matchStatus: MatchStatus.AUTO_MATCHED,
                matchScore: existingProduct.source === "ean" ? 100 : existingProduct.source === "modelNumber" ? 90 : 70,
                matchDetailsJson: { matchedBy: existingProduct.source, reusedStoreProduct: true },
                updatedAt: new Date()
              }
            });
            productIdForOffer = existingProduct.productId;
            reusedByProductId = true;
            updated += 1;
            console.log(
              `[feed-import] reused_store_product externalId=${item.externalId} productId=${existingProduct.productId} by=${existingProduct.source}`
            );
          } else {
            storeProduct = await prisma.storeProduct.create({
              data: {
                storeId: feedImport.storeId,
                externalId: item.externalId,
                title: item.title,
                ean: item.ean,
                modelNumber: item.modelNumber,
                specsJson: (item.specs ?? {}) as Prisma.InputJsonValue,
                url: item.url,
                imageUrl: item.imageUrl,
                matchStatus: MatchStatus.UNMATCHED,
                matchScore: 0
              }
            });
            created += 1;
          }
        }

        if (reusedByProductId && productIdForOffer != null) {
          await upsertOfferAndPriceHistory(storeProduct, productIdForOffer, item, logCtx(item.externalId));
          continue;
        }

        // Matching pipeline (when not already resolved by reuse)
        const matchResult = await matchProductForStoreProduct(storeProduct);

        if (matchResult.productId && matchResult.score >= AUTO_MATCH_THRESHOLD) {
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
          await upsertOfferAndPriceHistory(storeProduct, productIdForOffer, item, logCtx(item.externalId));
          console.log(
            `[feed-import] matched_existing_product externalId=${item.externalId} productId=${matchResult.productId} score=${matchResult.score}`
          );
        } else if (matchResult.productId && matchResult.score >= REVIEW_THRESHOLD) {
          await prisma.storeProduct.update({
            where: { id: storeProduct.id },
            data: {
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
            await prisma.unmatchedProductReview.create({
              data: {
                storeProductId: storeProduct.id,
                suggestedProductId: matchResult.productId,
                status: UnmatchedStatus.PENDING,
                notes: "Otomatik eşleştirme eşiğin altında kaldı, manuel inceleme gerekli."
              }
            });
          } else if (existingPendingReview.suggestedProductId !== matchResult.productId) {
            await prisma.unmatchedProductReview.update({
              where: { id: existingPendingReview.id },
              data: { suggestedProductId: matchResult.productId }
            });
          }
          productIdForOffer = matchResult.productId;
          await upsertOfferAndPriceHistory(storeProduct, productIdForOffer, item, logCtx(item.externalId));
          console.log(
            `[feed-import] matched_existing_product externalId=${item.externalId} productId=${matchResult.productId} score=${matchResult.score} (review)`
          );
        } else if (!matchResult.productId) {
          const existingProduct = await tryFindExistingProductForItem(item);
          if (existingProduct) {
            productIdForOffer = existingProduct.productId;
            await prisma.storeProduct.update({
              where: { id: storeProduct.id },
              data: {
                productId: existingProduct.productId,
                matchStatus: MatchStatus.AUTO_MATCHED,
                matchScore: existingProduct.source === "ean" ? 100 : existingProduct.source === "modelNumber" ? 90 : 70,
                matchDetailsJson: { matchedBy: existingProduct.source }
              }
            });
            await upsertOfferAndPriceHistory(storeProduct, productIdForOffer, item, logCtx(item.externalId));
            console.log(
              `[feed-import] matched_existing_product externalId=${item.externalId} productId=${existingProduct.productId} by=${existingProduct.source}`
            );
          } else {
            const slug = feedProductSlug(feedImport.storeId, item.externalId);
            let newProduct = await prisma.product.findUnique({ where: { slug } });
            if (!newProduct) {
              newProduct = await prisma.product.create({
                data: {
                  name: item.title,
                  slug,
                  ean: item.ean ?? null,
                  modelNumber: item.modelNumber ?? null,
                  mainImageUrl: item.imageUrl ?? null,
                  status: ProductStatus.ACTIVE
                }
              });
            }
            productIdForOffer = newProduct.id;
            await prisma.storeProduct.update({
              where: { id: storeProduct.id },
              data: {
                productId: newProduct.id,
                matchStatus: MatchStatus.AUTO_MATCHED,
                matchScore: 100,
                matchDetailsJson: { createdFromFeed: true }
              }
            });
            await upsertOfferAndPriceHistory(storeProduct, productIdForOffer, item, logCtx(item.externalId));
            console.log(
              `[feed-import] created_new_product externalId=${item.externalId} productId=${newProduct.id} slug=${slug}`
            );
          }
        } else {
          await prisma.storeProduct.update({
            where: { id: storeProduct.id },
            data: {
              matchStatus: MatchStatus.UNMATCHED,
              matchScore: matchResult.score,
              matchDetailsJson: matchResult.details
            }
          });
        }
      } catch (e) {
        errors += 1;
        const errMsg = e instanceof Error ? e.message : String(e);
        itemErrors.push({ index: index + 1, externalId: item.externalId, error: errMsg });
        console.error(`[feed-import] Item failed (externalId=${item.externalId}):`, e);
      }
    }

    await prisma.feedImport.update({
      where: { id: feedImport.id },
      data: {
        status: errors > 0 ? FeedStatus.PARTIAL : FeedStatus.SUCCESS,
        finishedAt: new Date(),
        processedCount: processed,
        createdCount: created,
        updatedCount: updated,
        errorCount: errors,
        errorLog: itemErrors.length > 0 ? JSON.stringify(itemErrors, null, 2) : null
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

