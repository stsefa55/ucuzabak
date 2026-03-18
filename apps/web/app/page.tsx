import Link from "next/link";
import { API_BASE_URL } from "../src/lib/api-client";
import { Header } from "../src/components/layout/Header";
import { HomeBannerCarousel } from "../src/components/home/HomeBannerCarousel";
import { ProductRailWithNav } from "../src/components/home/ProductRailWithNav";
import { RecentlyViewedRail } from "../src/components/home/RecentlyViewedRail";
import { ProductCard } from "../src/components/products/ProductCard";

export const dynamic = "force-dynamic";

const EMPTY_HOME_DATA = {
  productsData: { items: [], total: 0 },
  popularProducts: [] as any[],
  priceDropProducts: [] as any[],
  dealProducts: [] as any[]
};

async function fetchHomeData() {
  try {
    const [resProducts, resPopular, resPriceDrops, resDeals] = await Promise.all([
      fetch(`${API_BASE_URL}/products/most-clicked`, { next: { revalidate: 10 }, credentials: "include" }),
      fetch(`${API_BASE_URL}/products/popular`, { next: { revalidate: 10 }, credentials: "include" }),
      fetch(`${API_BASE_URL}/products/price-drops`, { next: { revalidate: 10 }, credentials: "include" }),
      fetch(`${API_BASE_URL}/products/deals`, { next: { revalidate: 10 }, credentials: "include" })
    ]);
    const [rawProducts, popularProducts, priceDropProducts, dealProducts] = await Promise.all([
      resProducts.ok ? resProducts.json() : null,
      resPopular.ok ? resPopular.json() : [],
      resPriceDrops.ok ? resPriceDrops.json() : [],
      resDeals.ok ? resDeals.json() : []
    ]);
    const mostClicked = Array.isArray(rawProducts) ? rawProducts : [];
    const productsData =
      mostClicked.length > 0
        ? { items: mostClicked, total: mostClicked.length }
        : { items: popularProducts, total: popularProducts.length };
    return { productsData, popularProducts, priceDropProducts, dealProducts };
  } catch {
    return EMPTY_HOME_DATA;
  }
}

export default async function HomePage() {
  const { productsData, popularProducts, priceDropProducts, dealProducts } = await fetchHomeData();

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <HomeBannerCarousel />

          <section style={{ marginBottom: "2rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem"
              }}
            >
              <Link href="/arama" style={{ color: "inherit" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Öne çıkan ürünler</h2>
              </Link>
              <Link href="/arama" className="text-muted" style={{ fontSize: "0.85rem" }}>
                Tümünü gör
              </Link>
            </div>
            {productsData.items.length === 0 ? (
              <p className="text-muted">Henüz ürün bulunamadı.</p>
            ) : (
              <div className="grid grid-3">
                {productsData.items.slice(0, 6).map((p: any) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </section>

          <RecentlyViewedRail />

          <section style={{ marginTop: "2rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "0.5rem"
              }}
            >
              <Link href="/populer-urunler" style={{ color: "inherit" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Popüler ürünler</h2>
              </Link>
              <Link href="/populer-urunler" className="text-muted" style={{ fontSize: "0.85rem" }}>
                Tümünü gör
              </Link>
            </div>
            {popularProducts.length === 0 ? (
              <p className="text-muted">Henüz popüler ürün bulunamadı.</p>
            ) : (
              <ProductRailWithNav ariaLabel="Popüler ürünler">
                {popularProducts.slice(0, 12).map((p: any) => (
                  <div key={p.id} className="product-rail-card">
                    <ProductCard product={p} />
                  </div>
                ))}
              </ProductRailWithNav>
            )}
          </section>

          <section style={{ marginTop: "2rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "0.5rem"
              }}
            >
              <Link href="/fiyati-dusen-urunler" style={{ color: "inherit" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Fiyatı düşen ürünler</h2>
              </Link>
              <Link href="/fiyati-dusen-urunler" className="text-muted" style={{ fontSize: "0.85rem" }}>
                Tümünü gör
              </Link>
            </div>
            {priceDropProducts.length === 0 ? (
              <p className="text-muted">Henüz fiyatı düşen ürün bulunamadı.</p>
            ) : (
              <ProductRailWithNav ariaLabel="Fiyatı düşen ürünler">
                {priceDropProducts.slice(0, 12).map((p: any) => (
                  <div key={p.id} className="product-rail-card">
                    <ProductCard product={p} />
                  </div>
                ))}
              </ProductRailWithNav>
            )}
          </section>

          <section style={{ marginTop: "2rem", marginBottom: "1rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "0.5rem"
              }}
            >
              <Link href="/firsat-urunleri" style={{ color: "inherit" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Fırsat ürünleri</h2>
              </Link>
              <Link href="/firsat-urunleri" className="text-muted" style={{ fontSize: "0.85rem" }}>
                Tümünü gör
              </Link>
            </div>
            {dealProducts.length === 0 ? (
              <p className="text-muted">Henüz fırsat ürünü bulunamadı.</p>
            ) : (
              <ProductRailWithNav ariaLabel="Fırsat ürünleri">
                {dealProducts.slice(0, 12).map((p: any) => (
                  <div key={p.id} className="product-rail-card">
                    <ProductCard product={p} />
                  </div>
                ))}
              </ProductRailWithNav>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

