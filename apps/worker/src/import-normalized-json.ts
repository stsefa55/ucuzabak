import fs from "node:fs/promises";
import path from "node:path";
import { Prisma, ProductStatus } from "@prisma/client";
import type { ProductMatchReason } from "./productMatching/matchCanonicalProduct";
import {
  lastCategorySegmentForSimilarity,
  normalizeCategoryText,
  normalizeProductTitle,
  slugifyCanonical
} from "@ucuzabak/shared";
import { prisma } from "./prisma";
import { loadCategoryMappingOverrides } from "./categoryCanonical/loadCategoryOverrides";
import {
  createCategoryResolutionContext,
  resolveCategoryTextWithTrace
} from "./categoryCanonical/resolveCategoryText";
import { matchCanonicalProduct, type TitlePrefixCache } from "./productMatching/matchCanonicalProduct";

type NormalizedFeedItem = {
  source?: string;
  externalId: string;
  title: string;
  description?: string | null;
  brand?: string | null;
  mpn?: string | null;
  /** Barkod / GTIN — canonical eşlemede öncelikli */
  ean?: string | null;
  categoryText?: string | null;
  url?: string | null;
  mobileUrl?: string | null;
  image?: string | null;
  images?: string[] | null;
  specsJson?: Record<string, unknown> | null;
  price: number | string;
  currency?: string | null;
  inStock?: boolean | null;
  condition?: string | null;
  merchantId?: string | null;
  boutiqueId?: string | null;
  fetchedAt?: string | null;
};

type ImportStats = {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  productsCreated: number;
  productsMatched: number;
  brandsCreated: number;
  imagesCreated: number;
  offersCreated: number;
  offersUpdated: number;
  priceHistoryCreated: number;
  reasons: Record<string, number>;
};

function parseArg(name: string): string | null {
  const p = `--${name}=`;
  const exact = process.argv.find((v) => v.startsWith(p));
  if (exact) return exact.slice(p.length);
  const idx = process.argv.findIndex((v) => v === `--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

function parsePositionalJsonPath(): string | null {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith("-")) continue;
    if (arg.toLowerCase().endsWith(".json")) return arg;
  }
  return null;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function normalizePrice(value: number | string): Prisma.Decimal | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Prisma.Decimal(n.toFixed(2));
}

function addReason(stats: ImportStats, reason: string) {
  stats.reasons[reason] = (stats.reasons[reason] ?? 0) + 1;
}

function normalizeSpacingForDisplay(input: string): string {
  return String(input ?? "")
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitleForSlugSeed(input: string): string {
  // slug seed: deterministic, spacing ve noktalama sorunlarını stabilize et.
  return normalizeProductTitle(normalizeSpacingForDisplay(input));
}

/** Faz 3: operasyon listesi — import satırı DB’ye yazılmadan atlandıysa kayıt (migration gerekir). */
async function logImportSkip(params: {
  storeId: number;
  feedSource: string;
  externalId?: string | null;
  categoryText?: string | null;
  title?: string | null;
  brand?: string | null;
  reason: string;
  categoryResolutionMethod?: string | null;
  rawPayload?: Record<string, unknown>;
}) {
  try {
    await prisma.importSkippedRow.create({
      data: {
        storeId: params.storeId,
        feedSource: params.feedSource || null,
        externalId: params.externalId || null,
        categoryText: params.categoryText || null,
        normalizedCategoryKey: params.categoryText
          ? normalizeCategoryText(params.categoryText)
          : null,
        title: params.title || null,
        brand: params.brand || null,
        reason: params.reason,
        categoryResolutionMethod: params.categoryResolutionMethod || null,
        rawPayload: params.rawPayload ? (params.rawPayload as Prisma.InputJsonValue) : undefined
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[normalized-import] ImportSkippedRow yazılamadı (${params.reason}): ${msg}`);
  }
}

