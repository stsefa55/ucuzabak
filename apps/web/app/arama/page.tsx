import Link from "next/link";
import { getApiBaseUrl } from "../../src/lib/api-client";
import { asArray, fetchJsonOrNull } from "../../src/lib/server-api-fetch";
import { Header } from "../../src/components/layout/Header";
import { SortSelect } from "../../src/components/products/SortSelect";
import type { ProductCardProduct } from "../../src/components/products/ProductCard";
import { RecordSearchQuery } from "../../src/components/search/RecordSearchQuery";
import { ListingActiveFilterChips } from "../../src/components/search/ListingActiveFilterChips";
import { SearchFilters } from "../../src/components/search/SearchFilters";
import { SearchEmptyState } from "../../src/components/search/SearchEmptyState";
import { SearchResultsInfinite } from "../../src/components/search/SearchResultsInfinite";
import { RecentlyViewedRail } from "../../src/components/home/RecentlyViewedRail";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: {
    q?: string;
    categorySlug?: string;
    categorySlugs?: string;
    brandSlug?: string;
    brandSlugs?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    page?: string;
  };
}

type CategoryWithCount = {
  id: number;
  name: string;
  slug: string;
  productCount: number;
  iconName?: string | null;
  imageUrl?: string | null;
};

type Brand = {
  id: number;
  name: string;
  slug: string;
  productCount?: number;
};

