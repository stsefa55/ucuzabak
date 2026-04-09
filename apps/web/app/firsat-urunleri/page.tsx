import { getApiBaseUrl } from "../../src/lib/api-client";
import { fetchJsonArray } from "../../src/lib/server-api-fetch";
import { Header } from "../../src/components/layout/Header";
import { ProductsInfiniteFromList } from "../../src/components/products/ProductsInfiniteFromList";
import type { ProductCardProduct } from "../../src/components/products/ProductCard";

export const dynamic = "force-dynamic";

async function fetchDealProducts(): Promise<ProductCardProduct[]> {
  const base = getApiBaseUrl();
  return fetchJsonArray<ProductCardProduct>(`${base}/products/deals`, {
    next: { revalidate: 10 }
  });
}

export default async function DealProductsPage() {
  const products = await fetchDealProducts();

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "0.35rem" }}>Fırsat ürünleri</h1>
          <p className="text-muted" style={{ fontSize: "0.88rem", marginBottom: "1.25rem" }}>
            En yüksek indirim oranına sahip ürünler.
          </p>
          <ProductsInfiniteFromList
            items={products}
            pageSize={20}
            emptyMessage="Şu anda listelenecek fırsat ürünü bulunamadı."
          />
        </div>
      </main>
    </>
  );
}

