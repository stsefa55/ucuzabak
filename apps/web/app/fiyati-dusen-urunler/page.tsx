import { getApiBaseUrl } from "../../src/lib/api-client";
import { fetchJsonArray } from "../../src/lib/server-api-fetch";
import { Header } from "../../src/components/layout/Header";
import { ProductsInfiniteFromList } from "../../src/components/products/ProductsInfiniteFromList";
import type { ProductCardProduct } from "../../src/components/products/ProductCard";

export const dynamic = "force-dynamic";

async function fetchPriceDroppedProducts(): Promise<ProductCardProduct[]> {
  const base = getApiBaseUrl();
  return fetchJsonArray<ProductCardProduct>(`${base}/products/price-drops`, {
    next: { revalidate: 10 }
  });
}

export default async function PriceDroppedProductsPage() {
  const products = await fetchPriceDroppedProducts();

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            Fiyatı düşen ürünler
          </h1>
          <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "1.25rem" }}>
            Fiyat geçmişine göre: güncel kayıt, yakın geçmişteki en yüksek fiyatın altına düşmüş teklifler (ürün bazında en güçlü düşüş).
          </p>
          <ProductsInfiniteFromList
            items={products}
            pageSize={20}
            emptyMessage="Su anda listelenecek fiyati dusen urun bulunamadi."
          />
        </div>
      </main>
    </>
  );
}

