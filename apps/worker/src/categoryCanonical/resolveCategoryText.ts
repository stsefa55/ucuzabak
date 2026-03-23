import { canonicalSlugify } from "./canonicalSlugify";
import { CATEGORY_PHRASE_ALIASES } from "./canonicalAliases";

export type CanonicalCategory = { id: number; name: string; slug: string; parentId: number | null };

/** İsim karşılaştırması: &, Türkçe karakter, noktalama. */
export function normalizeForCategoryText(input: string): string {
  return input
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/&/g, " ve ")
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g")
    .replace(/[ı]/g, "i")
    .replace(/[i]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ş]/g, "s")
    .replace(/[ü]/g, "u")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Feed `categoryText` için anahtar: virgül/noktalama/tire normalize,
 * sonra `normalizeForCategoryText`.
 */
export function normalizeCategoryPhrase(raw: string): string {
  const s = raw
    .replace(/[,;|]+/g, " ")
    .replace(/[>/\\]+/g, " ")
    .replace(/[-–—]+/g, " ")
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalizeForCategoryText(s);
}

function splitSegments(categoryText: string): string[] {
  return categoryText
    .split(/[>/|\\]+/g)
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

/**
 * Aynı ebeveyn altında güvenli eşleme: belirsizse null (yanlış kategoriye basma).
 */
function matchSegmentToChild(segment: string, candidates: CanonicalCategory[]): CanonicalCategory | null {
  if (candidates.length === 0) return null;

  const n = normalizeForCategoryText(segment);
  if (n.length < 2) return null;

  const segSlug = canonicalSlugify(segment);

  const bySlug = candidates.filter((c) => c.slug === segSlug);
  if (bySlug.length === 1) return bySlug[0];
  if (bySlug.length > 1) return null;

  const exactName = candidates.filter((c) => normalizeForCategoryText(c.name) === n);
  if (exactName.length === 1) return exactName[0];
  if (exactName.length > 1) return null;

  const prefix = candidates.filter((c) => {
    const cn = normalizeForCategoryText(c.name);
    return cn === n || cn.startsWith(`${n} `);
  });
  if (prefix.length === 1) return prefix[0];
  if (prefix.length > 1) return null;

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

/**
 * Son segment için tüm ağaçta güvenli eşleme (yaprak veya ara düğüm).
 */
function matchGlobal(segment: string, categories: CanonicalCategory[]): CanonicalCategory | null {
  const n = normalizeForCategoryText(segment);
  if (n.length < 2) return null;

  const segSlug = canonicalSlugify(segment);

  const bySlug = categories.filter((c) => c.slug === segSlug);
  if (bySlug.length === 1) return bySlug[0];
  if (bySlug.length > 1) return null;

  const exactName = categories.filter((c) => normalizeForCategoryText(c.name) === n);
  if (exactName.length === 1) return exactName[0];
  if (exactName.length > 1) return null;

  const prefix = categories.filter((c) => {
    const cn = normalizeForCategoryText(c.name);
    return cn === n || cn.startsWith(`${n} `);
  });
  if (prefix.length === 1) return prefix[0];
  if (prefix.length > 1) return null;

  if (n.length >= 4) {
    const contains = categories.filter((c) => normalizeForCategoryText(c.name).includes(n));
    if (contains.length === 1) return contains[0];
  }

  return null;
}

/**
 * Toplu import için: slug/parent haritaları ve categoryText sonuç önbelleği tek sefer oluşturulur.
 * (Her satırda `mapCategoryTextToCanonical` çağırmak O(N×Kategoriler) maliyet üretiyordu.)
 */
export type CategoryResolutionContext = {
  categories: CanonicalCategory[];
  slugMap: Map<string, CanonicalCategory>;
  byParent: Map<number | null, CanonicalCategory[]>;
  /** normalizeCategoryPhrase(…) → category id | null */
  textCache: Map<string, number | null>;
};

export function createCategoryResolutionContext(categories: CanonicalCategory[]): CategoryResolutionContext {
  return {
    categories,
    slugMap: buildSlugMap(categories),
    byParent: buildByParent(categories),
    textCache: new Map()
  };
}

function resolveCategoryTextUncached(trimmed: string, ctx: CategoryResolutionContext): number | null {
  const slugMap = ctx.slugMap;
  const byParent = ctx.byParent;
  const categories = ctx.categories;

  const fullNorm = normalizeCategoryPhrase(trimmed);
  const aliasFull = resolveAliasSlug(fullNorm, slugMap);
  if (aliasFull !== null) return aliasFull;

  const segments = splitSegments(trimmed);
  if (segments.length === 0) return null;

  let parentId: number | null = null;
  let matched: CanonicalCategory | null = null;

  for (const segment of segments) {
    const candidates = byParent.get(parentId) ?? [];
    const next = matchSegmentToChild(segment, candidates);
    if (!next) {
      matched = null;
      break;
    }
    matched = next;
    parentId = next.id;
  }

  if (matched) return matched.id;

  const last = segments[segments.length - 1];
  const lastNorm = normalizeCategoryPhrase(last);

  const aliasLast = resolveAliasSlug(lastNorm, slugMap);
  if (aliasLast !== null) return aliasLast;

  const global = matchGlobal(last, categories);
  return global?.id ?? null;
}

/**
 * Toplu import: önceden `createCategoryResolutionContext` ile oluşturulmuş ctx kullanın.
 */
export function resolveCategoryTextId(ctx: CategoryResolutionContext, categoryText: string): number | null {
  const trimmed = categoryText.trim();
  if (!trimmed) return null;

  const cacheKey = normalizeCategoryPhrase(trimmed);
  if (ctx.textCache.has(cacheKey)) {
    return ctx.textCache.get(cacheKey)!;
  }

  const id = resolveCategoryTextUncached(trimmed, ctx);
  ctx.textCache.set(cacheKey, id);
  return id;
}

/**
 * Tek seferlik / test: her çağrıda yeni bağlam oluşturur (yavaş; toplu işlemde `resolveCategoryTextId` tercih edin).
 */
export function mapCategoryTextToCanonical(categoryText: string, categories: CanonicalCategory[]): number | null {
  const ctx = createCategoryResolutionContext(categories);
  return resolveCategoryTextId(ctx, categoryText);
}
