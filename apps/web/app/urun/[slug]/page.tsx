import Link from "next/link";
import { notFound } from "next/navigation";
import { API_BASE_URL } from "../../../src/lib/api-client";
import { Header } from "../../../src/components/layout/Header";
import { ProductFavoriteSection } from "../../../src/components/products/ProductFavoriteSection";
import { ProductPriceAlertSection } from "../../../src/components/products/ProductPriceAlertSection";
import { PriceHistoryChart } from "../../../src/components/products/PriceHistoryChart";
import { ProductCard } from "../../../src/components/products/ProductCard";
import { ProductGallery } from "../../../src/components/products/ProductGallery";
import { RecordProductView } from "../../../src/components/products/RecordProductView";
import { Card } from "../../../src/components/ui/card";
import { Badge } from "../../../src/components/ui/badge";
import { Tag, Store } from "lucide-react";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: { slug: string };
}

async function fetchProduct(slug: string) {
  const res = await fetch(`${API_BASE_URL}/products/${slug}`, {
    next: { revalidate: 0 }
  });
  if (res.status === 404) {
    return null;
  }
  return res.json();
}

async function fetchOffers(slug: string) {
  const res = await fetch(`${API_BASE_URL}/products/${slug}/offers`, {
    next: { revalidate: 0 }
  });
  return res.json();
}

async function fetchSimilar(slug: string) {
  const res = await fetch(`${API_BASE_URL}/products/${slug}/similar`, {
    next: { revalidate: 60 }
  });
  return res.json();
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await fetchProduct(params.slug);
  if (!product) {
    notFound();
  }
  const [offers, similarProducts] = await Promise.all([
    fetchOffers(params.slug),
    fetchSimilar(params.slug)
  ]);

  const lowestOffer = offers.length > 0 ? offers[0] : null;
  const lowestPrice =
    lowestOffer?.currentPrice != null
      ? `${lowestOffer.currentPrice} TL`
      : product.lowestPriceCache != null
      ? `${product.lowestPriceCache} TL`
      : "Fiyat bilgisi yok";

  return (
    <>
      <RecordProductView slug={params.slug} />
      <Header />
      <main className="main">
        <div className="container">
          <nav style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            <Link href="/" className="text-muted">
              Anasayfa
            </Link>
            {product.category && (
              <>
                {" "}
                /{" "}
                <Link href={`/kategori/${product.category.slug}`} className="text-muted">
                  {product.category.name}
                </Link>
              </>
            )}{" "}
            / <span>{product.name}</span>
          </nav>

          <section style={{ marginBottom: "1.5rem" }}>
            <Card style={{ padding: "1.25rem" }}>
              <div
                className="product-detail-hero"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(200px, 320px) minmax(0, 1fr)",
                  gap: "1.5rem",
                  alignItems: "flex-start"
                }}
              >
                <ProductGallery
                  productName={product.name}
                  mainImageUrl={product.mainImageUrl}
                  images={product.productImages}
                />
                <div>
                  <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1.25 }}>
                    {product.name}
                  </h1>
                  <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                    {product.brand?.name && <span>{product.brand.name}</span>}
                    {product.category && (
                      <>
                        {product.brand?.name && " • "}
                        <Link href={`/kategori/${product.category.slug}`} className="text-muted">
                          {product.category.name}
                        </Link>
                      </>
                    )}
                  </p>
                  {product.brand?.name && (
                    <Badge style={{ marginBottom: "0.75rem" }}>
                      <Tag size={14} style={{ marginRight: 4 }} />
                      {product.brand.name}
                    </Badge>
                  )}
                  <p style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem", color: "#1d4ed8" }}>
                    {lowestPrice}
                  </p>
                  {lowestOffer?.store && (
                    <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: 6 }}>
                      <Store size={16} />
                      En uygun teklif: {lowestOffer.store.name}
                    </p>
                  )}
                  {product.description && (
                    <p className="text-muted" style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>
                      {product.description}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </section>

          <section style={{ marginBottom: "1.5rem" }}>
            <div
              className="product-detail-chart-actions"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 280px",
                gap: "1.25rem",
                alignItems: "flex-start"
              }}
            >
              <PriceHistoryChart slug={params.slug} />
              <Card style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <ProductFavoriteSection productId={product.id} />
                <ProductPriceAlertSection productId={product.id} />
              </Card>
            </div>
          </section>

          <section style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              Teklifler
            </h2>
            {offers.length === 0 ? (
              <p className="text-muted">Bu ürün için henüz kayıtlı teklif yok.</p>
            ) : (
              <div className="card">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "0.5rem" }}>Mağaza</th>
                      <th style={{ textAlign: "right", padding: "0.5rem" }}>Fiyat</th>
                      <th style={{ textAlign: "right", padding: "0.5rem" }}>Durum</th>
                      <th style={{ textAlign: "right", padding: "0.5rem" }}>Git</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((offer: any) => (
                      <tr key={offer.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "0.5rem" }}>{offer.store?.name}</td>
                        <td style={{ padding: "0.5rem", textAlign: "right" }}>
                          {offer.currentPrice} TL
                        </td>
                        <td style={{ padding: "0.5rem", textAlign: "right" }}>
                          {offer.inStock ? (
                            <span className="badge">Stokta</span>
                          ) : (
                            <span className="text-muted">Stok yok</span>
                          )}
                        </td>
                        <td style={{ padding: "0.5rem", textAlign: "right" }}>
                          <a
                            href={`${API_BASE_URL}/out/${offer.id}`}
                            className="btn-primary"
                            style={{ fontSize: "0.8rem" }}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Mağazaya git
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {similarProducts.length > 0 && (
            <section style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                Benzer ürünler
              </h2>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  overflowX: "auto",
                  scrollBehavior: "smooth",
                  paddingBottom: "0.5rem",
                  scrollbarWidth: "thin"
                }}
                className="product-rail"
              >
                {similarProducts.map((p: any) => (
                  <div key={p.id} style={{ minWidth: 260, maxWidth: 280, flexShrink: 0 }}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

