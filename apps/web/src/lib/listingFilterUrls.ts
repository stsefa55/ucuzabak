import { categoryPageBasePathFromSlugs } from "./categoryPaths";

/** Liste sıralaması: tek kaynak (SortSelect + aktif filtre çipi aynı metinleri kullanır) */
export const LISTING_SORT_OPTIONS = [
  { value: "popular", label: "En Popüler Ürünler" },
  { value: "lowest_price", label: "En Düşük Fiyat" },
  { value: "highest_price", label: "En Yüksek Fiyat" },
  { value: "price_drop", label: "Fiyatı Düşenler" },
  { value: "newest", label: "En Yeni Ürünler" }
] as const;

export const LISTING_SORT_LABELS: Record<string, string> = Object.fromEntries(
  LISTING_SORT_OPTIONS.map((o) => [o.value, o.label])
) as Record<string, string>;

export type FilterUrlOverrides = {
  q?: string | null;
  categorySlug?: string | null;
  categorySlugs?: string | null;
  brandSlug?: string | null;
  brandSlugs?: string | null;
  minPrice?: string | null;
  maxPrice?: string | null;
  categoryPathSlugs?: string[] | null;
  sort?: string | null;
};

export function parseCsv(v?: string): string[] {
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinCsv(values: string[]): string {
  return values.filter(Boolean).join(",");
}

/** CSV’den tek slug çıkarır (chip kaldırma) */
export function removeSlugFromCsv(csv: string | undefined, slug: string): string {
  return joinCsv(parseCsv(csv).filter((s) => s !== slug));
}

function appendSortToQuery(q: Record<string, string>, merged: Record<string, string | null | undefined>) {
  const s = merged.sort;
  if (typeof s === "string" && s.trim() !== "" && s.trim() !== "popular") {
    q.sort = s.trim();
  }
}

/**
 * Arama (/arama) ve kategori listeleri için filtre URL’i.
 * `params` güncel tüm alanları içermeli (sort dahil); `overrides` ile tek alan değişir.
 */
export function buildFilterUrl(
  basePath: string,
  params: Record<string, string | undefined>,
  overrides: FilterUrlOverrides
) {
  const isCategoryPage = basePath.startsWith("/kategori/");
  const merged = { ...params, ...overrides } as Record<string, string | null | undefined>;
  const clean = (o: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams();
    Object.entries(o).forEach(([k, v]) => {
      if (v != null && v !== "") next.set(k, v);
    });
    return next.toString();
  };

  if (isCategoryPage && overrides.categoryPathSlugs != null && overrides.categoryPathSlugs.length > 0) {
    const q: Record<string, string> = {};
    if (merged.brandSlugs) q.brandSlugs = merged.brandSlugs as string;
    else if (merged.brandSlug) q.brandSlug = merged.brandSlug as string;
    if (merged.minPrice) q.minPrice = merged.minPrice as string;
    if (merged.maxPrice) q.maxPrice = merged.maxPrice as string;
    appendSortToQuery(q, merged);
    const qs = clean(q);
    return `${categoryPageBasePathFromSlugs(overrides.categoryPathSlugs)}${qs ? `?${qs}` : ""}`;
  }

  if (isCategoryPage && overrides.categorySlug != null && typeof overrides.categorySlug === "string") {
    const q: Record<string, string> = {};
    if (merged.brandSlugs) q.brandSlugs = merged.brandSlugs as string;
    else if (merged.brandSlug) q.brandSlug = merged.brandSlug as string;
    if (merged.minPrice) q.minPrice = merged.minPrice as string;
    if (merged.maxPrice) q.maxPrice = merged.maxPrice as string;
    appendSortToQuery(q, merged);
    const qs = clean(q);
    return `/kategori/${encodeURIComponent(overrides.categorySlug)}${qs ? `?${qs}` : ""}`;
  }

  const forQuery = { ...merged } as Record<string, string | string[] | null | undefined>;
  if (isCategoryPage) {
    delete forQuery.q;
    delete forQuery.categorySlug;
    delete forQuery.categoryPathSlugs;
  }
  const qs = clean(forQuery as Record<string, string | null | undefined>);
  return `${basePath}${qs ? `?${qs}` : ""}`;
}
