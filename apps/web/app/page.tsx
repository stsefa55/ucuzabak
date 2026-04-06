import { getApiBaseUrl } from "../src/lib/api-client";
import { Header } from "../src/components/layout/Header";
import { HomeBannerCarousel } from "../src/components/home/HomeBannerCarousel";
import { HomeCategoryShortcuts, type HomeCategoryItem } from "../src/components/home/HomeCategoryShortcuts";
import { HomeSectionHeader } from "../src/components/home/HomeSectionHeader";
import { ProductRailWithNav } from "../src/components/home/ProductRailWithNav";
import { RecentlyViewedRail } from "../src/components/home/RecentlyViewedRail";
import { ProductCard } from "../src/components/products/ProductCard";

export const dynamic = "force-dynamic";

const EMPTY_HOME_DATA = {
  featuredProducts: [] as any[],
  popularProducts: [] as any[],
  priceDropProducts: [] as any[],
  dealProducts: [] as any[],
  homeCategories: [] as HomeCategoryItem[]
};

async function fetchHomeData() {
  const base = getApiBaseUrl();
  try {
    const [resFeatured, resPopular, resPriceDrops, resDeals, resCategories] = await Promise.all([
      fetch(`${base}/products/featured`, { next: { revalidate: 10 } }),
      fetch(`${base}/products/popular`, { next: { revalidate: 10 } }),
      fetch(`${base}/products/price-drops`, { next: { revalidate: 10 } }),
      fetch(`${base}/products/deals`, { next: { revalidate: 10 } }),
      fetch(`${base}/categories`, { next: { revalidate: 120 } })
    ]);
    const [featuredProducts, popularProducts, priceDropProducts, dealProducts, rawCategories] = await Promise.all([
      resFeatured.ok ? resFeatured.json() : [],
      resPopular.ok ? resPopular.json() : [],
      resPriceDrops.ok ? resPriceDrops.json() : [],
      resDeals.ok ? resDeals.json() : [],
      resCategories.ok ? resCategories.json() : []
    ]);
    const homeCategories: HomeCategoryItem[] = Array.isArray(rawCategories)
      ? rawCategories
          .filter((c: any) => c && typeof c.slug === "string" && typeof c.name === "string" && c.id != null)
          .map((c: any) => ({ id: Number(c.id), name: String(c.name), slug: String(c.slug) }))
      : [];
    return {
      featuredProducts: Array.isArray(featuredProducts) ? featuredProducts : [],
      popularProducts: Array.isArray(popularProducts) ? popularProducts : [],
      priceDropProducts: Array.isArray(priceDropProducts) ? priceDropProducts : [],
      dealProducts: Array.isArray(dealProducts) ? dealProducts : [],
      homeCategories
    };
  } catch {
    return EMPTY_HOME_DATA;
  }
}

export default async function HomePage() {
  const { featuredProducts, popularProducts, priceDropProducts, dealProducts, homeCategories } = await fetchHomeData();

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <HomeBannerCarousel />
          <HomeCategoryShortcuts categories={homeCategories} />

          <section style={{ marginBottom: "2rem" }}>
            <HomeSectionHeader title="Öne çıkan ürünler" href="/one-cikan-urunler" />
            {featuredProducts.length === 0 ? (
              <p className="home-section__empty">
                Henüz öne çıkan ürün yok. Yönetim panelinden ürün işaretleyebilirsiniz.
              </p>
            ) : (
              <div className="grid grid-3">
                {featuredProducts.slice(0, 10).map((p: any) => (
                  <ProductCard key={p.id} product={p} showFeaturedBadge />
                ))}
              </div>
            )}
          </section>

          <RecentlyViewedRail />

          <section style={{ marginTop: "2rem" }}>
            <HomeSectionHeader title="Popüler ürünler" href="/populer-urunler" />
            {popularProducts.length === 0 ? (
              <p className="home-section__empty">Henüz popüler ürün bulunamadı.</p>
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
            <HomeSectionHeader title="Fiyatı düşen ürünler" href="/fiyati-dusen-urunler" />
            {priceDropProducts.length === 0 ? (
              <p className="home-section__empty">Henüz fiyatı düşen ürün bulunamadı.</p>
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
            <HomeSectionHeader title="Fırsat ürünleri" href="/firsat-urunleri" />
            {dealProducts.length === 0 ? (
              <p className="home-section__empty">Henüz fırsat ürünü bulunamadı.</p>
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

