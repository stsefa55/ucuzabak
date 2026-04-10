"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildFilterUrl, joinCsv, parseCsv } from "../../lib/listingFilterUrls";
import { CategoryAccordionNav } from "../category/CategoryAccordionNav";
import { CategorySubcategoryGrid } from "../category/CategorySubcategoryGrid";
import { FilterCheckboxRow } from "./FilterCheckboxRow";
import { FilterPanelSection } from "./FilterPanelSection";
import type { CategoryNavigationContext } from "./category-navigation.types";

export type { CategoryNavigationContext };

interface CategoryWithCount {
  id: number;
  name: string;
  slug: string;
  productCount: number;
  iconName?: string | null;
  imageUrl?: string | null;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
  productCount?: number;
}

interface SearchFiltersProps {
  categoriesWithCount?: CategoryWithCount[];
  brands: Brand[];
  searchParams: {
    q?: string;
    categorySlug?: string;
    categorySlugs?: string;
    brandSlug?: string;
    brandSlugs?: string;
    minPrice?: string;
    maxPrice?: string;
  };
  basePath?: string;
  categoryNavigation?: CategoryNavigationContext | null;
  priceExtent?: { min: number | null; max: number | null } | null;
  /** Liste sıralaması — chip / temizle URL’lerinde korunur */
  sort?: string;
}

const FILTER_PANEL_DOM_ID = "search-filters-panel";

