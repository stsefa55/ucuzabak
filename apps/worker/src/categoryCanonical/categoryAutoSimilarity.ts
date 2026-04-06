import {
  AUTO_CATEGORY_MATCH_THRESHOLD,
  normalizeForCategorySimilarityQuery,
  scoreQueryAgainstCanonical
} from "@ucuzabak/shared";
import type { CanonicalCategory } from "./categoryNormalization";

/**
 * İkinci aday bu kadar yakınsa otomatik atama yapılmaz (yanlış kategori riski).
 * Worker içinde tek yerden ayarlanır.
 */
export const AUTO_SIMILARITY_MIN_GAP = 0.1;

/** Bu skorun altındaki ikinci aday “yarışta” sayılmaz. */
export const AUTO_SIMILARITY_RUNNER_UP_FLOOR = 0.62;

/** Üst skorda beraberlik / çok yakın adaylar — farklı kategori id. */
const TOP_TIE_EPS = 0.012;

/** Normalize edilmiş son segment çok kısaysa bigram gürültüsü yüksek; otomatik atama yapılmaz. */
export const AUTO_SIMILARITY_MIN_NORMALIZED_LEN = 5;

/**
 * Yaprak kategori yoksa (edge) tüm ağaç taranır; eşik daha sıkı olmalı.
 */
export const AUTO_SIMILARITY_FULL_TREE_THRESHOLD = 0.82;

/**
 * Yaprak olmayan düğüme otomatik bağlama yalnızca çok yüksek güvende.
 */
export const AUTO_SIMILARITY_PARENT_MIN_SCORE = 0.88;

export type AutoSimilarityMatchResult = {
  categoryId: number;
  score: number;
  gap: number;
  runnerUpScore: number;
  usedLeafPool: boolean;
};

export type AutoSimilarityRejectReason =
  | "empty_segment"
  | "query_too_short"
  | "no_scored_candidates"
  | "below_threshold"
  | "ambiguous_small_gap"
  | "ambiguous_near_tie"
  | "parent_category_low_confidence";

export type AutoSimilarityOutcome =
  | { matched: true; result: AutoSimilarityMatchResult }
  | {
      matched: false;
      reason: AutoSimilarityRejectReason;
      bestScore?: number;
      bestCategoryId?: number;
      runnerUpScore?: number;
      gap?: number;
      effectiveThreshold?: number;
    };

function scoreAll(
  lastSegmentRaw: string,
  pool: CanonicalCategory[]
): { id: number; score: number }[] {
  const last = lastSegmentRaw.trim();
  const rows: { id: number; score: number }[] = [];
  for (const c of pool) {
    const score = scoreQueryAgainstCanonical(last, c.name, c.slug);
    if (score > 0) rows.push({ id: c.id, score });
  }
  return rows;
}

/**
 * Bigram benzerliği — yalnızca güçlü yöntemler başarısız olduktan sonra.
 * Öncelik: yaprak kategoriler; gerekirse tüm ağaç (daha sıkı eşik + üst düğüm koruması).
 */
export function evaluateAutoSimilarityCategoryMatch(
  lastSegmentRaw: string,
  categories: CanonicalCategory[],
  idsWithChildren: Set<number>
): AutoSimilarityOutcome {
  const last = lastSegmentRaw.trim();
  if (!last) return { matched: false, reason: "empty_segment" };

  const qNorm = normalizeForCategorySimilarityQuery(last);
  if (qNorm.length < AUTO_SIMILARITY_MIN_NORMALIZED_LEN) {
    return { matched: false, reason: "query_too_short", bestScore: undefined };
  }

  if (categories.length === 0) {
    return { matched: false, reason: "no_scored_candidates" };
  }

  const leafPool = categories.filter((c) => !idsWithChildren.has(c.id));
  const useLeafOnly = leafPool.length > 0;
  const pool = useLeafOnly ? leafPool : categories;
  const effectiveThreshold = useLeafOnly
    ? AUTO_CATEGORY_MATCH_THRESHOLD
    : AUTO_SIMILARITY_FULL_TREE_THRESHOLD;

  let rows = scoreAll(last, pool);
  if (rows.length === 0) {
    return { matched: false, reason: "no_scored_candidates", effectiveThreshold };
  }

  rows.sort((a, b) => b.score - a.score);
  const best = rows[0]!;
  const runnerUp = rows[1]?.score ?? 0;
  const gap = best.score - runnerUp;

  if (best.score < effectiveThreshold) {
    return {
      matched: false,
      reason: "below_threshold",
      bestScore: best.score,
      bestCategoryId: best.id,
      runnerUpScore: runnerUp,
      gap,
      effectiveThreshold
    };
  }

  if (runnerUp >= AUTO_SIMILARITY_RUNNER_UP_FLOOR && gap < AUTO_SIMILARITY_MIN_GAP) {
    return {
      matched: false,
      reason: "ambiguous_small_gap",
      bestScore: best.score,
      bestCategoryId: best.id,
      runnerUpScore: runnerUp,
      gap,
      effectiveThreshold
    };
  }

  const nearTop = rows.filter((r) => r.score >= best.score - TOP_TIE_EPS);
  if (new Set(nearTop.map((r) => r.id)).size > 1) {
    return {
      matched: false,
      reason: "ambiguous_near_tie",
      bestScore: best.score,
      bestCategoryId: best.id,
      runnerUpScore: runnerUp,
      gap,
      effectiveThreshold
    };
  }

  if (!useLeafOnly && idsWithChildren.has(best.id) && best.score < AUTO_SIMILARITY_PARENT_MIN_SCORE) {
    return {
      matched: false,
      reason: "parent_category_low_confidence",
      bestScore: best.score,
      bestCategoryId: best.id,
      runnerUpScore: runnerUp,
      gap,
      effectiveThreshold
    };
  }

  return {
    matched: true,
    result: {
      categoryId: best.id,
      score: best.score,
      gap,
      runnerUpScore: runnerUp,
      usedLeafPool: useLeafOnly
    }
  };
}

/** Geriye dönük: yalnızca eşleşme veya null. */
export function tryAutoSimilarityCategoryMatch(
  lastSegmentRaw: string,
  categories: CanonicalCategory[],
  idsWithChildren: Set<number>
): AutoSimilarityMatchResult | null {
  const out = evaluateAutoSimilarityCategoryMatch(lastSegmentRaw, categories, idsWithChildren);
  return out.matched ? out.result : null;
}
