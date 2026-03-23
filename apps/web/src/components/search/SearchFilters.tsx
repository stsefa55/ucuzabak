"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { categoryPageBasePathFromSlugs } from "../../lib/categoryPaths";
import { CategorySubcategoryGrid } from "../category/CategorySubcategoryGrid";
import { FilterCheckboxRow } from "./FilterCheckboxRow";
import { FilterPanelSection } from "./FilterPanelSection";

const BRAND_VISIBLE_INITIAL = 10;

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

/** Kategori sayfası API: GET /categories/:slug/navigation-panel */
export interface CategoryNavigationContext {
  navigationMode?: "current_children" | "root_children" | "siblings";
  current: { slug: string; name: string; pathSlugs: string[]; pathNames: string[] };
  parent: { slug: string; name: string; pathSlugs: string[]; pathNames: string[] } | null;
  siblings: Array<{
    id: number;
    name: string;
    slug: string;
    productCount: number;
    pathSlugs: string[];
    pathNames: string[];
    iconName?: string | null;
    imageUrl?: string | null;
  }>;
}

interface SearchFiltersProps {
  categoriesWithCount?: CategoryWithCount[];
  brands: Brand[];
  searchParams: {
    q?: string;
    categorySlug?: string;
    brandSlug?: string;
    minPrice?: string;
    maxPrice?: string;
  };
  basePath?: string;
  categoryNavigation?: CategoryNavigationContext | null;
  priceExtent?: { min: number | null; max: number | null } | null;
}

type FilterUrlOverrides = {
  q?: string | null;
  categorySlug?: string | null;
  brandSlug?: string | null;
  minPrice?: string | null;
  maxPrice?: string | null;
  categoryPathSlugs?: string[] | null;
};