export function SearchFilters({
  categoriesWithCount = [],
  brands,
  searchParams,
  basePath = "/arama",
  categoryNavigation = null,
  priceExtent = null,
  sort: sortProp
}: SearchFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const listingQueryKey = urlSearchParams.toString();
  const [facetFilterQuery, setFacetFilterQuery] = useState("");
  const [brandFilterQuery, setBrandFilterQuery] = useState("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const baseParams = {
    q: searchParams.q ?? "",
    categorySlug: searchParams.categorySlug ?? "",
    categorySlugs: searchParams.categorySlugs ?? "",
    brandSlug: searchParams.brandSlug ?? "",
    brandSlugs: searchParams.brandSlugs ?? "",
    minPrice: searchParams.minPrice ?? "",
    maxPrice: searchParams.maxPrice ?? "",
    sort:
      sortProp && sortProp.trim() !== "" && sortProp.trim() !== "popular"
        ? sortProp.trim()
        : ""
  };
  const isCategoryPage = basePath.startsWith("/kategori/");

  const selectedBrandSlugs = useMemo(() => {
    const csv = parseCsv(searchParams.brandSlugs);
    if (csv.length > 0) return csv;
    const one = searchParams.brandSlug?.trim();
    return one ? [one] : [];
  }, [searchParams.brandSlugs, searchParams.brandSlug]);
  const selectedBrandSet = useMemo(() => new Set(selectedBrandSlugs), [selectedBrandSlugs]);

  const [pendingBrandSlugs, setPendingBrandSlugs] = useState<string[]>(selectedBrandSlugs);
  const pendingBrandSet = useMemo(() => new Set(pendingBrandSlugs), [pendingBrandSlugs]);

  useEffect(() => {
    setPendingBrandSlugs(selectedBrandSlugs);
  }, [selectedBrandSlugs]);

  const togglePendingBrand = useCallback((slug: string) => {
    setPendingBrandSlugs((prev) => {
      const idx = prev.indexOf(slug);
      if (idx >= 0) return prev.filter((s) => s !== slug);
      return [...prev, slug];
    });
  }, []);

  const pendingChanged = useMemo(() => {
    if (pendingBrandSlugs.length !== selectedBrandSlugs.length) return true;
    const s = new Set(selectedBrandSlugs);
    return pendingBrandSlugs.some((slug) => !s.has(slug));
  }, [pendingBrandSlugs, selectedBrandSlugs]);

  const applyBrandFilter = useCallback(() => {
    const href = buildFilterUrl(basePath, baseParams, {
      brandSlugs: joinCsv(pendingBrandSlugs) || null,
      brandSlug: null
    });
    router.push(href, { scroll: false });
  }, [pendingBrandSlugs, basePath, baseParams, router]);

  const filteredCategories = useMemo(() => {
    if (!facetFilterQuery.trim()) return categoriesWithCount;
    const t = facetFilterQuery.trim().toLowerCase();
    return categoriesWithCount.filter((c) => c.name.toLowerCase().includes(t));
  }, [categoriesWithCount, facetFilterQuery]);

  const filteredBrands = useMemo(() => {
    const t = brandFilterQuery.trim().toLowerCase();
    const searched = t ? brands.filter((b) => b.name.toLowerCase().includes(t)) : brands.slice();
    searched.sort((a, b) => {
      const checkedA = selectedBrandSet.has(a.slug) ? 1 : 0;
      const checkedB = selectedBrandSet.has(b.slug) ? 1 : 0;
      if (checkedA !== checkedB) return checkedB - checkedA;
      const countA = typeof a.productCount === "number" ? a.productCount : 0;
      const countB = typeof b.productCount === "number" ? b.productCount : 0;
      if (countA !== countB) return countB - countA;
      return a.name.localeCompare(b.name, "tr");
    });
    return searched;
  }, [brands, brandFilterQuery, selectedBrandSet]);

  const selectedCategorySlugs = useMemo(() => parseCsv(searchParams.categorySlugs), [searchParams.categorySlugs]);
  const currentCategorySlug = selectedCategorySlugs[0] ?? searchParams.categorySlug ?? "";
  const selectedCategorySet = useMemo(() => new Set(selectedCategorySlugs), [selectedCategorySlugs]);

  const hasPriceFilter = Boolean(searchParams.minPrice || searchParams.maxPrice);
  const sortActive = Boolean(sortProp && sortProp !== "popular");
  const activeFilterCount =
    selectedCategorySlugs.length +
    selectedBrandSlugs.length +
    (hasPriceFilter ? 1 : 0) +
    (sortActive ? 1 : 0);

  useEffect(() => {
    setFilterDrawerOpen(false);
  }, [pathname, listingQueryKey]);

  useEffect(() => {
    setBrandFilterQuery("");
  }, [pathname, listingQueryKey]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 769px)");
    const onChange = () => {
      if (mq.matches) setFilterDrawerOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!filterDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filterDrawerOpen]);

  useEffect(() => {
    if (!filterDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filterDrawerOpen]);

  const searchRootsWithStock = useMemo(
    () => filteredCategories.filter((c) => c.productCount > 0),
    [filteredCategories]
  );

  /** Arama kök kategorileri: Trendyol tarzı daraltma (kategori sayfası accordion’da kullanılmaz) */
  const categoryFilterCollapsible = useMemo(() => {
    if (categoryNavigation) return false;
    if (!isCategoryPage) return false;
    if (!currentCategorySlug) return false;
    if (searchRootsWithStock.length <= 1) return false;
    return searchRootsWithStock.some((c) => c.slug === currentCategorySlug);
  }, [categoryNavigation, searchRootsWithStock, currentCategorySlug, isCategoryPage]);

  const [categoryChoicesExpanded, setCategoryChoicesExpanded] = useState(false);

  useEffect(() => {
    setCategoryChoicesExpanded(false);
  }, [currentCategorySlug, basePath]);

  const categoryItemsForPanel = useMemo(() => {
    const mapped = filteredCategories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      productCount: c.productCount,
      pathSlugs: [c.slug] as string[],
      iconName: c.iconName,
      imageUrl: c.imageUrl
    }));
    if (!categoryFilterCollapsible || categoryChoicesExpanded) return mapped;
    return mapped.filter((c) => c.productCount > 0 && c.slug === currentCategorySlug);
  }, [filteredCategories, categoryFilterCollapsible, categoryChoicesExpanded, currentCategorySlug]);

  const selectSingleCategorySlug = (slug: string) => {
    if (selectedCategorySlugs.length === 1 && selectedCategorySlugs[0] === slug) {
      return "";
    }
    return slug;
  };

  const categoryPanelTitle = categoryNavigation ? "Kategori" : "Kategoriler";

  return (
    <div className="search-filters-host">
      <div className="filter-panel__mobile-bar">
        <button
          type="button"
          className="btn-secondary filter-panel__drawer-open-btn"
          aria-expanded={filterDrawerOpen}
          aria-controls={FILTER_PANEL_DOM_ID}
          onClick={() => setFilterDrawerOpen(true)}
        >
          Filtreler
          {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>
      {filterDrawerOpen ? (
        <button
          type="button"
          className="filter-panel__drawer-backdrop"
          aria-label="Filtre panelini kapat"
          onClick={() => setFilterDrawerOpen(false)}
        />
      ) : null}
      <aside
        id={FILTER_PANEL_DOM_ID}
        className={`search-filters filter-panel${filterDrawerOpen ? " filter-panel--drawer-open" : ""}`}
      >
        <div className="filter-panel__drawer-toolbar">
          <span className="filter-panel__drawer-toolbar-title">Filtreler</span>
          <button
            type="button"
            className="filter-panel__drawer-close"
            aria-label="Kapat"
            onClick={() => setFilterDrawerOpen(false)}
          >
            Kapat
          </button>
        </div>
      <div className="filter-panel__facet-search">
        <label className="filter-panel__sr-only" htmlFor="filter-facet-search">
          Kategori ara
        </label>
        <input
          id="filter-facet-search"
          type="search"
          className="filter-panel__search input"
          placeholder="Kategori ara"
          value={facetFilterQuery}
          onChange={(e) => setFacetFilterQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      <FilterPanelSection title={categoryPanelTitle} defaultOpen>
        {categoryNavigation ? (
          <div className="filter-panel__category-scroll-area" aria-label="Kategori listesi">
            <CategoryAccordionNav
              categoryNavigation={categoryNavigation}
              basePath={basePath}
              baseParams={baseParams}
              facetFilterQuery={facetFilterQuery}
            />
          </div>
        ) : (
          <div className="filter-panel__category-stack filter-panel__category-stack--tight">
            <div
              className="filter-panel__check-stack filter-panel__check-stack--tight filter-panel__check-stack--search-categories"
              role="list"
            >
              {categoryItemsForPanel.map((c) => (
                <FilterCheckboxRow
                  key={c.id}
                  mode="link"
                  href={buildFilterUrl(basePath, baseParams, {
                    categorySlugs: selectSingleCategorySlug(c.slug) || null,
                    categorySlug: null
                  })}
                  checked={selectedCategorySet.has(c.slug)}
                  label={c.name}
                  meta={<span className="filter-check__count">{c.productCount}</span>}
                  ariaCurrentWhenChecked={false}
                />
              ))}
            </div>
            {facetFilterQuery.trim() && categoryItemsForPanel.length === 0 ? (
              <p className="filter-panel__hint-text">Aramanızla eşleşen kategori yok</p>
            ) : null}
          </div>
        )}
      </FilterPanelSection>

      <div className="filter-panel__divider" aria-hidden />

      <form method="get" action={basePath} className="filter-panel__form">
        {!isCategoryPage && <input type="hidden" name="q" value={searchParams.q ?? ""} />}
        {!isCategoryPage && (
          <input type="hidden" name="categorySlugs" value={searchParams.categorySlugs ?? ""} />
        )}
        <input type="hidden" name="brandSlugs" value={searchParams.brandSlugs ?? ""} />
        {sortProp && sortProp !== "popular" ? <input type="hidden" name="sort" value={sortProp} /> : null}

        <FilterPanelSection title="Fiyat aralığı" defaultOpen>
          <div className="filter-panel__price-row">
            <div className="search-filters__price filter-panel__price-inputs">
              <label className="filter-panel__sr-only" htmlFor="filter-min-price">
                En az (TL)
              </label>
              <input
                id="filter-min-price"
                name="minPrice"
                type="number"
                min={0}
                max={
                  isCategoryPage && priceExtent?.max != null
                    ? Math.ceil(priceExtent.max)
                    : undefined
                }
                step="1"
                placeholder="En az"
                defaultValue={searchParams.minPrice ?? ""}
                className="input filter-panel__price-input"
                inputMode="numeric"
              />
              <label className="filter-panel__sr-only" htmlFor="filter-max-price">
                En çok (TL)
              </label>
              <input
                id="filter-max-price"
                name="maxPrice"
                type="number"
                min={0}
                max={
                  isCategoryPage && priceExtent?.max != null
                    ? Math.ceil(priceExtent.max)
                    : undefined
                }
                step="1"
                placeholder="En çok"
                defaultValue={searchParams.maxPrice ?? ""}
                className="input filter-panel__price-input"
                inputMode="numeric"
              />
            </div>
            <button
              type="submit"
              className="btn-primary filter-panel__apply-price"
              aria-label="Fiyat aralığını uygula"
              title="Fiyat aralığını uygula"
            >
              <ChevronRight size={17} strokeWidth={2} aria-hidden />
            </button>
          </div>
        </FilterPanelSection>
      </form>

      <div className="filter-panel__divider" aria-hidden />

      <FilterPanelSection title="Marka" defaultOpen>
        <div className="filter-panel__brand-search">
          <label className="filter-panel__sr-only" htmlFor="filter-brand-search">
            Marka ara
          </label>
          <input
            id="filter-brand-search"
            type="search"
            className="filter-panel__search input"
            placeholder="Marka ara"
            value={brandFilterQuery}
            onChange={(e) => setBrandFilterQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <ul className="filter-panel__brand-scroll-area" role="list" aria-label="Markalar">
          {filteredBrands.map((b) => {
            const checked = pendingBrandSet.has(b.slug);
            return (
              <li key={b.id} className="filter-panel__brand-scroll-item">
                <button
                  type="button"
                  className={`filter-check__row filter-check__row--brand-panel${checked ? " filter-check__row--checked" : ""}`}
                  onClick={() => togglePendingBrand(b.slug)}
                >
                  <span
                    className="filter-check__box"
                    {...(checked ? { "data-checked": "true" as const } : {})}
                    aria-hidden
                  />
                  <span className="filter-check__label">{b.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {brandFilterQuery.trim() && filteredBrands.length === 0 && brands.length > 0 ? (
          <p className="filter-panel__hint-text">Aramanızla eşleşen marka yok</p>
        ) : null}
        {pendingChanged ? (
          <button
            type="button"
            className="btn-primary filter-panel__apply-brand"
            onClick={applyBrandFilter}
          >
            Uygula ({pendingBrandSlugs.length})
          </button>
        ) : null}
      </FilterPanelSection>

      {!isCategoryPage ? (
        <>
          <div className="filter-panel__divider" aria-hidden />
          <FilterPanelSection title="Avantajlı ürünler" defaultOpen={false}>
            <div className="filter-panel__check-stack">
              <FilterCheckboxRow mode="static" label="Kuponlu ürünler" meta={<span className="filter-check__soon">Yakında</span>} />
              <FilterCheckboxRow mode="static" label="Çok al az öde" meta={<span className="filter-check__soon">Yakında</span>} />
            </div>
          </FilterPanelSection>

          <div className="filter-panel__divider" aria-hidden />
          <FilterPanelSection title="Satıcı" defaultOpen={false}>
            <div className="filter-panel__check-stack">
              <FilterCheckboxRow mode="static" label="Onaylı satıcı" meta={<span className="filter-check__soon">Yakında</span>} />
            </div>
          </FilterPanelSection>
        </>
      ) : (
        <>
          <div className="filter-panel__divider" aria-hidden />
          <FilterPanelSection title="Avantajlı ürünler" defaultOpen={false}>
            <div className="filter-panel__check-stack">
              <FilterCheckboxRow mode="static" label="Kuponlu ürünler" meta={<span className="filter-check__soon">Yakında</span>} />
              <FilterCheckboxRow mode="static" label="Çok al az öde" meta={<span className="filter-check__soon">Yakında</span>} />
            </div>
          </FilterPanelSection>
          <div className="filter-panel__divider" aria-hidden />
          <FilterPanelSection title="Satıcı" defaultOpen={false}>
            <div className="filter-panel__check-stack">
              <FilterCheckboxRow mode="static" label="Onaylı satıcı" meta={<span className="filter-check__soon">Yakında</span>} />
            </div>
          </FilterPanelSection>
        </>
      )}
    </aside>
    </div>
  );
}
