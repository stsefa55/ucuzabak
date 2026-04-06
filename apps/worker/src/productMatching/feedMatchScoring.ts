/// <reference path="../types/string-similarity.d.ts" />
import type { Brand, Prisma, PrismaClient, Product } from "@prisma/client";
import {
  brandStemKeyForMatch,
  normalizeBrandText,
  normalizeEanDigits,
  normalizeModelNumberForMatch,
  normalizeProductTitle,
  normalizeProductTitleForMatching,
  slugifyCanonical
} from "@ucuzabak/shared";
import { compareTwoStrings } from "string-similarity";
import type { ParsedFeedItem } from "../feeds/types";
import { categoryMatchSignal } from "./categoryMatchSignals";

const AUTO_MATCH_THRESHOLD = 80;
const AMBIGUITY_MARGIN = 10;
const SCORING_VERSION = "2026-03-30-v3";

export type FeedMatchOptions = {
  brandStemToIds?: Map<string, number[]>;
  categoryParentById?: Map<number, number | null>;
  feedCategoryId?: number | null;
  categoryResolutionMethod?: string | null;
};

export function buildBrandStemIndex(rows: { id: number; name: string }[]): Map<string, number[]> {
  const m = new Map<string, number[]>();
  for (const b of rows) {
    const k = brandStemKeyForMatch(b.name);
    if (k.length < 2) continue;
    const arr = m.get(k) ?? [];
    arr.push(b.id);
    m.set(k, arr);
  }
  return m;
}

export function buildCategoryParentMap(
  rows: { id: number; parentId: number | null }[]
): Map<number, number | null> {
  return new Map(rows.map((r) => [r.id, r.parentId]));
}

/** Admin incelemesi için zengin JSON (PII yok). */
export type FeedMatchDetails = {
  candidateProductId: number;
  winnerScore: number;
  secondBestScore: number | null;
  secondCandidateId: number | null;
  lowConfidence?: boolean;
  ambiguityReason?: string;
  resolvedBrandIdFromFeed: number | null;
  brandTextFromFeed: string | null;
  components: Record<string, unknown>;
  matchSignals?: string[];
  humanSummaryTr?: string;
  scoringVersion?: string;
  reviewSeverity?: "none" | "low_confidence" | "ambiguous_pair" | "weak_match" | "no_candidate";
  adminHintsTr?: string[];
  feedCategory?: { id: number | null; resolutionMethod?: string | null };
  categoryMatch?: Record<string, unknown>;
  duplicatePairRisk?: { candidateIds: [number, number]; noteTr: string };
};

