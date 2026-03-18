import { API_BASE_URL } from "../../src/lib/api-client";
import { Header } from "../../src/components/layout/Header";
import { ProductCard } from "../../src/components/products/ProductCard";

export const dynamic = "force-dynamic";

async function fetchDealProducts() {
  const res = await fetch(`${API_BASE_URL}/products/deals`, {
    next: { revalidate: 10 },
    credentials: "include"
  });
  return res.json();
}

export default async function DealProductsPage() {
  const products = await fetchDealProducts();

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "0.75rem" }}>Fırsat ürünleri</h1>
          <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "1.25rem" }}>
            İndirimi en yüksek, öne çıkan fırsat ürünleri.
          </p>
          {(!products || products.length === 0) && (
            <p className="text-muted">Şu anda listelenecek fırsat ürünü bulunamadı.</p>
          )}
          {products && products.length > 0 && (
            <div className="grid grid-3">
              {products.map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

