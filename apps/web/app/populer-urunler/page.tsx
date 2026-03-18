import { API_BASE_URL } from "../../src/lib/api-client";
import { Header } from "../../src/components/layout/Header";
import { ProductCard } from "../../src/components/products/ProductCard";

export const dynamic = "force-dynamic";

async function fetchPopularProducts() {
  const res = await fetch(`${API_BASE_URL}/products/popular`, {
    next: { revalidate: 10 }
  });
  return res.json();
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
            En çok teklife sahip, kullanıcıların en çok ilgi gösterdiği ürünler.
          </p>
          {(!products || products.length === 0) && (
            <p className="text-muted">Şu anda listelenecek popüler ürün bulunamadı.</p>
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

