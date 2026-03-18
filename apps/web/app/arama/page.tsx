import { API_BASE_URL } from "../../src/lib/api-client";
import { Header } from "../../src/components/layout/Header";
import { ProductCard } from "../../src/components/products/ProductCard";
import { SortSelect } from "../../src/components/products/SortSelect";
import { RecordSearchQuery } from "../../src/components/search/RecordSearchQuery";
import { SearchFilters } from "../../src/components/search/SearchFilters";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: {
    q?: string;
    categorySlug?: string;
    brandSlug?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    page?: string;
  };
}

async function fetchSearchData(params: URLSearchParams) {
  const query = params.toString();
  const url = `${API_BASE_URL}/search/products${query ? `?${query}` : ""}`;

  const [productsRes, categoriesWithCountRes, brandsRes] = await Promise.all([
    fetch(url, { cache: "no-store", credentials: "include" }),
    fetch(`${API_BASE_URL}/categories/with-counts/list`, { next: { revalidate: 300 }, credentials: "include" }),
    fetch(`${API_BASE_URL}/brands`, { next: { revalidate: 300 }, credentials: "include" })
  ]);

  const productsData = await productsRes.json();
  const categoriesWithCount = await categoriesWithCountRes.json();
  const brands = await brandsRes.json();

  return { productsData, categoriesWithCount, brands };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.categorySlug) params.set("categorySlug", searchParams.categorySlug);
  if (searchParams.brandSlug) params.set("brandSlug", searchParams.brandSlug);
  if (searchParams.minPrice) params.set("minPrice", searchParams.minPrice);
  if (searchParams.maxPrice) params.set("maxPrice", searchParams.maxPrice);
  params.set("sort", searchParams.sort ?? "popular");
  params.set("page", searchParams.page ?? "1");
  params.set("pageSize", "20");

  const { productsData, categoriesWithCount, brands } = await fetchSearchData(params);

  const currentSort = searchParams.sort ?? "popular";

  return (
    <>
      <RecordSearchQuery query={searchParams.q} />
      <Header />
      <main className="main">
        <div className="container">
          {searchParams.q && (
            <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>
              &quot;{searchParams.q}&quot; için sonuçlar
            </p>
          )}

          <section className="page-with-filters">
            <SearchFilters
              categoriesWithCount={categoriesWithCount}
              brands={brands}
              searchParams={{
                q: searchParams.q,
                categorySlug: searchParams.categorySlug,
                brandSlug: searchParams.brandSlug,
                minPrice: searchParams.minPrice,
                maxPrice: searchParams.maxPrice
              }}
            />

            <section>
              <div
                className="page-with-filters__toolbar"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  marginBottom: "0.75rem"
                }}
              >
                <SortSelect
                  defaultValue={currentSort}
                  searchParams={{
                    q: searchParams.q,
                    categorySlug: searchParams.categorySlug,
                    brandSlug: searchParams.brandSlug,
                    minPrice: searchParams.minPrice,
                    maxPrice: searchParams.maxPrice
                  }}
                  labelInTrigger
                  className="input"
                  style={{ minWidth: "220px" }}
                />
              </div>
              {productsData.items.length === 0 ? (
                <p className="text-muted" style={{ fontSize: "0.9rem" }}>
                  Filtrelerinize uygun ürün bulunamadı.
                </p>
              ) : (
                <div className="grid grid-3">
                  {productsData.items.map((p: any) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
    </>
  );
}

