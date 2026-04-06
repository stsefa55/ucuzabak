"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { buildFilterUrl, joinCsv, LISTING_SORT_LABELS, parseCsv } from "../../lib/listingFilterUrls";

export type ListingActiveChipsSearchParams = {
  q?: string;
  categorySlug?: string;
  categorySlugs?: string;
  brandSlug?: string;
  brandSlugs?: string;
  minPrice?: string;
  maxPrice?: string;
};

type Category = { slug: string; name: string };

type Props = {
  mode: "search" | "category";
  basePath: string;
  sort: string;
  searchParams: ListingActiveChipsSearchParams;
  categoriesWithCount?: Category[];
  /** Aynı satırda sağa hizalanır (örn. arama sayfası SortSelect) */
  trailingSlot?: ReactNode;
};

function toggleCategorySlugInCsv(currentCsv: string | undefined, slug: string): string {
  const arr = parseCsv(currentCsv);
  const idx = arr.indexOf(slug);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(slug);
  return joinCsv(arr);
}

function priceChipLabel(min?: string, max?: string): string {
  if (min?.trim() && max?.trim()) return `Fiyat aralığı: ${min} – ${max} TL`;
  if (min?.trim()) return `Fiyat aralığı: en az ${min} TL`;
  if (max?.trim()) return `Fiyat aralığı: en çok ${max} TL`;
  return "Fiyat aralığı";
}

export function ListingActiveFilterChips({
  mode,
  basePath,
  sort,
  searchParams,
  categoriesWithCount = [],
  trailingSlot
}: Props) {
  const resolvedSort = sort?.trim() || "popular";
  const baseParams = useMemo(
    () => ({
      q: searchParams.q ?? "",
      categorySlug: searchParams.categorySlug ?? "",
      categorySlugs: searchParams.categorySlugs ?? "",
      brandSlug: searchParams.brandSlug ?? "",
      brandSlugs: searchParams.brandSlugs ?? "",
      minPrice: searchParams.minPrice ?? "",
      maxPrice: searchParams.maxPrice ?? "",
      sort: resolvedSort === "popular" ? "" : resolvedSort
    }),
    [searchParams, resolvedSort]
  );

  const categoryMap = useMemo(
    () => new Map(categoriesWithCount.map((c) => [c.slug, c.name])),
    [categoriesWithCount]
  );

  const categorySlugs = parseCsv(searchParams.categorySlugs);
  const singleCategorySlug = searchParams.categorySlug?.trim() ?? "";

  const hasPrice = Boolean(searchParams.minPrice?.trim() || searchParams.maxPrice?.trim());
  const sortActive = resolvedSort !== "popular";

  const hasSearchCategoryChips = mode === "search" && (categorySlugs.length > 0 || Boolean(singleCategorySlug));
  const hasFacetRow =
    (mode === "search" && (hasSearchCategoryChips || hasPrice)) || (mode === "category" && hasPrice);

  const showChipsSection = hasFacetRow || sortActive;

  if (!showChipsSection && !trailingSlot) return null;

  const rowMods = [
    "listing-active-filters__row",
    !showChipsSection && trailingSlot ? "listing-active-filters__row--trailing-only" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="listing-active-filters" aria-label="Aktif liste filtreleri">
      <div className={rowMods}>
        {showChipsSection ? (
          <div className="listing-active-filters__main">
            <span className="listing-active-filters__label">Aktif filtreler</span>
            <div className="listing-active-filters__chips" role="list">
          {mode === "search" && singleCategorySlug && !categorySlugs.includes(singleCategorySlug)
            ? (() => {
                const label = categoryMap.get(singleCategorySlug) ?? singleCategorySlug;
                return (
                  <Link
                    key="cat-single"
                    role="listitem"
                    href={buildFilterUrl(basePath, baseParams, {
                      categorySlug: null,
                      categorySlugs: null
                    })}
                    className="filter-chip filter-chip--category"
                    aria-label={`${label} kategori filtresini kaldır`}
                  >
                    <span className="filter-chip__label">Kategori: {label}</span>
                    <span className="filter-chip__remove" aria-hidden>
                      ×
                    </span>
                  </Link>
                );
              })()
            : null}
          {mode === "search"
            ? categorySlugs.map((slug) => {
                const label = categoryMap.get(slug) ?? slug;
                const next = toggleCategorySlugInCsv(searchParams.categorySlugs, slug);
                return (
                  <Link
                    key={`cat-${slug}`}
                    role="listitem"
                    href={buildFilterUrl(basePath, baseParams, {
                      categorySlugs: next || null,
                      categorySlug: null
                    })}
                    className="filter-chip filter-chip--category"
                    aria-label={`${label} kategori filtresini kaldır`}
                  >
                    <span className="filter-chip__label">Kategori: {label}</span>
                    <span className="filter-chip__remove" aria-hidden>
                      ×
                    </span>
                  </Link>
                );
              })
            : null}
          {hasPrice ? (
            <Link
              role="listitem"
              href={buildFilterUrl(basePath, baseParams, { minPrice: null, maxPrice: null })}
              className="filter-chip filter-chip--price"
              aria-label="Fiyat aralığı filtresini kaldır"
            >
              <span className="filter-chip__label">
                {priceChipLabel(searchParams.minPrice, searchParams.maxPrice)}
              </span>
              <span className="filter-chip__remove" aria-hidden>
                ×
              </span>
            </Link>
          ) : null}
          {sortActive ? (
            <Link
              role="listitem"
              href={buildFilterUrl(basePath, baseParams, { sort: null })}
              className="filter-chip filter-chip--sort"
              aria-label="Sıralamayı varsayılana döndür"
            >
              <span className="filter-chip__label">
                Sırala: {LISTING_SORT_LABELS[resolvedSort] ?? resolvedSort}
              </span>
              <span className="filter-chip__remove" aria-hidden>
                ×
              </span>
            </Link>
          ) : null}
            </div>
          </div>
        ) : null}
        {trailingSlot ? <div className="listing-active-filters__trailing">{trailingSlot}</div> : null}
      </div>
    </div>
  );
}
