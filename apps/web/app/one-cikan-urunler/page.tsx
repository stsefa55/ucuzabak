import { getApiBaseUrl } from "../../src/lib/api-client";
import { fetchJsonArray } from "../../src/lib/server-api-fetch";
import { Header } from "../../src/components/layout/Header";
import { ProductsInfiniteFromList } from "../../src/components/products/ProductsInfiniteFromList";
import type { ProductCardProduct } from "../../src/components/products/ProductCard";

export const dynamic = "force-dynamic";

async function fetchFeaturedProducts(): Promise<ProductCardProduct[]> {
  const base = getApiBaseUrl();
  return fetchJsonArray<ProductCardProduct>(`${base}/products/featured`, {
    next: { revalidate: 10 }
  });
}

export default async function FeaturedProductsPage() {
  const products = await fetchFeaturedProducts();

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "0.35rem" }}>Öne çıkan ürünler</h1>
          <p className="text-muted" style={{ fontSize: "0.88rem", marginBottom: "1.25rem" }}>
            Editör seçimi ile öne çıkarılan ürünler.
          </p>
          <ProductsInfiniteFromList
            items={products}
            pageSize={20}
            emptyMessage="Şu anda öne çıkan olarak işaretlenmiş ürün yok."
          />
        </div>
      </main>
    </>
  );
}
