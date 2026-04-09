import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getApiBaseUrl } from "../../../src/lib/api-client";
import { asArray, fetchJsonOrNull } from "../../../src/lib/server-api-fetch";
import { categoryPageBasePathFromSlugs } from "../../../src/lib/categoryPaths";
import { Header } from "../../../src/components/layout/Header";
import type { ProductCardProduct } from "../../../src/components/products/ProductCard";
import { mapApiProductToCardProduct } from "../../../src/lib/mapApiProductToCardProduct";
import { ProductsInfiniteFromApi } from "../../../src/components/products/ProductsInfiniteFromApi";
import { SortSelect } from "../../../src/components/products/SortSelect";
import { CategoryListingEmpty } from "../../../src/components/category/CategoryListingEmpty";
import { ListingActiveFilterChips } from "../../../src/components/search/ListingActiveFilterChips";
import { SearchFilters, type CategoryNavigationContext } from "../../../src/components/search/SearchFilters";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: { slug: string[] };
  searchParams: {
    sort?: string;
    brandSlug?: string;
    brandSlugs?: string;
    minPrice?: string;
    maxPrice?: string;
  };
}

async function fetchCategoryPageData(
  leafSlug: string,
  query: { sort?: string; brandSlug?: string; brandSlugs?: string; minPrice?: string; maxPrice?: string }
) {
  const base = getApiBaseUrl();
  const searchParams = new URLSearchParams();
  searchParams.set("categorySlug", leafSlug);
  searchParams.set("pageSize", "20");
  searchParams.set("page", "1");
  searchParams.set("sort", query.sort ?? "popular");
  if (query.brandSlugs?.trim()) searchParams.set("brandSlugs", query.brandSlugs.trim());
  else if (query.brandSlug) searchParams.set("brandSlug", query.brandSlug);
  if (query.minPrice) searchParams.set("minPrice", query.minPrice);
  if (query.maxPrice) searchParams.set("maxPrice", query.maxPrice);
  const productsUrl = `${base}/products?${searchParams.toString()}`;

  const productsRes = await fetch(productsUrl, { cache: "no-store" });

  let rawProducts: Record<string, unknown> = {};
  if (productsRes.ok) {
    const pt = await productsRes.text();
    if (pt?.trim()) {
      try {
        const parsed = JSON.parse(pt) as unknown;
        rawProducts =
          parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
      } catch {
        rawProducts = {};
      }
    }
  }

  const items = asArray<unknown>(rawProducts?.items);
  const productsData = {
    ...rawProducts,
    items,
    total: typeof rawProducts?.total === "number" ? rawProducts.total : items.length,
    page: typeof rawProducts?.page === "number" ? rawProducts.page : 1,
    pageSize: typeof rawProducts?.pageSize === "number" ? rawProducts.pageSize : 20
  };

  if (!productsRes.ok) {
    productsData.items = [];
    productsData.total = 0;
  }

  return {
    productsData
  };
}

async function fetchCategoryFacets(
  leafSlug: string,
  query: { minPrice?: string; maxPrice?: string }
): Promise<{
  brands: Array<{ id: number; name: string; slug: string; productCount: number }>;
  priceExtent: { min: number | null; max: number | null };
}> {
  const base = getApiBaseUrl();
  const p = new URLSearchParams();
  if (query.minPrice) p.set("minPrice", query.minPrice);
  if (query.maxPrice) p.set("maxPrice", query.maxPrice);
  const url = `${base}/categories/${encodeURIComponent(leafSlug)}/facets?${p.toString()}`;
  const data = await fetchJsonOrNull<{
    brands?: unknown;
    priceExtent?: { min: number | null; max: number | null };
  }>(url, { cache: "no-store" });
  if (!data) {
    return { brands: [], priceExtent: { min: null, max: null } };
  }
  return {
    brands: asArray<{ id: number; name: string; slug: string; productCount: number }>(data.brands),
    priceExtent: data.priceExtent ?? { min: null, max: null }
  };
}