function buildFilterUrl(
  basePath: string,
  params: Record<string, string | undefined>,
  overrides: FilterUrlOverrides
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

  if (isCategoryPage && overrides.categoryPathSlugs != null && overrides.categoryPathSlugs.length > 0) {
    const q: Record<string, string> = {};
    if (merged.brandSlug) q.brandSlug = merged.brandSlug;
    if (merged.minPrice) q.minPrice = merged.minPrice;
    if (merged.maxPrice) q.maxPrice = merged.maxPrice;
    const qs = clean(q);
    return `${categoryPageBasePathFromSlugs(overrides.categoryPathSlugs)}${qs ? `?${qs}` : ""}`;
  }

  if (isCategoryPage && overrides.categorySlug != null && typeof overrides.categorySlug === "string") {
    const q: Record<string, string> = {};
    if (merged.brandSlug) q.brandSlug = merged.brandSlug;
    if (merged.minPrice) q.minPrice = merged.minPrice;
    if (merged.maxPrice) q.maxPrice = merged.maxPrice;
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

export function SearchFilters({
  categoriesWithCount = [],
  brands,
  searchParams,
  basePath = "/arama",
  categoryNavigation = null,
  priceExtent = null
}: SearchFiltersProps) {
  const [categoryQuery, setCategoryQuery] = useState("");
  const [brandQuery, setBrandQuery] = useState("");
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
    if (!categoryQuery.trim()) return categoriesWithCount;
    const t = categoryQuery.trim().toLowerCase();
    return categoriesWithCount.filter((c) => c.name.toLowerCase().includes(t));
  }, [categoriesWithCount, categoryQuery]);

  const filteredBrands = useMemo(() => {
    if (!brandQuery.trim()) return brands;
    const t = brandQuery.trim().toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(t));
  }, [brands, brandQuery]);

  const visibleBrands = showAllBrands ? filteredBrands : filteredBrands.slice(0, BRAND_VISIBLE_INITIAL);
  const hasMoreBrands = filteredBrands.length > BRAND_VISIBLE_INITIAL;

  const currentCategorySlug = searchParams.categorySlug ?? "";
  const currentBrandSlug = searchParams.brandSlug ?? "";

  const filteredNavSiblings = useMemo(() => {
    if (!categoryNavigation) return [];
    if (!categoryQuery.trim()) return categoryNavigation.siblings;
    const t = categoryQuery.trim().toLowerCase();
    return categoryNavigation.siblings.filter((c) => c.name.toLowerCase().includes(t));
  }, [categoryNavigation, categoryQuery]);

  const filteredNavWithStock = useMemo(
    () => filteredNavSiblings.filter((c) => c.productCount > 0),
    [filteredNavSiblings]
  );

  const searchRootsWithStock = useMemo(
    () => filteredCategories.filter((c) => c.productCount > 0),
    [filteredCategories]
  );

  /** Seçili slug, bu gruptaki alternatiflerden biriyse liste Trendyol tarzı tek satıra daralır */
  const categoryFilterCollapsible = useMemo(() => {
    if (categoryNavigation) {
      if (filteredNavWithStock.length <= 1) return false;
      return filteredNavWithStock.some((c) => c.slug === currentCategorySlug);
    }
    if (!currentCategorySlug) return false;
    if (searchRootsWithStock.length <= 1) return false;
    return searchRootsWithStock.some((c) => c.slug === currentCategorySlug);
  }, [
    categoryNavigation,
    filteredNavWithStock,
    searchRootsWithStock,
    currentCategorySlug
  ]);

  const [categoryChoicesExpanded, setCategoryChoicesExpanded] = useState(false);

  useEffect(() => {
    setCategoryChoicesExpanded(false);
  }, [currentCategorySlug, categoryNavigation?.current?.slug, basePath]);

  const categoryItemsForPanel = useMemo(() => {
    if (categoryNavigation) {
      if (!categoryFilterCollapsible || categoryChoicesExpanded) return filteredNavSiblings;
      return filteredNavWithStock.filter((c) => c.slug === currentCategorySlug);
    }
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
  }, [
    categoryNavigation,
    filteredNavSiblings,
    filteredNavWithStock,
    filteredCategories,
    categoryFilterCollapsible,
    categoryChoicesExpanded,
    currentCategorySlug
  ]);

  const showCategorySearchField =
    !categoryFilterCollapsible || categoryChoicesExpanded || !currentCategorySlug;

  const rawNavMode =
    categoryNavigation?.navigationMode ??
    (categoryNavigation?.parent ? "siblings" : "current_children");
  const navMode = rawNavMode === "root_children" ? "current_children" : rawNavMode;
  const categorySubNavLabel =
    navMode === "current_children" || rawNavMode === "root_children"
      ? "Alt kategoriler"
      : "Yan kategoriler";

  const categoryPanelTitle = categoryNavigation ? "Kategori" : "Kategoriler";

  return (
    <aside className="search-filters filter-panel" style={{ alignSelf: "flex-start" }}>
      <FilterPanelSection title={categoryPanelTitle} defaultOpen>
        {categoryNavigation ? (
          <div className="filter-panel__category-stack">
            {categoryNavigation.parent ? (
              <div className="filter-panel__parent-up">
                <Link
                  href={buildFilterUrl(basePath, baseParams, {
                    categoryPathSlugs: categoryNavigation.parent.pathSlugs
                  })}
                  className="filter-panel__parent-link"
                >
                  ↑ {categoryNavigation.parent.name}
                </Link>
              </div>
            ) : null}
            <div className="search-filters__category-hero" aria-current="page">
              <p className="search-filters__category-hero-title">{categoryNavigation.current.name}</p>
              <p className="search-filters__category-hero-sub">{categorySubNavLabel}</p>
            </div>
            {showCategorySearchField ? (
              <div className="filter-panel__field">
                <label className="filter-panel__sr-only" htmlFor="filter-category-search">
                  Kategoride ara
                </label>
                <input
                  id="filter-category-search"
                  type="search"
                  className="filter-panel__search input"
                  placeholder="Kategoride ara"
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>
            ) : null}
            <CategorySubcategoryGrid
              variant="sub"
              items={categoryItemsForPanel}
              hrefFor={(cat) =>
                buildFilterUrl(basePath, baseParams, { categoryPathSlugs: cat.pathSlugs })
              }
              currentSlug={currentCategorySlug}
              emptyMessage={
                categoryQuery.trim() && (categoryNavigation?.siblings.length ?? 0) > 0
                  ? "Aramanızla eşleşen alt kategori yok"
                  : undefined
              }
            />
            {categoryFilterCollapsible && !categoryChoicesExpanded ? (
              <button
                type="button"
                className="filter-panel__text-action"
                onClick={() => setCategoryChoicesExpanded(true)}
              >
                {navMode === "current_children" || rawNavMode === "root_children"
                  ? "Diğer alt kategorileri göster"
                  : "Diğer yan kategorileri göster"}
              </button>
            ) : null}
            {categoryFilterCollapsible && categoryChoicesExpanded ? (
              <button
                type="button"
                className="filter-panel__text-action"
                onClick={() => setCategoryChoicesExpanded(false)}
              >
                Sadece seçili kategoriyi göster
              </button>
            ) : null}
          </div>
        ) : (
          <div className="filter-panel__category-stack">
            {showCategorySearchField ? (
              <div className="filter-panel__field">
                <label className="filter-panel__sr-only" htmlFor="filter-root-category-search">
                  Kategoride ara
                </label>
                <input
                  id="filter-root-category-search"
                  type="search"
                  className="filter-panel__search input"
                  placeholder="Kategoride ara"
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>
            ) : null}
            <CategorySubcategoryGrid
              variant="root"
              items={categoryItemsForPanel}
              hrefFor={(cat) =>
                buildFilterUrl(basePath, baseParams, { categorySlug: cat.slug })
              }
              currentSlug={currentCategorySlug}
              emptyMessage={
                categoryQuery.trim() && categoriesWithCount.length > 0
                  ? "Aramanızla eşleşen kategori yok"
                  : undefined
              }
            />
            {categoryFilterCollapsible && !categoryChoicesExpanded ? (
              <button
                type="button"
                className="filter-panel__text-action"
                onClick={() => setCategoryChoicesExpanded(true)}
              >
                Tüm kategorileri göster
              </button>
            ) : null}
            {categoryFilterCollapsible && categoryChoicesExpanded ? (
              <button
                type="button"
                className="filter-panel__text-action"
                onClick={() => setCategoryChoicesExpanded(false)}
              >
                Sadece seçili kategoriyi göster
              </button>
            ) : null}
            {categoryFilterCollapsible && !categoryChoicesExpanded && currentCategorySlug ? (
              <Link
                href={buildFilterUrl(basePath, baseParams, { categorySlug: null })}
                className="filter-panel__text-action filter-panel__text-action--link"
              >
                Kategori filtresini kaldır
              </Link>
            ) : null}
          </div>
        )}
      </FilterPanelSection>

      <div className="filter-panel__divider" aria-hidden />

      <form method="get" action={basePath} className="filter-panel__form">
        {!isCategoryPage && <input type="hidden" name="q" value={searchParams.q ?? ""} />}
        {!isCategoryPage && (
          <input type="hidden" name="categorySlug" value={searchParams.categorySlug ?? ""} />
        )}
        <input type="hidden" name="brandSlug" value={searchParams.brandSlug ?? ""} />

        <FilterPanelSection title="Fiyat" defaultOpen>
          <div className="filter-panel__price-hint">
            {isCategoryPage &&
            priceExtent &&
            priceExtent.min != null &&
            priceExtent.max != null ? (
              <p className="filter-panel__hint-text">
                Bu kategoride: {Math.floor(priceExtent.min)} – {Math.ceil(priceExtent.max)} TL
              </p>
            ) : null}
            <div className="search-filters__price filter-panel__price-inputs">
              <input
                name="minPrice"
                type="number"
                min={0}
                max={
                  isCategoryPage && priceExtent?.max != null
                    ? Math.ceil(priceExtent.max)
                    : undefined
                }
                step="1"
                placeholder={
                  isCategoryPage && priceExtent?.min != null && priceExtent?.max != null
                    ? `Min. ${Math.floor(priceExtent.min)}`
                    : "En az (TL)"
                }
                defaultValue={searchParams.minPrice ?? ""}
                className="input"
              />
              <input
                name="maxPrice"
                type="number"
                min={0}
                max={
                  isCategoryPage && priceExtent?.max != null
                    ? Math.ceil(priceExtent.max)
                    : undefined
                }
                step="1"
                placeholder={
                  isCategoryPage && priceExtent?.min != null && priceExtent?.max != null
                    ? `Max. ${Math.ceil(priceExtent.max)}`
                    : "En çok (TL)"
                }
                defaultValue={searchParams.maxPrice ?? ""}
                className="input"
              />
            </div>
          </div>
        </FilterPanelSection>

        <div className="filter-panel__divider filter-panel__divider--inset" aria-hidden />

        <button type="submit" className="btn-primary filter-panel__apply-price">
          Fiyatı uygula
        </button>
      </form>

      <div className="filter-panel__divider" aria-hidden />

      <FilterPanelSection title="Marka" defaultOpen>
        <div className="filter-panel__field">
          <label className="filter-panel__sr-only" htmlFor="filter-brand-search">
            Marka ara
          </label>
          <input
            id="filter-brand-search"
            type="search"
            className="filter-panel__search input"
            placeholder="Marka ara"
            value={brandQuery}
            onChange={(e) => setBrandQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="filter-panel__check-stack" role="list">
          {visibleBrands.map((b) => {
            const checked = currentBrandSlug === b.slug;
            const meta =
              typeof b.productCount === "number" ? (
                <span className="filter-check__count">{b.productCount}</span>
              ) : undefined;
            return (
              <FilterCheckboxRow
                key={b.id}
                mode="link"
                href={buildFilterUrl(basePath, baseParams, { brandSlug: b.slug })}
                checked={checked}
                label={b.name}
                meta={meta}
              />
            );
          })}
        </div>
        {hasMoreBrands && !showAllBrands ? (
          <button
            type="button"
            className="filter-panel__text-action"
            onClick={() => setShowAllBrands(true)}
          >
            Daha fazla göster
          </button>
        ) : null}
        {currentBrandSlug ? (
          <Link
            href={buildFilterUrl(basePath, baseParams, { brandSlug: null })}
            className="filter-panel__text-action filter-panel__text-action--link"
          >
            Marka filtresini kaldır
          </Link>
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
          <FilterPanelSection title="Cinsiyet" defaultOpen={false}>
            <div className="filter-panel__check-stack">
              <FilterCheckboxRow mode="static" label="Kadın" meta={<span className="filter-check__soon">Yakında</span>} />
              <FilterCheckboxRow mode="static" label="Erkek" meta={<span className="filter-check__soon">Yakında</span>} />
              <FilterCheckboxRow mode="static" label="Unisex" meta={<span className="filter-check__soon">Yakında</span>} />
            </div>
          </FilterPanelSection>

          <div className="filter-panel__divider" aria-hidden />
          <FilterPanelSection title="Ürün puanı" defaultOpen={false}>
            <div className="filter-panel__check-stack">
              <FilterCheckboxRow mode="static" label="4+ yıldız" meta={<span className="filter-check__soon">Yakında</span>} />
            </div>
          </FilterPanelSection>

          <div className="filter-panel__divider" aria-hidden />
          <FilterPanelSection title="Renk" defaultOpen={false}>
            <div className="filter-panel__check-stack">
              <FilterCheckboxRow mode="static" label="Renk filtreleri" meta={<span className="filter-check__soon">Yakında</span>} />
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
          <FilterPanelSection title="Cinsiyet" defaultOpen={false}>
            <div className="filter-panel__check-stack">
              <FilterCheckboxRow mode="static" label="Kadın" meta={<span className="filter-check__soon">Yakında</span>} />
              <FilterCheckboxRow mode="static" label="Erkek" meta={<span className="filter-check__soon">Yakında</span>} />
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
  );
}
