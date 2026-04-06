import { getApiBaseUrl } from "../../src/lib/api-client";
import { fetchJsonArray } from "../../src/lib/server-api-fetch";
import { Header } from "../../src/components/layout/Header";
import { ProductsInfiniteFromList } from "../../src/components/products/ProductsInfiniteFromList";
import type { ProductCardProduct } from "../../src/components/products/ProductCard";

export const dynamic = "force-dynamic";

async function fetchPopularProducts(): Promise<ProductCardProduct[]> {
  const base = getApiBaseUrl();
  return fetchJsonArray<ProductCardProduct>(`${base}/products/popular`, {
    next: { revalidate: 10 }
  });
}

export default async function PopularProductsPage() {
  const products = await fetchPopularProducts();

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "0.75rem" }}>Popüler ürünler</h1>
          <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "1.25rem" }}>
            Son günlerde affiliate yönlendirme tıklaması en çok olan ürünler (mağaza çıkış tıklamaları).
          </p>
          <ProductsInfiniteFromList
            items={products}
            pageSize={20}
            emptyMessage="Su anda listelenecek populer urun bulunamadi."
          />
        </div>
      </main>
    </>
  );
}