async function fetchSearchData(productParams: URLSearchParams, facetParams: URLSearchParams) {
  const base = getApiBaseUrl();
  const productQuery = productParams.toString();
  const facetQuery = facetParams.toString();
  const url = `${base}/search/products${productQuery ? `?${productQuery}` : ""}`;

  let fetchError = false;

  const productsRaw = await fetchJsonOrNull<{ items?: ProductCardProduct[]; total?: number }>(url, {
    cache: "no-store"
  });
  if (productsRaw === null) fetchError = true;
  const productsData = productsRaw ?? { items: [], total: 0 };

  const categoriesWithCount =
    (await fetchJsonOrNull<CategoryWithCount[]>(`${base}/search/category-facets${facetQuery ? `?${facetQuery}` : ""}`, {
      cache: "no-store"
    })) ?? [];
  const brands =
    (await fetchJsonOrNull<Brand[]>(`${base}/search/brand-facets${facetQuery ? `?${facetQuery}` : ""}`, {
      cache: "no-store"
    })) ?? [];

  const popularRaw = await fetchJsonOrNull<unknown>(`${base}/search/popular-queries?limit=20`, {
    cache: "no-store"
  });
  const popularQueries = Array.isArray(popularRaw)
    ? popularRaw.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];

  const categoriesRoots =
    (await fetchJsonOrNull<Array<{ id: number; name: string; slug: string }>>(`${base}/categories`, {
      next: { revalidate: 300 }
    })) ?? [];
  const seenCat = new Set<string>();
  const popularCategories: { name: string; slug: string }[] = [];
  for (const c of categoriesRoots) {
    if (!c || typeof c.slug !== "string" || typeof c.name !== "string") continue;
    if (seenCat.has(c.slug)) continue;
    seenCat.add(c.slug);
    popularCategories.push({ name: c.name, slug: c.slug });
  }

  const safeProductsData = {
    ...productsData,
    items: asArray(productsData.items),
    total: typeof productsData.total === "number" ? productsData.total : asArray(productsData.items).length
  };

  return { productsData: safeProductsData, categoriesWithCount, brands, popularQueries, popularCategories, fetchError };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const productParams = new URLSearchParams();
  const facetParams = new URLSearchParams();
  if (searchParams.q) {
    productParams.set("q", searchParams.q);
    facetParams.set("q", searchParams.q);
  }
  if (searchParams.categorySlugs) {
    productParams.set("categorySlugs", searchParams.categorySlugs);
    facetParams.set("categorySlugs", searchParams.categorySlugs);
  } else if (searchParams.categorySlug) {
    productParams.set("categorySlug", searchParams.categorySlug);
    facetParams.set("categorySlug", searchParams.categorySlug);
  }
  if (searchParams.brandSlugs) {
    productParams.set("brandSlugs", searchParams.brandSlugs);
    facetParams.set("brandSlugs", searchParams.brandSlugs);
  } else if (searchParams.brandSlug) {
    productParams.set("brandSlug", searchParams.brandSlug);
    facetParams.set("brandSlug", searchParams.brandSlug);
  }
  if (searchParams.minPrice) {
    productParams.set("minPrice", searchParams.minPrice);
    facetParams.set("minPrice", searchParams.minPrice);
  }
  if (searchParams.maxPrice) {
    productParams.set("maxPrice", searchParams.maxPrice);
    facetParams.set("maxPrice", searchParams.maxPrice);
  }
  const resolvedSort = searchParams.sort ?? "popular";
  productParams.set("sort", resolvedSort);
  // Infinite scroll daima ilk sayfadan başlar; sonraki sayfaları client yükler.
  productParams.set("page", "1");
  productParams.set("pageSize", "20");

  const { productsData, categoriesWithCount, brands, popularQueries, popularCategories, fetchError } =
    await fetchSearchData(productParams, facetParams);

  const currentSort = resolvedSort;

  const hasFilters = Boolean(
    searchParams.categorySlug ||
      searchParams.categorySlugs ||
      searchParams.brandSlug ||
      searchParams.brandSlugs ||
      searchParams.minPrice ||
      searchParams.maxPrice
  );

  const hasResults = productsData.total > 0;

  return (
    <>
      <RecordSearchQuery query={searchParams.q} />
      <Header />
      <main className="main">
        <div className="container">
          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "1rem" }}>
            {searchParams.q ? `"${searchParams.q}" araması` : "Arama"}
          </h1>

          {fetchError && (
            <div className="search-error-banner" role="alert">
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>
                Arama sonuçları yüklenirken bir sorun oluştu
              </p>
              <p className="text-muted" style={{ margin: "0.25rem 0 0", fontSize: "0.84rem" }}>
                Sunucu geçici olarak yanıt vermiyor olabilir. Lütfen sayfayı yenileyin veya biraz sonra tekrar deneyin.
              </p>
            </div>
          )}

          <section className="page-with-filters">
            <SearchFilters
              categoriesWithCount={categoriesWithCount}
              brands={brands}
              sort={currentSort}
              searchParams={{
                q: searchParams.q,
                categorySlug: searchParams.categorySlug,
                categorySlugs: searchParams.categorySlugs,
                brandSlug: searchParams.brandSlug,
                brandSlugs: searchParams.brandSlugs,
                minPrice: searchParams.minPrice,
                maxPrice: searchParams.maxPrice
              }}
            />

            <section>
              {hasResults ? (
                <>
                  <ListingActiveFilterChips
                    mode="search"
                    basePath="/arama"
                    sort={currentSort}
                    categoriesWithCount={categoriesWithCount}
                    brands={brands}
                    searchParams={{
                      q: searchParams.q,
                      categorySlug: searchParams.categorySlug,
                      categorySlugs: searchParams.categorySlugs,
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
                      <span> / </span>
                      <span className="page-with-filters__breadcrumb-current">
                        {searchParams.q ? `"${searchParams.q}" araması` : "Arama"}
                      </span>
                    </nav>
                    <div className="page-with-filters__toolbar">
                      <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                        <strong style={{ color: "#334155" }}>{productsData.total}</strong> sonuç
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <label htmlFor="sort" style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                          Sırala:
                        </label>
                        <SortSelect
                          defaultValue={currentSort}
                          searchParams={{
                            q: searchParams.q,
                            categorySlug: searchParams.categorySlug,
                            categorySlugs: searchParams.categorySlugs,
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
                </>
              ) : null}
              <SearchResultsInfinite
                query={{
                  q: searchParams.q,
                  categorySlug: searchParams.categorySlug,
                  categorySlugs: searchParams.categorySlugs,
                  brandSlug: searchParams.brandSlug,
                  brandSlugs: searchParams.brandSlugs,
                  minPrice: searchParams.minPrice,
                  maxPrice: searchParams.maxPrice,
                  sort: currentSort
                }}
                initialPage={{
                  items: productsData.items as ProductCardProduct[],
                  total: productsData.total,
                  page: 1,
                  pageSize: 20
                }}
                emptyState={
                  <SearchEmptyState
                    q={searchParams.q}
                    hasFilters={hasFilters}
                    popularQueries={popularQueries}
                    popularCategories={popularCategories}
                    sort={currentSort}
                  />
                }
              />
            </section>
          </section>

          {productsData.total === 0 ? <RecentlyViewedRail /> : null}
        </div>
      </main>
    </>
  );
}