/** Ürün kaydında tutulacak barkod (yalnızca rakam, 8–14). */
function normalizeEanForStore(ean: string | null | undefined): string | null {
  const d = String(ean ?? "").replace(/\D/g, "");
  if (d.length < 8 || d.length > 14) return null;
  return d;
}

async function readNormalizedItems(filePath: string): Promise<NormalizedFeedItem[]> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Normalized feed JSON array bekleniyordu.");
  }
  return parsed as NormalizedFeedItem[];
}

async function ensureUniqueProductSlug(
  base: string,
  reservedSlugs: Set<string>
): Promise<string> {
  const normalizedBase = base || "urun";
  let candidate = normalizedBase;
  if (!reservedSlugs.has(candidate)) {
    const existing = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!existing) {
      reservedSlugs.add(candidate);
      return candidate;
    }
  }
  for (let i = 2; i <= 9999; i += 1) {
    candidate = `${normalizedBase}-${i}`;
    if (reservedSlugs.has(candidate)) continue;
    const used = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!used) {
      reservedSlugs.add(candidate);
      return candidate;
    }
  }
  candidate = `${normalizedBase}-${Date.now()}`;
  reservedSlugs.add(candidate);
  return candidate;
}

function pickImageUrls(item: NormalizedFeedItem): string[] {
  const urls = new Set<string>();
  if (item.image && String(item.image).trim()) urls.add(String(item.image).trim());
  for (const img of item.images ?? []) {
    const v = String(img ?? "").trim();
    if (v) urls.add(v);
  }
  return Array.from(urls);
}

async function updateProductCache(productId: number) {
  const offers = await prisma.offer.findMany({
    where: { productId, status: "ACTIVE" },
    orderBy: { currentPrice: "asc" }
  });
  if (offers.length === 0) {
    await prisma.product.update({
      where: { id: productId },
      data: {
        offerCountCache: 0,
        lowestPriceCache: null,
        lowestPriceStoreId: null,
        lastPriceUpdatedAt: new Date()
      }
    });
    return;
  }
  const lowest = offers[0];
  await prisma.product.update({
    where: { id: productId },
    data: {
      status: ProductStatus.ACTIVE,
      offerCountCache: offers.length,
      lowestPriceCache: lowest.currentPrice,
      lowestPriceStoreId: lowest.storeId,
      lastPriceUpdatedAt: new Date()
    }
  });
}

