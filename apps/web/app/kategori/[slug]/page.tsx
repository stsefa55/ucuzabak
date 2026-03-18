import Link from "next/link";
import { notFound } from "next/navigation";
import { API_BASE_URL } from "../../../src/lib/api-client";
import { Header } from "../../../src/components/layout/Header";
import { ProductCard } from "../../../src/components/products/ProductCard";
import { SortSelect } from "../../../src/components/products/SortSelect";
import { SearchFilters } from "../../../src/components/search/SearchFilters";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: { slug: string };
  searchParams: {
    sort?: string;
    brandSlug?: string;
    minPrice?: string;
    maxPrice?: string;
    page?: string;
  };
}

async function fetchCategoryPageData(
  slug: string,
  query: { sort?: string; brandSlug?: string; minPrice?: string; maxPrice?: string; page?: string }
) {
  const categoryRes = await fetch(`${API_BASE_URL}/categories/${slug}`, {
    next: { revalidate: 60 }
  });
  if (categoryRes.status === 404) {
    return null;
  }
  const category = await categoryRes.json();

  const searchParams = new URLSearchParams();
  searchParams.set("categorySlug", slug);
  searchParams.set("pageSize", "24");
  searchParams.set("page", query.page ?? "1");
  searchParams.set("sort", query.sort ?? "popular");
  if (query.brandSlug) searchParams.set("brandSlug", query.brandSlug);
  if (query.minPrice) searchParams.set("minPrice", query.minPrice);
  if (query.maxPrice) searchParams.set("maxPrice", query.maxPrice);

  const [productsRes, brandsRes, categoriesWithCountRes] = await Promise.all([
    fetch(`${API_BASE_URL}/products?${searchParams.toString()}`, { next: { revalidate: 10 }, credentials: "include" }),
    fetch(`${API_BASE_URL}/brands`, { next: { revalidate: 300 }, credentials: "include" }),
    fetch(`${API_BASE_URL}/categories/with-counts/list`, { next: { revalidate: 300 }, credentials: "include" })
  ]);

  const productsData = await productsRes.json();
  const brands = await brandsRes.json();
  const categoriesWithCount = await categoriesWithCountRes.json();

  return { category, productsData, brands, categoriesWithCount };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const data = await fetchCategoryPageData(params.slug, searchParams);
  if (!data) {
    notFound();
  }
  const { category, productsData, brands, categoriesWithCount } = data;

  const currentSort = searchParams.sort ?? "popular";
  const categoryPath = `/kategori/${params.slug}`;

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <nav style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            <Link href="/" className="text-muted">
              Anasayfa
            </Link>{" "}
            / <span>{category.name}</span>
          </nav>

          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "1rem" }}>
            {category.name}
          </h1>

          <section className="page-with-filters">
            <SearchFilters
              categoriesWithCount={categoriesWithCount}
              brands={brands}
              searchParams={{
                categorySlug: params.slug,
                brandSlug: searchParams.brandSlug,
                minPrice: searchParams.minPrice,
                maxPrice: searchParams.maxPrice
              }}
              basePath={categoryPath}
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
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label htmlFor="sort" style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                    Sırala:
                  </label>
                  <SortSelect
                    defaultValue={currentSort}
                    searchParams={{
                      brandSlug: searchParams.brandSlug,
                      minPrice: searchParams.minPrice,
                      maxPrice: searchParams.maxPrice
                    }}
                    className="input"
                    style={{ width: "auto", minWidth: "160px" }}
                  />
                </div>
              </div>

              {productsData.items.length === 0 ? (
                <p className="text-muted">Bu kategoride filtrelerinize uygun ürün bulunamadı.</p>
              ) : (
                <div className="grid grid-3">
                  {productsData.items.map((p: { id: string }) => (
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
