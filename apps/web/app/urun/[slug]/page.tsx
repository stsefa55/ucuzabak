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
import { Store, Tag, TrendingDown } from "lucide-react";
import { formatTL } from "../../../src/lib/utils";

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
      ? formatTL(lowestOffer.currentPrice)
      : product.lowestPriceCache != null
      ? formatTL(product.lowestPriceCache)
      : "Fiyat bilgisi yok";

  const lowestOriginal =
    lowestOffer?.originalPrice != null ? Number(lowestOffer.originalPrice) : NaN;
  const lowestCur =
    lowestOffer?.currentPrice != null ? Number(lowestOffer.currentPrice) : NaN;
  const showHeroDiscount =
    lowestOffer?.storefrontListDiscountEligible === true &&
    lowestOffer?.listDiscountPercent != null &&
    lowestOffer.listDiscountPercent > 0 &&
    Number.isFinite(lowestOriginal);

  return (
    <>
      <RecordProductView slug={params.slug} />
      <Header />
      <main className="main">
        <div className="container pdp">

          {/* ── Breadcrumb ── */}
          <nav className="page-with-filters__breadcrumb text-muted" style={{ marginBottom: "1.25rem" }} aria-label="Sayfa konumu">
            <Link href="/" className="text-muted">
              Anasayfa
            </Link>
            {productPathSlugs.length > 0
              ? productPathSlugs.map((slug: string, i: number) => {
                  const name = productPathNames[i] ?? slug;
                  const href = categoryPageBasePathFromSlugs(productPathSlugs.slice(0, i + 1));
                  return (
                    <span key={`${slug}-${i}`}>
                      {" "}
                      /{" "}
                      <Link href={href} className="text-muted">{name}</Link>
                    </span>
                  );
                })
              : product.category
                ? (
                    <span>
                      {" "}
                      /{" "}
                      <Link href={`/kategori/${product.category.slug}`} className="text-muted">{product.category.name}</Link>
                    </span>
                  )
                : null}
            {" "}
            /{" "}
            <span className="page-with-filters__breadcrumb-current">{product.name}</span>
          </nav>

          {/* ── Hero ── */}
          <section className="pdp-hero">
            <div className="pdp-hero__gallery">
              <ProductGallery
                productName={product.name}
                mainImageUrl={product.mainImageUrl}
                images={product.productImages}
              />
            </div>

            <div className="pdp-hero__info">
              {/* Üst satır: marka+başlık + sağ üstte favori/alarm */}
              <div className="pdp-hero__top-row">
                <div className="pdp-hero__titles">
                  {product.brand?.name?.trim() && (
                    <span className="pdp-hero__brand">{product.brand.name.trim()}</span>
                  )}
                  <h1 className="pdp-hero__title">{product.name}</h1>
                </div>
                <div className="pdp-hero__actions">
                  <ProductFavoriteSection productId={product.id} productSlug={params.slug} compact />
                  <span className="pdp-hero__actions-sep" aria-hidden="true" />
                  <ProductPriceAlertSection productId={product.id} compact />
                </div>
              </div>

              {/* Kategori tag */}
              {product.category && (
                <Link
                  href={categoryHrefFromSlugs(product.categoryPathSlugs, product.category.slug)}
                  className="pdp-hero__cat-tag"
                >
                  <Tag size={12} />
                  {product.category.name}
                </Link>
              )}

              {/* Fiyat bloğu */}
              <div className="pdp-hero__price-block">
                <span className="pdp-hero__price">{lowestPrice}</span>
                {showHeroDiscount && (
                  <span className="pdp-hero__price-meta">
                    <span className="pdp-hero__price-orig">{formatTL(lowestOriginal)}</span>
                    <span className="pdp-hero__price-pct">
                      <TrendingDown size={12} />
                      %{lowestOffer!.listDiscountPercent}
                    </span>
                  </span>
                )}
                {lowestOffer?.store && (
                  <span className="pdp-hero__store">
                    <Store size={13} />
                    {lowestOffer.store.name}
                  </span>
                )}
              </div>

              {/* Açıklama */}
              {product.description && (
                <p className="pdp-hero__desc">{product.description}</p>
              )}
            </div>
          </section>

          {/* ── Fiyat geçmişi + Teklifler (yan yana) ── */}
          <section className="pdp-section">
            <div className="pdp-two-col">
              <div className="pdp-two-col__left">
                <PriceHistoryChart slug={params.slug} />
              </div>
              <div className="pdp-two-col__right">
                <div className="pdp-card pdp-card--stretch">
                  <div className="pdp-card__head">
                    <h2 className="pdp-card__heading">
                      Teklifler
                      <span className="pdp-badge-count">{offers.length}</span>
                    </h2>
                  </div>
                  <div className="pdp-card__body pdp-card__body--scroll">
                    {offers.length === 0 ? (
                      <p className="pdp-empty">Bu ürün için henüz kayıtlı teklif yok.</p>
                    ) : (
                      <div className="pdp-offers">
                        {offers.map((offer: OfferRow) => {
                          const cur = offer.currentPrice != null ? Number(offer.currentPrice) : NaN;
                          const orig = offer.originalPrice != null ? Number(offer.originalPrice) : NaN;
                          const showStrike =
                            offer.storefrontListDiscountEligible === true &&
                            offer.listDiscountPercent != null &&
                            offer.listDiscountPercent > 0;
                          return (
                            <div key={offer.id} className="pdp-offer">
                              <div className="pdp-offer__left">
                                <span className="pdp-offer__store">
                                  <Store size={14} />
                                  {offer.store?.name ?? "—"}
                                </span>
                                <span className={`pdp-offer__stock ${offer.inStock ? "pdp-offer__stock--in" : "pdp-offer__stock--out"}`}>
                                  {offer.inStock ? "Stokta" : "Stok yok"}
                                </span>
                              </div>
                              <div className="pdp-offer__right">
                                <div className="pdp-offer__pricing">
                                  <span className="pdp-offer__cur">
                                    {Number.isFinite(cur) ? formatTL(cur) : "—"}
                                  </span>
                                  {showStrike && Number.isFinite(orig) && (
                                    <span className="pdp-offer__orig">
                                      <span className="pdp-offer__orig-val">{formatTL(orig)}</span>
                                      <span className="pdp-offer__pct">%{offer.listDiscountPercent}</span>
                                    </span>
                                  )}
                                </div>
                                <a
                                  href={`${offerOutBase}/out/${offer.id}`}
                                  className="pdp-offer__cta"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Mağazaya git
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Benzer ürünler ── */}
          {similarProducts.length > 0 && (
            <section className="pdp-section pdp-similar">
              <h2 className="pdp-card__heading">Benzer ürünler</h2>
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