async function importFile(filePath: string, storeSlug: string): Promise<ImportStats> {
  const stats: ImportStats = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    productsCreated: 0,
    productsMatched: 0,
    brandsCreated: 0,
    imagesCreated: 0,
    offersCreated: 0,
    offersUpdated: 0,
    priceHistoryCreated: 0,
    reasons: {}
  };

  const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
  if (!store) {
    throw new Error(`Store bulunamadı: ${storeSlug}`);
  }

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, parentId: true }
  });
  const overrideByKey = await loadCategoryMappingOverrides(prisma);
  const categoryCtx = createCategoryResolutionContext(categories, { overrideByKey });

  const existingBrands = await prisma.brand.findMany({ select: { id: true, slug: true } });
  const brandBySlug = new Map(existingBrands.map((b) => [b.slug, b.id]));

  const reservedProductSlugs = new Set<string>();
  const titlePrefixQueryCache: TitlePrefixCache = new Map();
  const productImageUrlCache = new Map<number, Set<string>>();
  const productsNeedingCacheRefresh = new Set<number>();

  async function findOrCreateBrandCached(brandName: string): Promise<number> {
    const slug = slugifyCanonical(brandName);
    const hit = brandBySlug.get(slug);
    if (hit !== undefined) return hit;
    const created = await prisma.brand.create({
      data: {
        name: brandName.trim(),
        slug
      }
    });
    brandBySlug.set(slug, created.id);
    stats.brandsCreated += 1;
    return created.id;
  }

  async function getOrLoadImageUrlSet(productId: number): Promise<Set<string>> {
    let set = productImageUrlCache.get(productId);
    if (!set) {
      const existingImages = await prisma.productImage.findMany({
        where: { productId },
        select: { imageUrl: true }
      });
      set = new Set(existingImages.map((img) => img.imageUrl.trim()));
      productImageUrlCache.set(productId, set);
    }
    return set;
  }

  const items = await readNormalizedItems(filePath);
  const totalItems = items.length;
  const startedMs = Date.now();
  let rowIndex = 0;

  const logProgress = (label: string) => {
    const elapsedSec = ((Date.now() - startedMs) / 1000).toFixed(1);
    console.log(
      `[normalized-import] ${label} row=${rowIndex}/${totalItems} elapsed=${elapsedSec}s ` +
        `imported=${stats.imported} updated=${stats.updated} skipped=${stats.skipped} errors=${stats.errors}`
    );
  };

  for (const item of items) {
    rowIndex += 1;
    if (rowIndex % 100 === 0 || rowIndex % 500 === 0) {
      logProgress("progress");
    }

    try {
      const externalId = String(item.externalId ?? "").trim();
      const rawTitle = String(item.title ?? "");
      const title = normalizeSpacingForDisplay(rawTitle);
      const categoryText = String(item.categoryText ?? "").trim();
      const productUrl = String(item.mobileUrl ?? item.url ?? "").trim();
      const currentPrice = normalizePrice(item.price);
      const inStock = Boolean(item.inStock ?? true);
      const currency = String(item.currency ?? "TRY").trim() || "TRY";
      const feedSource = String(item.source ?? storeSlug).toLowerCase().trim() || "unknown";
      const feedEan = normalizeEanForStore(item.ean);

      if (!externalId || !title) {
        stats.skipped += 1;
        addReason(stats, "missing_externalId_or_title");
        await logImportSkip({
          storeId: store.id,
          feedSource,
          externalId: externalId || null,
          title: title || null,
          brand: String(item.brand ?? "").trim() || null,
          reason: "missing_externalId_or_title",
          rawPayload: { externalId: item.externalId ?? null, title: item.title ?? null }
        });
        continue;
      }
      if (!currentPrice) {
        stats.skipped += 1;
        addReason(stats, "invalid_price");
        await logImportSkip({
          storeId: store.id,
          feedSource,
          externalId,
          title,
          categoryText: categoryText || null,
          brand: String(item.brand ?? "").trim() || null,
          reason: "invalid_price",
          rawPayload: { price: item.price }
        });
        continue;
      }
      if (!categoryText) {
        stats.skipped += 1;
        addReason(stats, "missing_categoryText");
        await logImportSkip({
          storeId: store.id,
          feedSource,
          externalId,
          title,
          brand: String(item.brand ?? "").trim() || null,
          reason: "missing_categoryText"
        });
        continue;
      }

      // --- Canonicalization: kategori (kaynak-bilinçli override + izlenebilir yöntem) ---
      const catRes = resolveCategoryTextWithTrace(categoryCtx, categoryText, feedSource);
      if (process.env.UCZBK_FEED_CATEGORY_DEBUG === "1") {
        const sim = catRes.method === "auto_similarity" ? catRes.similarityScore : undefined;
        const reject = catRes.method === "none" ? catRes.autoSimilarityReject : undefined;
        const normLast = normalizeCategoryText(lastCategorySegmentForSimilarity(categoryText)).slice(0, 120);
        console.log(
          [
            "[import-json]",
            "category",
            `externalId=${externalId}`,
            `method=${catRes.method}`,
            `categoryId=${catRes.categoryId ?? "null"}`,
            `score=${sim != null ? sim.toFixed(3) : "-"}`,
            `norm_last=${JSON.stringify(normLast)}`,
            reject ? `similarity_reject=${reject}` : "",
            `raw=${JSON.stringify(categoryText.slice(0, 100))}`
          ]
            .filter(Boolean)
            .join(" ")
        );
      }
      const categoryId = catRes.categoryId;
      if (!categoryId) {
        stats.skipped += 1;
        addReason(stats, "category_unmappable");
        addReason(stats, `category_method:${catRes.method}`);
        await logImportSkip({
          storeId: store.id,
          feedSource,
          externalId,
          categoryText,
          title,
          brand: String(item.brand ?? "").trim() || null,
          reason: "category_unmappable",
          categoryResolutionMethod: catRes.method,
          rawPayload: { categoryText, method: catRes.method }
        });
        continue;
      }
      addReason(stats, `category_resolved:${catRes.method}`);

      const brandName = String(item.brand ?? "").trim();
      let brandId: number | null = null;
      if (brandName) brandId = await findOrCreateBrandCached(brandName);

      const mpn = String(item.mpn ?? "").trim() || null;
      const specsJson = item.specsJson && typeof item.specsJson === "object" ? item.specsJson : null;

      // --- Canonicalization: ürün eşlemesi (EAN → model → başlık; çoklu bulanıkta birleştirme yok) ---
      const pm = await matchCanonicalProduct(
        prisma,
        {
          brandId,
          ean: item.ean ?? null,
          mpn,
          title, // spacing normalize edilmiş
          specsJson,
          categoryId
        },
        titlePrefixQueryCache
      );

      let product = pm.product;
      let productMatchReason: ProductMatchReason = pm.reason;
      const productConfidence = pm.confidence;

      if (pm.reason === "ean_exact") addReason(stats, "matched_by_ean");
      else if (pm.reason === "brand_model_exact") addReason(stats, "matched_by_model");
      else if (pm.reason === "title_exact") addReason(stats, "matched_by_title_exact");
      else if (pm.reason === "title_single_candidate") addReason(stats, "matched_by_title_single");
      else if (pm.reason === "title_similarity") addReason(stats, "matched_by_title_similarity");
      else if (pm.reason === "spec_overlap") addReason(stats, "matched_by_spec");

      if (!product) {
        const slugSeed = `${brandName || "markasiz"}-${normalizeTitleForSlugSeed(title)}`;
        const baseSlug = slugifyCanonical(slugSeed) || `urun-${externalId}`;
        const uniqueSlug = await ensureUniqueProductSlug(baseSlug, reservedProductSlugs);
        product = await prisma.product.create({
          data: {
            name: title,
            slug: uniqueSlug,
            description: item.description?.trim() || null,
            brandId,
            categoryId,
            modelNumber: mpn,
            ean: feedEan,
            specsJson: specsJson ? (specsJson as Prisma.InputJsonValue) : undefined,
            mainImageUrl: (item.image ?? item.images?.[0] ?? null) || null,
            status: ProductStatus.ACTIVE
          }
        });
        stats.productsCreated += 1;
        addReason(stats, "product_created");
        productMatchReason = "created_new";
        if (brandId && title) {
          const titlePrefix = title.split(/\s+/).slice(0, 4).join(" ");
          titlePrefixQueryCache.delete(`${brandId}|${titlePrefix}`);
        }
      } else {
        stats.productsMatched += 1;
        await prisma.product.update({
          where: { id: product.id },
          data: {
            categoryId: product.categoryId ?? categoryId,
            brandId: product.brandId ?? brandId,
            modelNumber: product.modelNumber ?? mpn,
            ean: product.ean ?? feedEan,
            specsJson:
              (product.specsJson ?? specsJson)
                ? ((product.specsJson ?? specsJson) as Prisma.InputJsonValue)
                : undefined,
            description: product.description ?? (item.description?.trim() || null),
            mainImageUrl: product.mainImageUrl ?? ((item.image ?? item.images?.[0] ?? null) || null)
          }
        });
      }

      const existingStoreProduct = await prisma.storeProduct.findUnique({
        where: {
          storeId_externalId: {
            storeId: store.id,
            externalId
          }
        }
      });

      const storeMatchScore =
        productMatchReason === "created_new" ? 100 : Math.min(100, Math.max(0, Math.round(productConfidence)));

      const matchDetailsJson = {
        version: 2 as const,
        importPipeline: "normalized-json-v2",
        feedSource,
        categoryText,
        categoryResolution: { method: catRes.method, categoryId },
        productMatch: {
          reason: productMatchReason,
          confidence: productConfidence,
          details: pm.details as Prisma.InputJsonValue
        },
        legacy: {
          source: "normalized-json-import",
          merchantId: item.merchantId ?? null,
          boutiqueId: item.boutiqueId ?? null
        }
      } as Prisma.InputJsonValue;

      const storeProduct = existingStoreProduct
        ? await prisma.storeProduct.update({
            where: { id: existingStoreProduct.id },
            data: {
              productId: product.id,
              title,
              ean: feedEan ?? existingStoreProduct.ean,
              modelNumber: mpn ?? existingStoreProduct.modelNumber,
              url: productUrl || existingStoreProduct.url,
              imageUrl: (item.image ?? item.images?.[0] ?? null) || existingStoreProduct.imageUrl,
              matchStatus: "AUTO_MATCHED",
              matchScore: storeMatchScore,
              matchDetailsJson
            }
          })
        : await prisma.storeProduct.create({
            data: {
              storeId: store.id,
              externalId,
              productId: product.id,
              title,
              ean: feedEan,
              modelNumber: mpn,
              specsJson: specsJson ? (specsJson as Prisma.InputJsonValue) : undefined,
              url: productUrl || item.url || "",
              imageUrl: (item.image ?? item.images?.[0] ?? null) || null,
              matchStatus: "AUTO_MATCHED",
              matchScore: storeMatchScore,
              matchDetailsJson
            }
          });

      const existingOffer =
        (await prisma.offer.findFirst({
          where: { storeId: store.id, storeProductId: storeProduct.id }
        })) ??
        (await prisma.offer.findFirst({
          where: { storeId: store.id, productId: product.id }
        }));

      let offerId: number;
      let oldPrice: Prisma.Decimal | null = null;
      if (existingOffer) {
        oldPrice = existingOffer.currentPrice;
        const updatedOffer = await prisma.offer.update({
          where: { id: existingOffer.id },
          data: {
            productId: product.id,
            storeProductId: storeProduct.id,
            currentPrice,
            originalPrice: existingOffer.originalPrice ?? currentPrice,
            currency,
            inStock,
            affiliateUrl: productUrl || existingOffer.affiliateUrl,
            lastSeenAt: new Date()
          }
        });
        offerId = updatedOffer.id;
        stats.offersUpdated += 1;
      } else {
        const createdOffer = await prisma.offer.create({
          data: {
            productId: product.id,
            storeId: store.id,
            storeProductId: storeProduct.id,
            currentPrice,
            originalPrice: currentPrice,
            currency,
            inStock,
            affiliateUrl: productUrl || null,
            lastSeenAt: new Date()
          }
        });
        offerId = createdOffer.id;
        stats.offersCreated += 1;
      }

      const changed = !oldPrice || Math.abs(Number(oldPrice) - Number(currentPrice)) >= 0.005;
      if (changed) {
        await prisma.priceHistory.create({
          data: {
            offerId,
            price: currentPrice,
            currency,
            inStock
          }
        });
        stats.priceHistoryCreated += 1;
      }

      const imageUrls = pickImageUrls(item);
      if (imageUrls.length > 0) {
        const existingSet = await getOrLoadImageUrlSet(product.id);
        let position = existingSet.size;
        for (const url of imageUrls) {
          if (existingSet.has(url)) continue;
          await prisma.productImage.create({
            data: {
              productId: product.id,
              imageUrl: url,
              position
            }
          });
          existingSet.add(url);
          position += 1;
          stats.imagesCreated += 1;
        }
      }

      productsNeedingCacheRefresh.add(product.id);

      if (existingStoreProduct) stats.updated += 1;
      else stats.imported += 1;
    } catch (err) {
      stats.errors += 1;
      const msg = err instanceof Error ? err.message : String(err);
      addReason(stats, `error:${msg.slice(0, 80)}`);
      console.error("[normalized-import] row error:", msg);
    }
  }

  const cacheCount = productsNeedingCacheRefresh.size;
  console.log(`[normalized-import] recomputing offer/price cache for ${cacheCount} distinct products…`);
  let cacheDone = 0;
  for (const productId of productsNeedingCacheRefresh) {
    await updateProductCache(productId);
    cacheDone += 1;
    if (cacheDone % 500 === 0) {
      console.log(`[normalized-import] cache refresh ${cacheDone}/${cacheCount}`);
    }
  }
  logProgress("done");

  return stats;
}