function normalizeBrandNameForMatch(input: string): string {
  let s = normalizeBrandText(input);
  s = s.replace(/\b(as|a\.s\.|aş|ltd|inc|gmbh|sa|corp)\b/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

export function extractBrandTextFromSpecs(specs: unknown): string | null {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return null;
  const o = specs as Record<string, unknown>;
  const keys = ["Marka", "marka", "Brand", "brand", "BRAND", "Üretici", "uretici", "Manufacturer", "manufacturer"];
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

export function mergeItemSpecsWithBrand(
  specs: Record<string, unknown> | undefined,
  brand: string | undefined,
  categoryText?: string | undefined
): Record<string, unknown> {
  const base =
    specs && typeof specs === "object" && !Array.isArray(specs) ? { ...specs } : {};
  if (brand?.trim()) {
    const b = brand.trim();
    if (base.Marka == null && base.marka == null && base.Brand == null && base.brand == null) {
      base.Marka = b;
    }
  }
  const cat = categoryText?.trim();
  if (cat && base.Kategori == null && base.kategori == null && base.Category == null) {
    base.Kategori = cat;
  }
  return base;
}

export function extractCategoryTextFromSpecs(specs: unknown): string | null {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return null;
  const o = specs as Record<string, unknown>;
  const keys = [
    "Kategori",
    "kategori",
    "Category",
    "category",
    "KategoriYolu",
    "kategoriYolu",
    "breadcrumb",
    "Breadcrumb"
  ];
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

export async function resolveBrandIdFromFeedText(
  prisma: PrismaClient,
  brandText: string | null | undefined,
  brandStemToIds?: Map<string, number[]>
): Promise<number | null> {
  if (!brandText || brandText.trim().length < 2) return null;
  const raw = brandText.trim();
  const norm = normalizeBrandNameForMatch(raw);
  if (norm.length < 2) return null;

  const slug = slugifyCanonical(raw);
  if (slug.length >= 2) {
    const bySlug = await prisma.brand.findUnique({ where: { slug } });
    if (bySlug && normalizeBrandNameForMatch(bySlug.name) === norm) return bySlug.id;
    if (bySlug) {
      const bn = normalizeBrandNameForMatch(bySlug.name);
      if (bn === norm || bn.startsWith(norm) || norm.startsWith(bn)) return bySlug.id;
    }
  }

  const first = raw.split(/\s+/)[0]!;
  if (first.length < 2) return null;
  const candidates = await prisma.brand.findMany({
    where: { name: { contains: first, mode: "insensitive" } },
    take: 50
  });

  let best: { id: number; score: number } | null = null;
  for (const b of candidates) {
    const bn = normalizeBrandNameForMatch(b.name);
    if (bn === norm) return b.id;
    const sim = compareTwoStrings(norm, bn);
    if (sim >= 0.92 && (!best || sim > best.score)) best = { id: b.id, score: sim };
    if (bn.startsWith(norm) || norm.startsWith(bn)) {
      const lenDiff = Math.abs(bn.length - norm.length);
      if (lenDiff <= 10 && (!best || 0.95 > best.score)) best = { id: b.id, score: 0.95 };
    }
  }
  if (best != null && best.score >= 0.92) return best.id;

  if (brandStemToIds) {
    const stem = brandStemKeyForMatch(raw);
    const ids = brandStemToIds.get(stem) ?? [];
    if (ids.length === 1) return ids[0]!;
  }

  return null;
}

/** Başlıktan anlamlı arama parçası (gürültü kelimeler `normalizeProductTitleForMatching` ile zaten atılır). */
function titleSearchNeedle(title: string): string {
  const t = normalizeProductTitleForMatching(title);
  const parts = t.split(/\s+/).filter((w: string) => w.length >= 3);
  if (parts.length === 0) {
    const fallback = normalizeProductTitle(title)
      .split(/\s+/)
      .find((w: string) => w.length >= 3);
    return fallback ?? normalizeProductTitle(title).slice(0, 12);
  }
  return parts.slice(0, 3).join(" ").slice(0, 80);
}

type ProductWithBrand = Product & { brand: Brand | null };

function specOverlapScore(
  storeSpecs: Prisma.JsonValue | null,
  productSpecs: Prisma.JsonValue | null
): { points: number; matchedKeys: string[] } {
  if (!storeSpecs || !productSpecs || typeof storeSpecs !== "object" || Array.isArray(storeSpecs)) {
    return { points: 0, matchedKeys: [] };
  }
  if (typeof productSpecs !== "object" || Array.isArray(productSpecs)) {
    return { points: 0, matchedKeys: [] };
  }
  const s = storeSpecs as Record<string, unknown>;
  const p = productSpecs as Record<string, unknown>;
  const matchedKeys: string[] = [];
  let points = 0;
  for (const key of Object.keys(s)) {
    const sv = s[key];
    const pv = p[key];
    if (pv === undefined) continue;
    const a = String(sv ?? "")
      .toLocaleLowerCase("tr-TR")
      .replace(/\s+/g, " ")
      .trim();
    const b = String(pv ?? "")
      .toLocaleLowerCase("tr-TR")
      .replace(/\s+/g, " ")
      .trim();
    if (a.length > 0 && a === b) {
      matchedKeys.push(key);
      points += 2;
    }
    if (points >= 8) break;
  }
  return { points: Math.min(points, 8), matchedKeys };
}

function buildHumanSummaryTr(signals: string[]): string {
  const parts: string[] = [];
  if (signals.includes("ean_digits_match")) {
    parts.push("Barkod (EAN) rakamları ürün kaydıyla birebir eşleşti");
  } else if (signals.includes("ean_raw_match")) {
    parts.push("Barkod alanı aynı metinle eşleşti");
  }
  if (signals.includes("model_normalized_exact")) {
    parts.push("Model kodu normalize edildiğinde tamamen aynı");
  } else if (signals.includes("model_fuzzy_similar")) {
    parts.push("Model kodu yüksek ölçüde benzer");
  }
  if (signals.includes("model_aligned_with_ean")) {
    parts.push("EAN ile birlikte model kodu da tutarlı");
  }
  if (signals.includes("brand_id_match")) {
    parts.push("Feed’den çözülen marka ile ürünün marka kimliği aynı");
  }
  if (signals.includes("brand_mismatch_penalty")) {
    parts.push("Feed markası ile ürün markası çelişiyor (yanlış pozitif riski)");
  }
  if (signals.includes("hybrid_brand_model_title")) {
    parts.push("EAN yokken marka + model + başlık birlikte güçlü sinyal verdi");
  }
  if (signals.includes("title_similarity")) {
    parts.push("Normalize başlık benzerliği katkıda bulundu");
  }
  if (signals.includes("spec_overlap")) {
    parts.push("Özellik (spec) alanlarında örtüşme var");
  }
  for (const s of signals) {
    if (!s.startsWith("category:")) continue;
    const lab = s.slice("category:".length);
    const map: Record<string, string> = {
      category_exact_leaf: "Kategori yolu tam uyumlu (aynı yaprak)",
      product_descendant_of_feed_category: "Ürün kategorisi feed kategorisinin alt dalında",
      feed_descendant_of_product_category: "Feed kategorisi ürün kategorisi ile üst-alt ilişkide",
      category_shared_branch: "Kategori ağacında ortak dal var",
      category_unrelated_tree: "Kategori ağaçları ilişkisiz (çapraz kategori yanlış pozitif riski)",
      category_skipped_missing: "Kategori sinyali atlandı (feed veya ürün tarafında eksik)"
    };
    parts.push(map[lab] ?? `Kategori: ${lab}`);
  }
  if (parts.length === 0) return "Belirgin sinyal listelenemedi; aday başlık/spec üzerinden seçildi.";
  return parts.join("; ") + ".";
}

function buildAdminHintsTr(args: {
  lowConfidence: boolean;
  ambiguityReason?: string;
  winnerScore: number;
  secondBestScore: number | null;
  hasEanOnStore: boolean;
}): string[] {
  const out: string[] = [];
  if (args.lowConfidence) {
    out.push(
      "Düşük güven: birinci ve ikinci aday skorları birbirine çok yakın veya belirsizlik nedeniyle otomatik eşik altına indirildi."
    );
  }
  if (args.ambiguityReason === "tied_scores") {
    out.push("İki aday aynı skoru aldı; yanlış birleştirmeyi önlemek için manuel seçim gerekir.");
  }
  if (!args.hasEanOnStore && args.winnerScore >= 50 && args.winnerScore < AUTO_MATCH_THRESHOLD) {
    out.push("Barkod yok; önerilen eşleşme inceleme eşiğinde — model ve markayı admin panelinde doğrulayın.");
  }
  if (args.secondBestScore != null && args.winnerScore - args.secondBestScore < 5) {
    out.push(`İkinci aday skoru: ${args.secondBestScore} — neredeyse eşit güçte alternatif var.`);
  }
  return out;
}

function applyCategoryToScore(
  baseScore: number,
  signals: string[],
  components: Record<string, unknown>,
  productCategoryId: number | null,
  matchOpts: FeedMatchOptions | undefined,
  suppressCategoryPenalty: boolean
): number {
  const parentById = matchOpts?.categoryParentById;
  const feedCategoryId = matchOpts?.feedCategoryId ?? null;
  if (!parentById || feedCategoryId == null) {
    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }
  const cm = categoryMatchSignal(feedCategoryId, productCategoryId, parentById);
  let pts = cm.points;
  if (suppressCategoryPenalty && pts < 0) pts = 0;
  signals.push(`category:${cm.label}`);
  components.categoryMatch = {
    label: cm.label,
    pointsApplied: pts,
    feedCategoryId: cm.feedCategoryId,
    productCategoryId: cm.productCategoryId,
    detail: cm.detail
  };
  return Math.max(0, Math.min(100, Math.round(baseScore + pts)));
}

/**
 * Ağırlıklar: EAN > model > marka > başlık (fallback) > spec + kategori uyumu.
 * Yanlış pozitif: marka çelişkisi (EAN yokken) ceza; kategori ağacı uyumsuzluğu ceza.
 */
function scoreCandidate(
  args: {
    storeEan: string | null;
    storeModelRaw: string | null;
    storeTitle: string;
    storeSpecs: Prisma.JsonValue | null;
    resolvedBrandId: number | null;
    product: ProductWithBrand;
  },
  matchOpts?: FeedMatchOptions
): { score: number; components: Record<string, unknown>; signals: string[] } {
  const { storeEan, storeModelRaw, storeTitle, storeSpecs, resolvedBrandId, product } = args;

  const eanDigitsStore = normalizeEanDigits(storeEan);
  const eanDigitsProduct = normalizeEanDigits(product.ean);
  const normStoreModel = normalizeModelNumberForMatch(storeModelRaw);
  const normProductModel = normalizeModelNumberForMatch(product.modelNumber);

  const normStoreTitle = normalizeProductTitleForMatching(storeTitle);
  const normProductTitle = normalizeProductTitleForMatching(product.name);
  const titleSim =
    normStoreTitle.length > 0 && normProductTitle.length > 0
      ? compareTwoStrings(normStoreTitle, normProductTitle)
      : 0;

  const signals: string[] = [];
  const components: Record<string, unknown> = {};

  const eanStrong =
    Boolean(eanDigitsStore) && Boolean(eanDigitsProduct) && eanDigitsStore === eanDigitsProduct;
  const eanRaw =
    !eanStrong && Boolean(storeEan) && Boolean(product.ean) && storeEan!.trim() === product.ean!.trim();

  if (eanStrong) {
    signals.push("ean_digits_match");
    let score = 82 + Math.min(18, Math.round(titleSim * 18));
    components.ean = { match: "digits", base: 82, titleAddon: Math.min(18, Math.round(titleSim * 18)), digits: eanDigitsStore };
    components.title = {
      similarity: Number(titleSim.toFixed(4)),
      points: Math.min(18, Math.round(titleSim * 18)),
      normStore: normStoreTitle,
      normProduct: normProductTitle
    };
    signals.push("title_similarity");

    if (normStoreModel.length >= 3 && normProductModel.length >= 3 && normStoreModel === normProductModel) {
      score += 6;
      signals.push("model_aligned_with_ean");
      components.model = { match: "normalized_exact", bonusWithEan: 6, normalized: normStoreModel };
    } else if (normStoreModel.length >= 3 && normProductModel.length >= 3) {
      const mSim = compareTwoStrings(normStoreModel, normProductModel);
      components.model = { similarity: Number(mSim.toFixed(4)), points: 0 };
    } else {
      components.model = { match: false };
    }

    if (resolvedBrandId != null && product.brandId != null && product.brandId === resolvedBrandId) {
      score += 6;
      signals.push("brand_id_match");
      components.brand = { match: true, productBrandId: product.brandId, points: 6 };
    } else {
      components.brand = {
        resolvedFromFeed: resolvedBrandId,
        productBrandId: product.brandId ?? null,
        note: "EAN güçlü; marka çelişkisinde ceza uygulanmadı"
      };
    }

    const spec = specOverlapScore(storeSpecs, product.specsJson);
    score += spec.points;
    components.specs = { matchedKeys: spec.matchedKeys, points: spec.points };
    if (spec.points > 0) signals.push("spec_overlap");

    score = applyCategoryToScore(score, signals, components, product.categoryId ?? null, matchOpts, true);
    return { score, components, signals };
  }

  if (eanRaw) {
    signals.push("ean_raw_match");
    let score = 74 + Math.min(16, Math.round(titleSim * 16));
    components.ean = { match: "raw_exact", base: 74, titleAddon: Math.min(16, Math.round(titleSim * 16)) };
    components.title = {
      similarity: Number(titleSim.toFixed(4)),
      points: Math.min(16, Math.round(titleSim * 16)),
      normStore: normStoreTitle,
      normProduct: normProductTitle
    };
    signals.push("title_similarity");

    if (normStoreModel.length >= 3 && normProductModel.length >= 3 && normStoreModel === normProductModel) {
      score += 8;
      signals.push("model_aligned_with_ean");
      components.model = { match: "normalized_exact", bonus: 8, normalized: normStoreModel };
    } else {
      components.model = { match: false };
    }

    if (resolvedBrandId != null && product.brandId != null && product.brandId === resolvedBrandId) {
      score += 8;
      signals.push("brand_id_match");
      components.brand = { match: true, points: 8 };
    } else if (resolvedBrandId != null && product.brandId != null) {
      score -= 10;
      signals.push("brand_mismatch_penalty");
      components.brand = { penalty: 10, feedResolvedBrandId: resolvedBrandId, productBrandId: product.brandId };
    } else {
      components.brand = { resolvedFromFeed: resolvedBrandId, productBrandId: product.brandId ?? null };
    }

    const spec = specOverlapScore(storeSpecs, product.specsJson);
    score += spec.points;
    components.specs = { matchedKeys: spec.matchedKeys, points: spec.points };
    if (spec.points > 0) signals.push("spec_overlap");

    score = applyCategoryToScore(score, signals, components, product.categoryId ?? null, matchOpts, true);
    return { score, components, signals };
  }

  components.ean = { match: false, note: "ean_absent_or_mismatch" };

  let score = 0;

  if (normStoreModel.length >= 3 && normProductModel.length >= 3) {
    if (normStoreModel === normProductModel) {
      score += 44;
      signals.push("model_normalized_exact");
      components.model = { match: "normalized_exact", points: 44, normalized: normStoreModel };
    } else {
      const mSim = compareTwoStrings(normStoreModel, normProductModel);
      if (mSim >= 0.88) {
        const mp = Math.round(26 * mSim);
        score += mp;
        signals.push("model_fuzzy_similar");
        components.model = { similarity: Number(mSim.toFixed(4)), points: mp };
      } else {
        components.model = { similarity: Number(mSim.toFixed(4)), points: 0 };
      }
    }
  } else {
    components.model = { match: false };
  }

  if (resolvedBrandId != null && product.brandId != null) {
    if (product.brandId === resolvedBrandId) {
      score += 20;
      signals.push("brand_id_match");
      components.brand = { match: true, productBrandId: product.brandId, points: 20 };
    } else {
      score -= 26;
      signals.push("brand_mismatch_penalty");
      components.brand = {
        match: false,
        feedResolvedBrandId: resolvedBrandId,
        productBrandId: product.brandId,
        penalty: 26
      };
    }
  } else if (resolvedBrandId != null && product.brandId == null) {
    components.brand = { match: "unknown_on_product", feedResolvedBrandId: resolvedBrandId };
  } else {
    components.brand = { resolvedFromFeed: resolvedBrandId, productBrandId: product.brandId ?? null };
  }

  if (
    resolvedBrandId != null &&
    product.brandId === resolvedBrandId &&
    normStoreModel.length >= 4 &&
    normStoreModel === normProductModel &&
    titleSim >= 0.5
  ) {
    score += 14;
    signals.push("hybrid_brand_model_title");
    components.hybrid = {
      bonus: 14,
      reason: "no_ean_brand_model_title",
      titleSim: Number(titleSim.toFixed(4))
    };
  }

  const titlePts = Math.min(24, Math.round(titleSim * 24));
  score += titlePts;
  signals.push("title_similarity");
  components.title = {
    similarity: Number(titleSim.toFixed(4)),
    points: titlePts,
    normStore: normStoreTitle,
    normProduct: normProductTitle
  };

  const spec = specOverlapScore(storeSpecs, product.specsJson);
  score += spec.points;
  components.specs = { matchedKeys: spec.matchedKeys, points: spec.points };
  if (spec.points > 0) signals.push("spec_overlap");

  score = applyCategoryToScore(score, signals, components, product.categoryId ?? null, matchOpts, false);
  return { score, components, signals };
}

export async function collectProductMatchCandidates(
  prisma: PrismaClient,
  args: {
    title: string;
    ean: string | null;
    modelNumber: string | null;
    specsJson: Prisma.JsonValue | null;
    brandText: string | null;
  },
  matchOpts?: FeedMatchOptions
): Promise<{ products: ProductWithBrand[]; resolvedBrandId: number | null; brandText: string | null }> {
  const { title, ean, modelNumber, specsJson } = args;
  const brandText = args.brandText ?? extractBrandTextFromSpecs(specsJson);
  const resolvedBrandId = await resolveBrandIdFromFeedText(prisma, brandText, matchOpts?.brandStemToIds);

  const idSet = new Set<number>();
  const eanDigits = normalizeEanDigits(ean);
  const rawEan = ean?.trim() || null;

  if (eanDigits) {
    const byEan = await prisma.product.findMany({
      where: {
        OR: [{ ean: eanDigits }, ...(rawEan && rawEan !== eanDigits ? [{ ean: rawEan }] : [])]
      },
      take: 30
    });
    for (const p of byEan) idSet.add(p.id);
  }

  const normModel = normalizeModelNumberForMatch(modelNumber);
  if (normModel.length >= 4) {
    const rows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM "Product"
      WHERE LENGTH(regexp_replace(lower(COALESCE("modelNumber", '')), '[^a-z0-9]', '', 'g')) >= 4
        AND regexp_replace(lower(COALESCE("modelNumber", '')), '[^a-z0-9]', '', 'g') = ${normModel}
      LIMIT 60
    `;
    for (const r of rows) idSet.add(r.id);
  }

  const needle = titleSearchNeedle(title);
  if (needle.length >= 3) {
    const whereBrand =
      resolvedBrandId != null
        ? {
            brandId: resolvedBrandId,
            name: { contains: needle.slice(0, 60), mode: "insensitive" as const }
          }
        : { name: { contains: needle.slice(0, 60), mode: "insensitive" as const } };

    const byTitle = await prisma.product.findMany({
      where: whereBrand,
      take: resolvedBrandId != null ? 80 : 55
    });
    for (const p of byTitle) idSet.add(p.id);
  }

  const feedCat = matchOpts?.feedCategoryId;
  if (feedCat != null && needle.length >= 3) {
    const bySameCategory = await prisma.product.findMany({
      where: {
        categoryId: feedCat,
        name: { contains: needle.slice(0, 50), mode: "insensitive" },
        ...(resolvedBrandId != null ? { brandId: resolvedBrandId } : {})
      },
      take: 45
    });
    for (const p of bySameCategory) idSet.add(p.id);
  }

  if (resolvedBrandId != null && idSet.size < 12 && normModel.length >= 3) {
    const byBrandModel = await prisma.product.findMany({
      where: {
        brandId: resolvedBrandId,
        modelNumber: { not: null, contains: normModel.slice(0, 12), mode: "insensitive" }
      },
      take: 40
    });
    for (const p of byBrandModel) {
      if (normalizeModelNumberForMatch(p.modelNumber) === normModel) idSet.add(p.id);
    }
  }

  const ids = [...idSet];
  if (ids.length === 0) {
    return { products: [], resolvedBrandId, brandText };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { brand: true },
    take: 120
  });

  return { products, resolvedBrandId, brandText };
}

export async function matchStoreProductToCanonical(
  prisma: PrismaClient,
  storeProduct: {
    title: string;
    ean: string | null;
    modelNumber: string | null;
    specsJson: Prisma.JsonValue | null;
  },
  matchOpts?: FeedMatchOptions
): Promise<{ productId: number | null; score: number; details: Prisma.JsonObject }> {
  const brandText = extractBrandTextFromSpecs(storeProduct.specsJson);
  const { products, resolvedBrandId } = await collectProductMatchCandidates(
    prisma,
    {
      title: storeProduct.title,
      ean: storeProduct.ean,
      modelNumber: storeProduct.modelNumber,
      specsJson: storeProduct.specsJson,
      brandText
    },
    matchOpts
  );

  if (products.length === 0) {
    return {
      productId: null,
      score: 0,
      details: {
        candidateProductId: 0,
        winnerScore: 0,
        secondBestScore: null,
        secondCandidateId: null,
        resolvedBrandIdFromFeed: resolvedBrandId,
        brandTextFromFeed: brandText,
        components: {},
        reason: "no_candidates",
        scoringVersion: SCORING_VERSION,
        reviewSeverity: "no_candidate" as const,
        humanSummaryTr: "Veritabanında uygun aday ürün bulunamadı (EAN/model/başlık taraması boş).",
        feedCategory: {
          id: matchOpts?.feedCategoryId ?? null,
          resolutionMethod: matchOpts?.categoryResolutionMethod ?? null
        },
        adminHintsTr: [
          "Feed’de barkod veya model kodu eksikse önce mağaza verisini zenginleştirin; gerekirse manuel ürün oluşturun."
        ]
      } as unknown as Prisma.JsonObject
    };
  }

  const scored = products.map((product) => {
    const { score, components, signals } = scoreCandidate(
      {
        storeEan: storeProduct.ean,
        storeModelRaw: storeProduct.modelNumber,
        storeTitle: storeProduct.title,
        storeSpecs: storeProduct.specsJson,
        resolvedBrandId,
        product
      },
      matchOpts
    );
    return { product, score, components, signals };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]!;
  const second = scored[1];

  let winnerScore = best.score;
  let lowConfidence = false;
  let ambiguityReason: string | undefined;

  if (second && winnerScore - second.score < AMBIGUITY_MARGIN && winnerScore < 95) {
    lowConfidence = true;
    ambiguityReason = "close_second_score";
    winnerScore = Math.min(winnerScore, AUTO_MATCH_THRESHOLD - 1);
  }

  if (second && second.score === winnerScore && winnerScore >= AUTO_MATCH_THRESHOLD) {
    lowConfidence = true;
    ambiguityReason = "tied_scores";
    winnerScore = AUTO_MATCH_THRESHOLD - 1;
  }

  const hasEanOnStore = Boolean(normalizeEanDigits(storeProduct.ean));
  let reviewSeverity: NonNullable<FeedMatchDetails["reviewSeverity"]> = "none";
  if (lowConfidence) reviewSeverity = "low_confidence";
  else if (ambiguityReason === "tied_scores" || ambiguityReason === "close_second_score") {
    reviewSeverity = "ambiguous_pair";
  } else if (winnerScore >= 50 && winnerScore < AUTO_MATCH_THRESHOLD) {
    reviewSeverity = "weak_match";
  }

  const adminHintsTr = [...buildAdminHintsTr({
    lowConfidence,
    ambiguityReason,
    winnerScore,
    secondBestScore: second ? second.score : null,
    hasEanOnStore
  })];

  let duplicatePairRisk: FeedMatchDetails["duplicatePairRisk"];
  if (
    second &&
    winnerScore - second.score < 8 &&
    !best.signals.includes("ean_digits_match")
  ) {
    duplicatePairRisk = {
      candidateIds: [best.product.id, second.product.id],
      noteTr:
        "İki canonical ürün skoru çok yakın; aynı fiziksel SKU için çift kayıt ihtimali — admin birleştirmesini değerlendirin."
    };
    if (!adminHintsTr.some((h) => h.includes("çift kayıt"))) {
      adminHintsTr.push(duplicatePairRisk.noteTr);
    }
  }

  const catComp = best.components.categoryMatch as Record<string, unknown> | undefined;

  const details: FeedMatchDetails = {
    candidateProductId: best.product.id,
    winnerScore,
    secondBestScore: second ? second.score : null,
    secondCandidateId: second ? second.product.id : null,
    lowConfidence,
    ambiguityReason,
    resolvedBrandIdFromFeed: resolvedBrandId,
    brandTextFromFeed: brandText,
    feedCategory: {
      id: matchOpts?.feedCategoryId ?? null,
      resolutionMethod: matchOpts?.categoryResolutionMethod ?? null
    },
    categoryMatch: catComp,
    duplicatePairRisk,
    matchSignals: best.signals,
    humanSummaryTr: buildHumanSummaryTr(best.signals),
    scoringVersion: SCORING_VERSION,
    reviewSeverity,
    adminHintsTr,
    components: {
      ...best.components,
      winnerProductId: best.product.id,
      winnerNameSample: best.product.name.slice(0, 120),
      belowReviewThresholdCandidate:
        winnerScore < 50 ? { productId: best.product.id, score: best.score } : undefined
    }
  };

  const productIdForPipeline = winnerScore >= 50 ? best.product.id : null;

  return {
    productId: productIdForPipeline,
    score: winnerScore,
    details: details as unknown as Prisma.JsonObject
  };
}

export type ExistingProductSource = "ean" | "brand_model" | "modelNumber" | "title" | "brand_title";

export async function tryFindExistingProductForFeedItem(
  prisma: PrismaClient,
  item: ParsedFeedItem,
  matchOpts?: FeedMatchOptions
): Promise<{ productId: number; source: ExistingProductSource } | null> {
  const brandHint = item.brand?.trim() || extractBrandTextFromSpecs(item.specs);
  const brandId = await resolveBrandIdFromFeedText(prisma, brandHint, matchOpts?.brandStemToIds);

  const eanDigits = normalizeEanDigits(item.ean);
  const rawEan = item.ean?.trim() || null;
  if (eanDigits) {
    const byEan = await prisma.product.findFirst({
      where: {
        OR: [{ ean: eanDigits }, ...(rawEan && rawEan !== eanDigits ? [{ ean: rawEan }] : [])]
      }
    });
    if (byEan && normalizeEanDigits(byEan.ean) === eanDigits) {
      return { productId: byEan.id, source: "ean" };
    }
  }

  const normModel = normalizeModelNumberForMatch(item.modelNumber);
  if (!eanDigits && brandId != null && normModel.length >= 4) {
    const brandScoped = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM "Product"
      WHERE "brandId" = ${brandId}
        AND LENGTH(regexp_replace(lower(COALESCE("modelNumber", '')), '[^a-z0-9]', '', 'g')) >= 4
        AND regexp_replace(lower(COALESCE("modelNumber", '')), '[^a-z0-9]', '', 'g') = ${normModel}
      LIMIT 5
    `;
    const bid = brandScoped[0]?.id;
    if (bid != null) {
      return { productId: bid, source: "brand_model" };
    }
  }

  if (normModel.length >= 4) {
    const rows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM "Product"
      WHERE LENGTH(regexp_replace(lower(COALESCE("modelNumber", '')), '[^a-z0-9]', '', 'g')) >= 4
        AND regexp_replace(lower(COALESCE("modelNumber", '')), '[^a-z0-9]', '', 'g') = ${normModel}
      LIMIT 20
    `;
    const candidates = await prisma.product.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      include: { brand: true }
    });
    const ranked = candidates
      .map((p) => ({
        p,
        brandBonus: brandId != null && p.brandId === brandId ? 1 : 0
      }))
      .sort((a, b) => b.brandBonus - a.brandBonus);
    const pick = ranked[0]?.p;
    if (pick) return { productId: pick.id, source: "modelNumber" };
  }

  if (brandId) {
    const needle = titleSearchNeedle(item.title);
    if (needle.length >= 3) {
      const feedCat = matchOpts?.feedCategoryId;
      let products = await prisma.product.findMany({
        where: {
          brandId,
          ...(feedCat != null ? { categoryId: feedCat } : {}),
          name: { contains: needle.slice(0, 50), mode: "insensitive" }
        },
        take: 35
      });
      if (products.length === 0 && feedCat != null) {
        products = await prisma.product.findMany({
          where: { brandId, name: { contains: needle.slice(0, 50), mode: "insensitive" } },
          take: 35
        });
      }
      const normItem = normalizeProductTitleForMatching(item.title);
      let best: { id: number; sim: number } | null = null;
      for (const p of products) {
        const sim = compareTwoStrings(normItem, normalizeProductTitleForMatching(p.name));
        if (sim >= 0.58 && (!best || sim > best.sim)) best = { id: p.id, sim };
      }
      if (best && best.sim >= 0.58) {
        return { productId: best.id, source: "brand_title" };
      }
    }
  }

  const titleWords = normalizeProductTitle(item.title)
    .split(/\s+/)
    .filter((w: string) => w.length > 2)
    .slice(0, 3)
    .join(" ");
  if (titleWords.length < 3) return null;

  const byTitle = await prisma.product.findMany({
    where: { name: { contains: titleWords, mode: "insensitive" } },
    take: 24
  });
  if (byTitle.length === 0) return null;

  const normalizedItemTitle = normalizeProductTitleForMatching(item.title);
  let best: { productId: number; score: number } | null = null;
  for (const p of byTitle) {
    const sim = compareTwoStrings(normalizedItemTitle, normalizeProductTitleForMatching(p.name));
    if (sim >= 0.52 && (!best || sim > best.score)) {
      best = { productId: p.id, score: sim };
    }
  }
  return best ? { productId: best.productId, source: "title" } : null;
}
