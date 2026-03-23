import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { API_BASE_URL } from "../../../src/lib/api-client";
import { categoryPageBasePathFromSlugs } from "../../../src/lib/categoryPaths";
import { Header } from "../../../src/components/layout/Header";
import { ProductCard } from "../../../src/components/products/ProductCard";
import { SortSelect } from "../../../src/components/products/SortSelect";
import { SearchFilters, type CategoryNavigationContext } from "../../../src/components/search/SearchFilters";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: { slug: string[] };
  searchParams: {
    sort?: string;
    brandSlug?: string;
    minPrice?: string;
    maxPrice?: string;
    page?: string;
  };
}

async function fetchCategoryPageData(
  leafSlug: string,
  query: { sort?: string; brandSlug?: string; minPrice?: string; maxPrice?: string; page?: string }
) {
  const categoryRes = await fetch(`${API_BASE_URL}/categories/${encodeURIComponent(leafSlug)}`, {
    next: { revalidate: 60 }
  });
  if (categoryRes.status === 404) {
    return null;
  }
  const category = await categoryRes.json();

  const searchParams = new URLSearchParams();
  searchParams.set("categorySlug", leafSlug);
  searchParams.set("pageSize", "24");
  searchParams.set("page", query.page ?? "1");
  searchParams.set("sort", query.sort ?? "popular");
  if (query.brandSlug) searchParams.set("brandSlug", query.brandSlug);
  if (query.minPrice) searchParams.set("minPrice", query.minPrice);
  if (query.maxPrice) searchParams.set("maxPrice", query.maxPrice);
  const productsUrl = `${API_BASE_URL}/products?${searchParams.toString()}`;

  const productsRes = await fetch(productsUrl, { cache: "no-store" });

  const rawProducts = (await productsRes.json()) as Record<string, unknown>;
  const items = Array.isArray(rawProducts?.items) ? rawProducts.items : [];
  const productsData = {
    ...rawProducts,
    items,
    total: typeof rawProducts?.total === "number" ? rawProducts.total : items.length,
    page: typeof rawProducts?.page === "number" ? rawProducts.page : Number(query.page ?? "1") || 1,
    pageSize: typeof rawProducts?.pageSize === "number" ? rawProducts.pageSize : 24
  };

  if (!productsRes.ok) {
    productsData.items = [];
    productsData.total = 0;
  }

  return { category, productsData };
}

async function fetchCategoryFacets(
  leafSlug: string,
  query: { minPrice?: string; maxPrice?: string }
): Promise<{
  brands: Array<{ id: number; name: string; slug: string; productCount: number }>;
  priceExtent: { min: number | null; max: number | null };
}> {
  const p = new URLSearchParams();
  if (query.minPrice) p.set("minPrice", query.minPrice);
  if (query.maxPrice) p.set("maxPrice", query.maxPrice);
  const url = `${API_BASE_URL}/categories/${encodeURIComponent(leafSlug)}/facets?${p.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return { brands: [], priceExtent: { min: null, max: null } };
  }
  return (await res.json()) as {
    brands: Array<{ id: number; name: string; slug: string; productCount: number }>;
    priceExtent: { min: number | null; max: number | null };
  };
}

async function fetchCategoryNavigation(
  leafSlug: string,
  query: { brandSlug?: string; minPrice?: string; maxPrice?: string }
): Promise<CategoryNavigationContext | null> {
  const p = new URLSearchParams();
  if (query.brandSlug) p.set("brandSlug", query.brandSlug);
  if (query.minPrice) p.set("minPrice", query.minPrice);
  if (query.maxPrice) p.set("maxPrice", query.maxPrice);
  const url = `${API_BASE_URL}/categories/${encodeURIComponent(leafSlug)}/navigation-panel?${p.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as CategoryNavigationContext;
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const segments = params.slug?.filter(Boolean) ?? [];
  if (segments.length === 0) {
    notFound();
  }

  const leafSlug = segments[segments.length - 1];

  const pathRes = await fetch(`${API_BASE_URL}/categories/${encodeURIComponent(leafSlug)}/path`, {
    cache: "no-store"
  });
  if (pathRes.status === 404) {
    notFound();
  }
  const pathJson = (await pathRes.json()) as { pathSlugs: string[]; pathNames: string[] };
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
  const { category, productsData } = data;
  const { brands, priceExtent } = facets;

  const productItems = Array.isArray(productsData?.items)
    ? productsData.items
        .map((item: any) => ({
          id: Number(item?.id),
          name: typeof item?.name === "string" ? item.name : "",
          slug: typeof item?.slug === "string" ? item.slug : "",
          mainImageUrl: typeof item?.mainImageUrl === "string" ? item.mainImageUrl : null,
          lowestPriceCache:
            item?.lowestPriceCache != null ? String(item.lowestPriceCache) : null,
          offerCountCache:
            typeof item?.offerCountCache === "number" ? item.offerCountCache : 0,
          brand:
            item?.brand && typeof item.brand === "object"
              ? {
                  name:
                    typeof item.brand?.name === "string"
                      ? item.brand.name
                      : item.brand?.name ?? null
                }
              : null,
          category:
            item?.category &&
            typeof item.category === "object" &&
            typeof item.category?.slug === "string"
              ? {
                  name:
                    typeof item.category?.name === "string"
                      ? item.category.name
                      : item.category?.name ?? null,
                  slug: item.category.slug
                }
              : null,
          categoryPathSlugs: Array.isArray(item?.categoryPathSlugs)
            ? (item.categoryPathSlugs as string[])
            : undefined,
          categoryPathNames: Array.isArray(item?.categoryPathNames)
            ? (item.categoryPathNames as string[])
            : undefined,
          ean: typeof item?.ean === "string" ? item.ean : null,
          modelNumber: typeof item?.modelNumber === "string" ? item.modelNumber : null,
          specsJson:
            item?.specsJson && typeof item.specsJson === "object"
              ? item.specsJson
              : null
        }))
        .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.slug && item.name)
    : [];

  const currentSort = searchParams.sort ?? "popular";
  const categoryPath = categoryPageBasePathFromSlugs(pathJson.pathSlugs);

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <nav style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
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
                    <span>{name}</span>
                  ) : (
                    <Link href={href} className="text-muted">
                      {name}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>

          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "1rem" }}>
            {category.name}
          </h1>

          <section className="page-with-filters">
            <SearchFilters
              categoryNavigation={categoryNavigation}
              brands={brands}
              priceExtent={priceExtent}
              searchParams={{
                categorySlug: leafSlug,
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

              {productItems.length === 0 ? (
                <p className="text-muted">Bu kategoride filtrelerinize uygun ürün bulunamadı.</p>
              ) : (
                <div className="grid grid-3">
                  {productItems.map((p) => (
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