async function moveFileWithReport(
  sourceFile: string,
  targetDir: string,
  status: "processed" | "failed",
  report: ImportStats
) {
  await fs.mkdir(targetDir, { recursive: true });
  const parsed = path.parse(sourceFile);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destFile = path.join(targetDir, `${parsed.name}.${stamp}${parsed.ext}`);
  await fs.rename(sourceFile, destFile);
  const reportFile = `${destFile}.${status}.report.json`;
  await fs.writeFile(reportFile, JSON.stringify(report, null, 2), "utf8");
  console.log(`[normalized-import] file moved -> ${destFile}`);
  console.log(`[normalized-import] report -> ${reportFile}`);
}

async function main() {
  const baseDir = parseArg("base-dir") || process.env.NORMALIZED_IMPORT_BASE_PATH || "/var/www/ucuzabak/imports";
  const storeSlug = parseArg("store") || process.env.NORMALIZED_IMPORT_STORE || "trendyol";
  const explicitFile = parseArg("file") || parsePositionalJsonPath();

  const pendingDir = path.join(baseDir, "pending");
  const processedDir = path.join(baseDir, "processed");
  const failedDir = path.join(baseDir, "failed");

  const files = explicitFile
    ? await (async () => {
        if (path.isAbsolute(explicitFile)) return [explicitFile];
        const asGiven = path.resolve(process.cwd(), explicitFile);
        if (await pathExists(asGiven)) return [asGiven];
        return [path.join(pendingDir, explicitFile)];
      })()
    : (await fs.readdir(pendingDir))
        .filter((f) => f.toLowerCase().endsWith(".json"))
        .map((f) => path.join(pendingDir, f));

  if (files.length === 0) {
    console.log(`[normalized-import] pending file bulunamadı. dir=${pendingDir}`);
    return;
  }

  for (const filePath of files) {
    console.log(`[normalized-import] processing file=${filePath} store=${storeSlug}`);
    try {
      const stats = await importFile(filePath, storeSlug);
      const totalHandled = stats.imported + stats.updated;
      const hasFatal = stats.errors > 0 && totalHandled === 0;
      if (hasFatal) {
        await moveFileWithReport(filePath, failedDir, "failed", stats);
      } else {
        await moveFileWithReport(filePath, processedDir, "processed", stats);
      }
      console.log("[normalized-import] summary:", JSON.stringify(stats, null, 2));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[normalized-import] file failed: ${msg}`);
      await moveFileWithReport(
        filePath,
        failedDir,
        "failed",
        {
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: 1,
          productsCreated: 0,
          productsMatched: 0,
          brandsCreated: 0,
          imagesCreated: 0,
          offersCreated: 0,
          offersUpdated: 0,
          priceHistoryCreated: 0,
          reasons: { fatal: 1 }
        }
      );
    }
  }
}

main()
  .catch((err) => {
    console.error("[normalized-import] fatal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

