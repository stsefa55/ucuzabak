import { canonicalSlugify } from "./canonicalSlugify";
import { CATEGORY_PHRASE_ALIASES } from "./canonicalAliases";
import { tryKeywordRollupSlug } from "./categoryKeywordRollup";
import { evaluateAutoSimilarityCategoryMatch } from "./categoryAutoSimilarity";
import { buildCategoryOverrideKey } from "./overrideKeys";
import {
  type CanonicalCategory,
  normalizeCategoryPhrase,
  normalizeForCategoryText
} from "./categoryNormalization";

export type { CanonicalCategory } from "./categoryNormalization";
export { normalizeForCategoryText, normalizeCategoryPhrase } from "./categoryNormalization";

function splitSegments(categoryText: string): string[] {
  return categoryText
    .split(/[>,/\\|,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildByParent(categories: CanonicalCategory[]): Map<number | null, CanonicalCategory[]> {
  const byParent = new Map<number | null, CanonicalCategory[]>();
  for (const c of categories) {
    const arr = byParent.get(c.parentId) ?? [];
    arr.push(c);
    byParent.set(c.parentId, arr);
  }
  return byParent;
}

function buildSlugMap(categories: CanonicalCategory[]): Map<string, CanonicalCategory> {
  const m = new Map<string, CanonicalCategory>();
  for (const c of categories) {
    m.set(c.slug, c);
  }
  return m;
}

function buildIdsWithChildren(categories: CanonicalCategory[]): Set<number> {
  const s = new Set<number>();
  for (const c of categories) {
    if (c.parentId !== null) s.add(c.parentId);
  }
  return s;
}

function disambiguateBySegmentSlug(segment: string, candidates: CanonicalCategory[]): CanonicalCategory | null {
  if (candidates.length <= 1) return candidates[0] ?? null;
  const segSlug = canonicalSlugify(segment);
  if (segSlug.length < 2) return null;
  const narrowed = candidates.filter((c) => c.slug === segSlug || c.slug.endsWith(`-${segSlug}`));
  if (narrowed.length === 1) return narrowed[0]!;
  return null;
}

function matchSegmentToChild(segment: string, candidates: CanonicalCategory[]): CanonicalCategory | null {
  if (candidates.length === 0) return null;

  const n = normalizeForCategoryText(segment);
  if (n.length < 2) return null;

  const segSlug = canonicalSlugify(segment);

  const bySlug = candidates.filter((c) => c.slug === segSlug);
  if (bySlug.length === 1) return bySlug[0];
  if (bySlug.length > 1) return disambiguateBySegmentSlug(segment, bySlug);

  const exactName = candidates.filter((c) => normalizeForCategoryText(c.name) === n);
  if (exactName.length === 1) return exactName[0];
  if (exactName.length > 1) return disambiguateBySegmentSlug(segment, exactName);

  const prefix = candidates.filter((c) => {
    const cn = normalizeForCategoryText(c.name);
    return cn === n || cn.startsWith(`${n} `);
  });
  if (prefix.length === 1) return prefix[0];
  if (prefix.length > 1) return disambiguateBySegmentSlug(segment, prefix);

  if (n.length >= 4) {
    const contains = candidates.filter((c) => normalizeForCategoryText(c.name).includes(n));
    if (contains.length === 1) return contains[0];
  }

  return null;
}

function resolveAliasSlug(phraseNorm: string, slugMap: Map<string, CanonicalCategory>): number | null {
  const slug = CATEGORY_PHRASE_ALIASES[phraseNorm];
  if (!slug) return null;
  const cat = slugMap.get(slug);
  return cat?.id ?? null;
}

function preferLeafIfUnique(
  candidates: CanonicalCategory[],
  idsWithChildren: Set<number>
): CanonicalCategory | null {
  if (candidates.length === 0) return null;
  const leaves = candidates.filter((c) => !idsWithChildren.has(c.id));
  if (leaves.length === 1) return leaves[0]!;
  return null;
}

function matchGlobal(
  segment: string,
  categories: CanonicalCategory[],
  idsWithChildren: Set<number>
): CanonicalCategory | null {
  const n = normalizeForCategoryText(segment);
  if (n.length < 2) return null;

  const segSlug = canonicalSlugify(segment);

  const bySlug = categories.filter((c) => c.slug === segSlug);
  if (bySlug.length === 1) return bySlug[0];
  if (bySlug.length > 1) return disambiguateBySegmentSlug(segment, bySlug);

  const exactName = categories.filter((c) => normalizeForCategoryText(c.name) === n);
  if (exactName.length === 1) return exactName[0];
  if (exactName.length > 1) {
    const d = disambiguateBySegmentSlug(segment, exactName);
    if (d) return d;
  }

  const prefix = categories.filter((c) => {
    const cn = normalizeForCategoryText(c.name);
    return cn === n || cn.startsWith(`${n} `);
  });
  if (prefix.length === 1) return prefix[0];
  if (prefix.length > 1) {
    const d = disambiguateBySegmentSlug(segment, prefix);
    if (d) return d;
    const leaf = preferLeafIfUnique(prefix, idsWithChildren);
    if (leaf) return leaf;
  }

  if (n.length >= 4) {
    const contains = categories.filter((c) => normalizeForCategoryText(c.name).includes(n));
    if (contains.length === 1) return contains[0];
    if (contains.length > 1) {
      const leaf = preferLeafIfUnique(contains, idsWithChildren);
      if (leaf) return leaf;
    }
  }

  return null;
}

function stripFeedNoise(norm: string): string {
  return norm
    .replace(/\bbuyuk beden\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Kategori çözüm yöntemi — import istatistikleri ve denetim için. */
export type CategoryResolutionMethod =
  | "manual_override_full"
  | "manual_override_last"
  | "canonical_alias_full"
  | "path_walk"
  | "canonical_alias_last"
  | "keyword_rollup_last"
  | "keyword_rollup_noise"
  | "global_match"
  | "auto_similarity"
  | "none";

export type CategoryResolutionResult = {
  categoryId: number | null;
  method: CategoryResolutionMethod;
  /** Yalnızca method === "auto_similarity" iken (gözlem / hata ayıklama). */
  similarityScore?: number;
  /**
   * method === "none" ve bigram adımı değerlendirildiyse red kodu (log / debug; iş kuralı değil).
   */
  autoSimilarityReject?: string;
};

export type CategoryResolutionContext = {
  categories: CanonicalCategory[];
  slugMap: Map<string, CanonicalCategory>;
  byParent: Map<number | null, CanonicalCategory[]>;
  idsWithChildren: Set<number>;
  /** `${feedSource}|${normalizeCategoryPhrase(text)}` → sonuç */
  resolutionCache: Map<string, CategoryResolutionResult>;
  /** Feed kaynağı (trendyol, amazon, …). Override ve cache anahtarı için. */
  feedSource?: string;
  /** `buildCategoryOverrideKey` ile uyumlu anahtar → categoryId */
  overrideByKey?: Map<string, number>;
};

function lookupOverride(
  ctx: CategoryResolutionContext,
  scope: "full" | "last",
  norm: string,
  feedSource: string
): number | null {
  const map = ctx.overrideByKey;
  if (!map || !norm) return null;
  const src = feedSource.toLowerCase().trim();
  return (
    map.get(buildCategoryOverrideKey(src, scope, norm)) ??
    map.get(buildCategoryOverrideKey("*", scope, norm)) ??
    null
  );
}

export function createCategoryResolutionContext(
  categories: CanonicalCategory[],
  options?: Partial<Pick<CategoryResolutionContext, "feedSource" | "overrideByKey">>
): CategoryResolutionContext {
  return {
    categories,
    slugMap: buildSlugMap(categories),
    byParent: buildByParent(categories),
    idsWithChildren: buildIdsWithChildren(categories),
    resolutionCache: new Map(),
    feedSource: options?.feedSource,
    overrideByKey: options?.overrideByKey
  };
}

function resolveCategoryTextUncached(
  trimmed: string,
  ctx: CategoryResolutionContext,
  feedSource: string
): CategoryResolutionResult {
  const slugMap = ctx.slugMap;
  const byParent = ctx.byParent;
  const categories = ctx.categories;
  const idsWithChildren = ctx.idsWithChildren;

  const fullNorm = normalizeCategoryPhrase(trimmed);

  const ovFull = lookupOverride(ctx, "full", fullNorm, feedSource);
  if (ovFull !== null) return { categoryId: ovFull, method: "manual_override_full" };

  const aliasFull = resolveAliasSlug(fullNorm, slugMap);
  if (aliasFull !== null) return { categoryId: aliasFull, method: "canonical_alias_full" };

  const segments = splitSegments(trimmed);
  if (segments.length === 0) return { categoryId: null, method: "none" };

  let parentId: number | null = null;
  let matched: CanonicalCategory | null = null;
  let walkedDepth = 0;

  for (const segment of segments) {
    const segNorm = normalizeCategoryPhrase(segment);
    const aliasSeg = resolveAliasSlug(segNorm, slugMap);
    if (aliasSeg !== null) {
      const cat = categories.find((c) => c.id === aliasSeg);
      if (cat && cat.parentId === parentId) {
        matched = cat;
        parentId = cat.id;
        continue;
      }
    }

    const rollupSeg = tryKeywordRollupSlug(segNorm, slugMap);
    if (rollupSeg !== null) {
      const cat = categories.find((c) => c.id === rollupSeg);
      if (cat && cat.parentId === parentId) {
        matched = cat;
        parentId = cat.id;
        continue;
      }
    }

    const candidates = byParent.get(parentId) ?? [];
    const next = matchSegmentToChild(segment, candidates);
    if (!next) {
      matched = null;
      break;
    }
    matched = next;
    parentId = next.id;
    walkedDepth += 1;
  }

  if (matched) return { categoryId: matched.id, method: "path_walk" };

  const last = segments[segments.length - 1];
  const lastNorm = normalizeCategoryPhrase(last);
  const allowBroadRollup = walkedDepth === 0 || segments.length === 1;

  const ovLast = lookupOverride(ctx, "last", lastNorm, feedSource);
  if (ovLast !== null) return { categoryId: ovLast, method: "manual_override_last" };

  const aliasLast = resolveAliasSlug(lastNorm, slugMap);
  if (aliasLast !== null) return { categoryId: aliasLast, method: "canonical_alias_last" };

  if (allowBroadRollup) {
    const rollupLast = tryKeywordRollupSlug(lastNorm, slugMap);
    if (rollupLast !== null) return { categoryId: rollupLast, method: "keyword_rollup_last" };

    const noisy = stripFeedNoise(lastNorm);
    if (noisy !== lastNorm && noisy.length >= 2) {
      const rollupNoise = tryKeywordRollupSlug(noisy, slugMap);
      if (rollupNoise !== null) return { categoryId: rollupNoise, method: "keyword_rollup_noise" };
    }
  }

  const global = matchGlobal(last, categories, idsWithChildren);
  if (global) return { categoryId: global.id, method: "global_match" };

  const simOut = evaluateAutoSimilarityCategoryMatch(last, categories, idsWithChildren);
  const logResolve = process.env.UCZBK_CATEGORY_RESOLVE_LOG === "1";

  if (simOut.matched) {
    const r = simOut.result;
    const hit = categories.find((c) => c.id === r.categoryId);
    if (logResolve) {
      const normLast = normalizeCategoryPhrase(last);
      console.log(
        [
          "[category-resolve]",
          "kind=matched",
          `method=auto_similarity`,
          `source=${feedSource}`,
          `raw=${JSON.stringify(trimmed.slice(0, 160))}`,
          `norm_last=${JSON.stringify(normLast.slice(0, 120))}`,
          `canonical_id=${r.categoryId}`,
          `canonical_name=${JSON.stringify(hit?.name ?? "")}`,
          `score=${r.score.toFixed(3)}`,
          `gap=${r.gap.toFixed(3)}`,
          `runner_up=${r.runnerUpScore.toFixed(3)}`,
          `leaf_pool=${r.usedLeafPool}`
        ].join(" ")
      );
    }
    return {
      categoryId: r.categoryId,
      method: "auto_similarity",
      similarityScore: r.score
    };
  }

  if (logResolve) {
    const normLast = normalizeCategoryPhrase(last);
    const d = simOut;
    console.log(
      [
        "[category-resolve]",
        "kind=rejected",
        `method=none`,
        `source=${feedSource}`,
        `raw=${JSON.stringify(trimmed.slice(0, 160))}`,
        `norm_last=${JSON.stringify(normLast.slice(0, 120))}`,
        `reject=${d.reason}`,
        d.bestScore != null ? `best_score=${d.bestScore.toFixed(3)}` : "",
        d.bestCategoryId != null ? `best_id=${d.bestCategoryId}` : "",
        d.runnerUpScore != null ? `runner_up=${d.runnerUpScore.toFixed(3)}` : "",
        d.gap != null ? `gap=${d.gap.toFixed(3)}` : "",
        d.effectiveThreshold != null ? `threshold=${d.effectiveThreshold.toFixed(2)}` : ""
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  return { categoryId: null, method: "none", autoSimilarityReject: simOut.reason };
}

function cacheKeyFor(feedSource: string, trimmed: string): string {
  return `${feedSource}|${normalizeCategoryPhrase(trimmed)}`;
}

/**
 * @param feedSource Çağrı başına kaynak (ör. item.source veya mağaza slug). Verilmezse ctx.feedSource.
 */
export function resolveCategoryTextWithTrace(
  ctx: CategoryResolutionContext,
  categoryText: string,
  feedSource?: string
): CategoryResolutionResult {
  const trimmed = categoryText.trim();
  if (!trimmed) return { categoryId: null, method: "none" };

  const fs = feedSource ?? ctx.feedSource ?? "*";
  const key = cacheKeyFor(fs, trimmed);
  if (ctx.resolutionCache.has(key)) {
    return ctx.resolutionCache.get(key)!;
  }

  const result = resolveCategoryTextUncached(trimmed, ctx, fs);
  ctx.resolutionCache.set(key, result);
  return result;
}

/** Geriye dönük uyumluluk: sadece category id döner. */
export function resolveCategoryTextId(
  ctx: CategoryResolutionContext,
  categoryText: string,
  feedSource?: string
): number | null {
  return resolveCategoryTextWithTrace(ctx, categoryText, feedSource).categoryId;
}

export function mapCategoryTextToCanonical(categoryText: string, categories: CanonicalCategory[]): number | null {
  const ctx = createCategoryResolutionContext(categories);
  return resolveCategoryTextId(ctx, categoryText);
}
