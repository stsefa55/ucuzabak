import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidCanonicalSlug } from "@ucuzabak/shared";
import { getApiBaseUrl } from "../../../src/lib/api-client";
import { fetchJsonArray, fetchJsonOrNull } from "../../../src/lib/server-api-fetch";
import { categoryHrefFromSlugs, categoryPageBasePathFromSlugs } from "../../../src/lib/categoryPaths";
import { Header } from "../../../src/components/layout/Header";
import { ProductFavoriteSection } from "../../../src/components/products/ProductFavoriteSection";
import { ProductPriceAlertSection } from "../../../src/components/products/ProductPriceAlertSection";
import { PriceHistoryChart } from "../../../src/components/products/PriceHistoryChart";
import { ProductCard, type ProductCardProduct } from "../../../src/components/products/ProductCard";
import { ProductGallery } from "../../../src/components/products/ProductGallery";
import { RecordProductView } from "../../../src/components/products/RecordProductView";
import { ProductRailWithNav } from "../../../src/components/home/ProductRailWithNav";
import { Card } from "../../../src/components/ui/card";
import { Badge } from "../../../src/components/ui/badge";
import { Tag, Store } from "lucide-react";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: { slug: string };
}

/** Detay sayfası — kart modelinden genişletilmiş alanlar */
interface ProductDetail extends ProductCardProduct {
  description?: string | null;
  productImages?: Array<{ id?: number; imageUrl: string; position?: number }>;
  categoryPathSlugs?: string[];
  categoryPathNames?: string[];
  lowestPriceCache?: string | null;
  brand?: { name: string | null } | null;
  category?: { name: string | null; slug: string } | null;
}

interface OfferRow {
  id: number;
  currentPrice?: string | number | null;
  originalPrice?: string | number | null;
  inStock?: boolean;
  status?: string;
  lastSeenAt?: string | null;
  updatedAt?: string;
  listDiscountPercent?: number | null;
  storefrontListDiscountEligible?: boolean;
  store?: { name?: string | null };
}

function isProductPayload(x: unknown): x is ProductDetail {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "number" &&
    typeof o.name === "string" &&
    typeof o.slug === "string" &&
    isValidCanonicalSlug(o.slug)
  );
}

function normalizeProduct(raw: ProductDetail): ProductDetail {
  return {
    ...raw,
    lowestPriceCache:
      raw.lowestPriceCache == null ? null : String(raw.lowestPriceCache),
    categoryPathSlugs: Array.isArray(raw.categoryPathSlugs)
      ? raw.categoryPathSlugs.filter((s): s is string => typeof s === "string" && s.length > 0)
      : [],
    categoryPathNames: Array.isArray(raw.categoryPathNames)
      ? raw.categoryPathNames.filter((s): s is string => typeof s === "string")
      : [],
    productImages: Array.isArray(raw.productImages)
      ? raw.productImages.filter(
          (img): img is { id?: number; imageUrl: string; position?: number } =>
            !!img &&
            typeof img === "object" &&
            typeof (img as { imageUrl?: unknown }).imageUrl === "string" &&
            (img as { imageUrl: string }).imageUrl.length > 0
        )
      : []
  };
}

function normalizeOffers(rows: OfferRow[]): OfferRow[] {
  return rows.filter((r): r is OfferRow => !!r && typeof r === "object" && typeof r.id === "number");
}

function normalizeSimilar(rows: ProductCardProduct[]): ProductCardProduct[] {
  return rows.filter(
    (p): p is ProductCardProduct =>
      !!p &&
      typeof p === "object" &&
      typeof p.id === "number" &&
      typeof p.name === "string" &&
      typeof p.slug === "string" &&
      isValidCanonicalSlug(p.slug)
  );
}

async function fetchProduct(slug: string): Promise<ProductDetail | null> {
  const base = getApiBaseUrl();
  const url = `${base}/products/${encodeURIComponent(slug)}`;
  const data = await fetchJsonOrNull<unknown>(url, { next: { revalidate: 0 } });
  if (!data) return null;
  if (!isProductPayload(data)) return null;
  return normalizeProduct(data);
}

