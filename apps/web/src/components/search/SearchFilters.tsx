"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const BRAND_VISIBLE_INITIAL = 10;

interface CategoryWithCount {
  id: number;
  name: string;
  slug: string;
  productCount: number;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
}

interface SearchFiltersProps {
  categoriesWithCount: CategoryWithCount[];
  brands: Brand[];
  searchParams: {
    q?: string;
    categorySlug?: string;
    brandSlug?: string;
    minPrice?: string;
    maxPrice?: string;
  };
  /** Arama sayfası: "/arama", kategori sayfası: "/kategori/xxx" */
  basePath?: string;
}

function buildFilterUrl(
  basePath: string,
  params: Record<string, string | undefined>,
  overrides: Record<string, string | null>
) {
  const isCategoryPage = basePath.startsWith("/kategori/");
  const merged = { ...params, ...overrides };
  const clean = (o: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams();
    Object.entries(o).forEach(([k, v]) => {
      if (v != null && v !== "") next.set(k, v);
    });
    return next.toString();
  };

  if (isCategoryPage && overrides.categorySlug != null) {
    const q: Record<string, string> = {};
    if (merged.brandSlug) q.brandSlug = merged.brandSlug;
    if (merged.minPrice) q.minPrice = merged.minPrice;
    if (merged.maxPrice) q.maxPrice = merged.maxPrice;
    const qs = clean(q);
    return `/kategori/${overrides.categorySlug}${qs ? `?${qs}` : ""}`;
  }

  const forQuery = { ...merged };
  if (isCategoryPage) {
    delete forQuery.q;
    delete forQuery.categorySlug;
  }
  const qs = clean(forQuery);
  return `${basePath}${qs ? `?${qs}` : ""}`;
}

export function SearchFilters({
  categoriesWithCount,
  brands,
  searchParams,
  basePath = "/arama"
}: SearchFiltersProps) {
  const [filterSearch, setFilterSearch] = useState("");
  const [showAllBrands, setShowAllBrands] = useState(false);

  const baseParams = {
    q: searchParams.q ?? "",
    categorySlug: searchParams.categorySlug ?? "",
    brandSlug: searchParams.brandSlug ?? "",
    minPrice: searchParams.minPrice ?? "",
    maxPrice: searchParams.maxPrice ?? ""
  };
  const isCategoryPage = basePath !== "/arama";

  const filteredCategories = useMemo(() => {
    if (!filterSearch.trim()) return categoriesWithCount;
    const t = filterSearch.trim().toLowerCase();
    return categoriesWithCount.filter((c) => c.name.toLowerCase().includes(t));
  }, [categoriesWithCount, filterSearch]);

  const filteredBrands = useMemo(() => {
    let list = brands;
    if (filterSearch.trim()) {
      const t = filterSearch.trim().toLowerCase();
      list = brands.filter((b) => b.name.toLowerCase().includes(t));
    }
    return list;
  }, [brands, filterSearch]);

  const visibleBrands = showAllBrands ? filteredBrands : filteredBrands.slice(0, BRAND_VISIBLE_INITIAL);
  const hasMoreBrands = filteredBrands.length > BRAND_VISIBLE_INITIAL;

  const currentCategorySlug = searchParams.categorySlug ?? "";
  const currentBrandSlug = searchParams.brandSlug ?? "";

  return (
    <aside className="search-filters" style={{ alignSelf: "flex-start" }}>
      <section className="search-filters__section">
        <h2 className="search-filters__title">Kategoriler</h2>
        <ul className="search-filters__list" role="list">
          {filteredCategories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={buildFilterUrl(basePath, baseParams, { categorySlug: cat.slug })}
                className={`search-filters__link ${currentCategorySlug === cat.slug ? "search-filters__link--active" : ""}`}
              >
                <span>{cat.name}</span>
                <span className="search-filters__count">({cat.productCount})</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="search-filters__section">
        <h2 className="search-filters__title">Filtrele</h2>

        <div className="search-filters__filter-search">
          <input
            type="search"
            placeholder="Filtreler içinde ara"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="input"
            aria-label="Filtreler içinde ara"
          />
        </div>

        <form method="get" action={basePath} className="search-filters__form">
          {!isCategoryPage && <input type="hidden" name="q" value={searchParams.q ?? ""} />}
          {!isCategoryPage && (
            <input type="hidden" name="categorySlug" value={searchParams.categorySlug ?? ""} />
          )}
          <input type="hidden" name="brandSlug" value={searchParams.brandSlug ?? ""} />

          <div className="search-filters__block">
            <h3 className="search-filters__label">Fiyatı</h3>
            <div className="search-filters__price">
              <input
                name="minPrice"
                type="number"
                min={0}
                step="1"
                placeholder="En az"
                defaultValue={searchParams.minPrice ?? ""}
                className="input"
              />
              <input
                name="maxPrice"
                type="number"
                min={0}
                step="1"
                placeholder="En çok"
                defaultValue={searchParams.maxPrice ?? ""}
                className="input"
              />
            </div>
          </div>

          <div className="search-filters__block">
            <h3 className="search-filters__label">Markası</h3>
            <div className="search-filters__brands">
              {visibleBrands.map((b) => (
                <Link
                  key={b.id}
                  href={buildFilterUrl(basePath, baseParams, { brandSlug: b.slug })}
                  className={`search-filters__link search-filters__link--block ${currentBrandSlug === b.slug ? "search-filters__link--active" : ""}`}
                >
                  {b.name}
                </Link>
              ))}
              {hasMoreBrands && !showAllBrands && (
                <button
                  type="button"
                  className="search-filters__show-all"
                  onClick={() => setShowAllBrands(true)}
                >
                  Tümünü Göster
                </button>
              )}
              {currentBrandSlug && (
                <Link
                  href={buildFilterUrl(basePath, baseParams, { brandSlug: null })}
                  className="search-filters__link search-filters__link--block"
                >
                  Tümünü Göster
                </Link>
              )}
            </div>
          </div>

          <div className="search-filters__block">
            <h3 className="search-filters__label">Cinsiyet</h3>
            <div className="search-filters__chips">
              <span className="search-filters__chip search-filters__chip--muted">Erkek</span>
              <span className="search-filters__chip search-filters__chip--muted">Kadın</span>
            </div>
          </div>

          <div className="search-filters__block">
            <h3 className="search-filters__label">Ürün Puanı</h3>
            <div className="search-filters__chips">
              <span className="search-filters__chip search-filters__chip--muted">—</span>
            </div>
          </div>

          <div className="search-filters__block">
            <h3 className="search-filters__label">Renk</h3>
            <div className="search-filters__chips">
              <span className="search-filters__chip search-filters__chip--muted">—</span>
            </div>
          </div>

          <div className="search-filters__block">
            <h3 className="search-filters__label">Satıcı</h3>
            <div className="search-filters__chips">
              <span className="search-filters__chip search-filters__chip--muted">—</span>
            </div>
          </div>

          <button type="submit" className="btn-primary search-filters__submit">
            Filtreleri Uygula
          </button>
        </form>
      </section>
    </aside>
  );
}