async function fetchCategoryNavigation(
  leafSlug: string,
  query: { brandSlug?: string; brandSlugs?: string; minPrice?: string; maxPrice?: string }
): Promise<CategoryNavigationContext | null> {
  const base = getApiBaseUrl();
  const p = new URLSearchParams();
  if (query.brandSlugs?.trim()) p.set("brandSlugs", query.brandSlugs.trim());
  else if (query.brandSlug) p.set("brandSlug", query.brandSlug);
  if (query.minPrice) p.set("minPrice", query.minPrice);
  if (query.maxPrice) p.set("maxPrice", query.maxPrice);
  const url = `${base}/categories/${encodeURIComponent(leafSlug)}/navigation-panel?${p.toString()}`;
  return fetchJsonOrNull<CategoryNavigationContext>(url, { cache: "no-store" });
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const segments = params.slug?.filter(Boolean) ?? [];
  if (segments.length === 0) {
    notFound();
  }

  const leafSlug = segments[segments.length - 1];

  const pathRes = await fetch(`${getApiBaseUrl()}/categories/${encodeURIComponent(leafSlug)}/path`, {
    cache: "no-store"
  });
  if (pathRes.status === 404) {
    notFound();
  }
  if (!pathRes.ok) {
    notFound();
  }
  const pathText = await pathRes.text();
  let pathJson: { pathSlugs: string[]; pathNames: string[] } | null = null;
  try {
    pathJson = pathText ? (JSON.parse(pathText) as { pathSlugs: string[]; pathNames: string[] }) : null;
  } catch {
    pathJson = null;
  }
  if (
    !pathJson ||
    !Array.isArray(pathJson.pathSlugs) ||
    !Array.isArray(pathJson.pathNames) ||
    pathJson.pathSlugs.length === 0
  ) {
    notFound();
  }
  const canonicalPath = pathJson.pathSlugs.join("/");
  const urlPath = segments.join("/");
  if (canonicalPath !== urlPath) {
    permanentRedirect(`/kategori/${canonicalPath}`);
  }

  const [data, categoryNavigation, facets] = await Promise.all([
    fetchCategoryPageData(leafSlug, searchParams),
    fetchCategoryNavigation(leafSlug, searchParams),
    fetchCategoryFacets(leafSlug, searchParams)
  ]);
  if (!data) {
    notFound();
  }
  const { productsData } = data;
  const { brands, priceExtent } = facets;
  const categoryName = pathJson.pathNames[pathJson.pathNames.length - 1] ?? leafSlug;

  const productItems = Array.isArray(productsData?.items)
    ? (productsData.items as unknown[])
        .map(mapApiProductToCardProduct)
        .filter((item): item is ProductCardProduct => item != null)
    : [];
  const initialPage = {
    items: productItems as ProductCardProduct[],
    total: typeof productsData?.total === "number" ? productsData.total : productItems.length,
    page: 1,
    pageSize: typeof productsData?.pageSize === "number" ? productsData.pageSize : 20
  };

  const currentSort = searchParams.sort ?? "popular";
  const categoryPath = categoryPageBasePathFromSlugs(pathJson.pathSlugs);

  const hasListingFilters = Boolean(
    searchParams.brandSlug?.trim() ||
      searchParams.brandSlugs?.trim() ||
      searchParams.minPrice?.trim() ||
      searchParams.maxPrice?.trim()
  );
  const clearFilterParams = new URLSearchParams();
  if (currentSort && currentSort !== "popular") clearFilterParams.set("sort", currentSort);
  const clearFiltersHref = `${categoryPath}${clearFilterParams.toString() ? `?${clearFilterParams.toString()}` : ""}`;
  const parentNav = categoryNavigation?.parent;
  const parentCategoryHref = parentNav?.pathSlugs?.length
    ? categoryPageBasePathFromSlugs(parentNav.pathSlugs)
    : undefined;

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "1rem" }}>
            {categoryName}
          </h1>

          <section className="page-with-filters">
            <SearchFilters
              categoryNavigation={categoryNavigation}
              brands={brands}
              priceExtent={priceExtent}
              sort={currentSort}
              searchParams={{
                categorySlug: leafSlug,
                brandSlug: searchParams.brandSlug,
                brandSlugs: searchParams.brandSlugs,
                minPrice: searchParams.minPrice,
                maxPrice: searchParams.maxPrice
              }}
              basePath={categoryPath}
            />

            <section>
              <ListingActiveFilterChips
                mode="category"
                basePath={categoryPath}
                sort={currentSort}
                brands={brands}
                searchParams={{
                  categorySlug: leafSlug,
                  brandSlug: searchParams.brandSlug,
                  brandSlugs: searchParams.brandSlugs,
                  minPrice: searchParams.minPrice,
                  maxPrice: searchParams.maxPrice
                }}
              />
              <div className="page-with-filters__main-head">
                <nav className="page-with-filters__breadcrumb text-muted" aria-label="Sayfa konumu">
                  <Link href="/" className="text-muted">
                    Anasayfa
                  </Link>
                  {pathJson.pathSlugs.map((slug, i) => {
                    const name = pathJson.pathNames[i] ?? slug;
                    const isLast = i === pathJson.pathSlugs.length - 1;
                    const href = categoryPageBasePathFromSlugs(pathJson.pathSlugs.slice(0, i + 1));
                    return (
                      <span key={`${slug}-${i}`}>
                        {" "}
                        /{" "}
                        {isLast ? (
                          <span className="page-with-filters__breadcrumb-current">{name}</span>
                        ) : (
                          <Link href={href} className="text-muted">
                            {name}
                          </Link>
                        )}
                      </span>
                    );
                  })}
                </nav>
                <div className="page-with-filters__toolbar">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <label htmlFor="sort" style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                      Sırala:
                    </label>
                    <SortSelect
                      defaultValue={currentSort}
                      searchParams={{
                        brandSlug: searchParams.brandSlug,
                        brandSlugs: searchParams.brandSlugs,
                        minPrice: searchParams.minPrice,
                        maxPrice: searchParams.maxPrice,
                        sort: currentSort
                      }}
                      className="input"
                      style={{ width: "auto", minWidth: "160px" }}
                    />
                  </div>
                </div>
              </div>

              <ProductsInfiniteFromApi
                queryKeyPrefix="category-infinite"
                endpoint="/products"
                query={{
                  categorySlug: leafSlug,
                  brandSlug: searchParams.brandSlug,
                  brandSlugs: searchParams.brandSlugs,
                  minPrice: searchParams.minPrice,
                  maxPrice: searchParams.maxPrice,
                  sort: currentSort
                }}
                initialPage={initialPage}
                emptyState={
                  <CategoryListingEmpty
                    categoryName={categoryName}
                    hasFilters={hasListingFilters}
                    clearFiltersHref={clearFiltersHref}
                    parentHref={parentCategoryHref}
                    parentName={parentNav?.name}
                  />
                }
              />
            </section>
          </section>
        </div>
      </main>
    </>
  );
}