async function fetchOffers(slug: string): Promise<OfferRow[]> {
  const base = getApiBaseUrl();
  return fetchJsonArray<OfferRow>(`${base}/products/${encodeURIComponent(slug)}/offers`, {
    next: { revalidate: 0 }
  });
}

async function fetchSimilar(slug: string): Promise<ProductCardProduct[]> {
  const base = getApiBaseUrl();
  return fetchJsonArray<ProductCardProduct>(`${base}/products/${encodeURIComponent(slug)}/similar`, {
    next: { revalidate: 60 }
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  if (!isValidCanonicalSlug(params.slug)) {
    notFound();
  }
  const offerOutBase =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:4000/api/v1";
  const product = await fetchProduct(params.slug);
  if (!product) {
    notFound();
  }
  const [offersRaw, similarProductsRaw] = await Promise.all([
    fetchOffers(params.slug),
    fetchSimilar(params.slug)
  ]);
  const offers = normalizeOffers(offersRaw);
  const similarProducts = normalizeSimilar(similarProductsRaw);
  const productPathSlugs = product.categoryPathSlugs ?? [];
  const productPathNames = product.categoryPathNames ?? [];

  const lowestOffer: OfferRow | null = offers.length > 0 ? (offers[0] ?? null) : null;
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
            {productPathSlugs.length > 0 ? (
              productPathSlugs.map((slug: string, i: number) => {
                const name = productPathNames[i] ?? slug;
                const href = categoryPageBasePathFromSlugs(productPathSlugs.slice(0, i + 1));
                return (
                  <span key={`${slug}-${i}`}>
                    {" "}
                    /{" "}
                    <Link href={href} className="text-muted">
                      {name}
                    </Link>
                  </span>
                );
              })
            ) : product.category ? (
              <>
                {" "}
                /{" "}
                <Link href={`/kategori/${product.category.slug}`} className="text-muted">
                  {product.category.name}
                </Link>
              </>
            ) : null}{" "}
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
                <div className="product-detail-hero__copy">
                  <div className="product-detail-hero__top">
                    <h1 className="product-detail-hero__title" style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.25 }}>
                      {product.name}
                    </h1>
                    <div className="product-detail-hero__actions" role="group" aria-label="Favori ve fiyat alarmı">
                      <div className="product-detail-hero__toolbar">
                        <div className="product-detail-hero__toolbar-main">
                          <ProductFavoriteSection productId={product.id} productSlug={params.slug} compact />
                          <span className="product-detail-hero__toolbar-sep" aria-hidden="true" />
                          <ProductPriceAlertSection productId={product.id} compact />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                    {product.brand?.name && <span>{product.brand.name}</span>}
                    {product.category && (
                      <>
                        {product.brand?.name && " • "}
                        <Link
                          href={categoryHrefFromSlugs(product.categoryPathSlugs, product.category.slug)}
                          className="text-muted"
                        >
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
              className="product-detail-chart-offers"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                gap: "1.25rem",
                alignItems: "flex-start"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
                <PriceHistoryChart slug={params.slug} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="card product-detail-panel-card">
                  <div className="product-detail-panel-card__head product-detail-panel-card__head--single">
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Teklifler</h2>
                  </div>
                  <p className="text-muted" style={{ fontSize: "0.78rem", lineHeight: 1.5, margin: "0 0 0.65rem", padding: "0 1rem" }}>
                    Tablodaki <strong>indirim %</strong>, mağazanın liste fiyatı (<code>originalPrice</code>) ile güncel
                    fiyat arasındaki farktır. Grafikteki eğri ise <strong>PriceHistory</strong> ile zaman içi fiyat
                    değişimidir. Rozet yalnızca veri taze ve koşullar sağlandığında gösterilir.
                  </p>
                  <div className="product-detail-panel-card__body product-detail-panel-card__body--scroll">
                    {offers.length === 0 ? (
                      <p className="text-muted" style={{ fontSize: "0.9rem", margin: 0 }}>
                        Bu ürün için henüz kayıtlı teklif yok.
                      </p>
                    ) : (
                      <div className="product-detail-offers-table-wrap">
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: "left", padding: "0.45rem" }}>Mağaza</th>
                              <th style={{ textAlign: "right", padding: "0.45rem" }}>Güncel</th>
                              <th style={{ textAlign: "right", padding: "0.45rem" }}>Liste</th>
                              <th style={{ textAlign: "right", padding: "0.45rem" }}>İndirim</th>
                              <th style={{ textAlign: "left", padding: "0.45rem" }}>Stok</th>
                              <th style={{ textAlign: "left", padding: "0.45rem" }}>Durum</th>
                              <th style={{ textAlign: "left", padding: "0.45rem" }}>Son görülme</th>
                              <th style={{ textAlign: "right", padding: "0.45rem" }}>Git</th>
                            </tr>
                          </thead>
                          <tbody>
                            {offers.map((offer: OfferRow) => {
                              const cur = offer.currentPrice != null ? Number(offer.currentPrice) : NaN;
                              const orig = offer.originalPrice != null ? Number(offer.originalPrice) : NaN;
                              const showStrike =
                                offer.storefrontListDiscountEligible === true &&
                                offer.listDiscountPercent != null &&
                                offer.listDiscountPercent > 0;
                              return (
                                <tr key={offer.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                                  <td style={{ padding: "0.45rem", wordBreak: "break-word" }}>{offer.store?.name}</td>
                                  <td style={{ padding: "0.45rem", textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>
                                    {Number.isFinite(cur) ? `${cur.toLocaleString("tr-TR")} TL` : "—"}
                                  </td>
                                  <td style={{ padding: "0.45rem", textAlign: "right", whiteSpace: "nowrap" }}>
                                    {Number.isFinite(orig) ? (
                                      <span style={showStrike ? { textDecoration: "line-through", color: "#64748b" } : undefined}>
                                        {orig.toLocaleString("tr-TR")} TL
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                  <td style={{ padding: "0.45rem", textAlign: "right", whiteSpace: "nowrap" }}>
                                    {showStrike && offer.listDiscountPercent != null ? (
                                      <span style={{ color: "#16a34a", fontWeight: 600 }}>%{offer.listDiscountPercent}</span>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </td>
                                  <td style={{ padding: "0.45rem" }}>
                                    {offer.inStock ? (
                                      <span className="badge">Stokta</span>
                                    ) : (
                                      <span className="text-muted">Stok yok</span>
                                    )}
                                  </td>
                                  <td style={{ padding: "0.45rem", fontSize: "0.8rem" }}>
                                    {offer.status === "ACTIVE"
                                      ? "Aktif"
                                      : offer.status === "DISABLED"
                                        ? "Kapalı"
                                        : offer.status === "OUT_OF_STOCK"
                                          ? "Stok dışı"
                                          : (offer.status ?? "—")}
                                  </td>
                                  <td style={{ padding: "0.45rem", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                                    {offer.lastSeenAt
                                      ? new Date(offer.lastSeenAt).toLocaleString("tr-TR")
                                      : offer.updatedAt
                                        ? new Date(offer.updatedAt).toLocaleString("tr-TR")
                                        : "—"}
                                  </td>
                                  <td style={{ padding: "0.45rem", textAlign: "right" }}>
                                    <a
                                      href={`${offerOutBase}/out/${offer.id}`}
                                      className="btn-primary"
                                      style={{ fontSize: "0.78rem", padding: "0.35rem 0.5rem", whiteSpace: "nowrap" }}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Mağazaya git
                                    </a>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {similarProducts.length > 0 && (
            <section style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                Benzer ürünler
              </h2>
              <ProductRailWithNav ariaLabel="Benzer ürünler">
                {similarProducts.map((p: any) => (
                  <div key={p.id} className="product-rail-card">
                    <ProductCard product={p} />
                  </div>
                ))}
              </ProductRailWithNav>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

