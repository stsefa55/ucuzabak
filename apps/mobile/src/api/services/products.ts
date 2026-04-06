import type { Money, Offer, Product } from "../../lib/types";
import { getProductListParams } from "../../lib/railsMock";
import { API_BASE_URL, apiFetchJson } from "../client";
import { getRecentlyViewed } from "../../store/recentViewedStore";
import { fetchSearchProducts } from "./search";

export type ProductListMode = "popular" | "deals" | "recent" | "search";

export type ProductDetailHistoryPoint = { label: string; price: number };

export type ProductDetailModel = {
  product: Product;
  galleryImages: string[];
  offers: Offer[];
  bestOffer: Offer;
  history: ProductDetailHistoryPoint[];
};

export function createProductDetailModel(product: Product): ProductDetailModel {
  // Initial UI model: no fabricated offers/history/images.
  const galleryImages = product.imageUrl ? [product.imageUrl] : [];
  const offers: Offer[] = [];
  const bestOffer: Offer = { id: "0", storeName: "—", price: product.price };
  const history: ProductDetailHistoryPoint[] = [];

  return { product, galleryImages, offers, bestOffer, history };
}

function toMoney(amount: unknown, currency?: unknown): Money {
  const a = typeof amount === "number" ? amount : typeof amount === "string" ? Number(amount) : 0;
  const cur = typeof currency === "string" ? currency : undefined;
  return { amount: Number.isFinite(a) ? a : 0, currency: cur };
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toSpecsRecord(specsJson: unknown): Product["specs"] | undefined {
  if (!specsJson || typeof specsJson !== "object") return undefined;
  // Prisma JsonValue -> mobil UI için düz record
  const obj = specsJson as Record<string, unknown>;
  const entries = Object.entries(obj).filter(([_, v]) => typeof v !== "undefined");
  if (entries.length === 0) return undefined;
  return entries.reduce(
    (acc: NonNullable<Product["specs"]>, [k, v]) => {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
        acc[k] = v;
      }
      return acc;
    },
    {} as NonNullable<Product["specs"]>,
  );
}

type BackendProduct = {
  id: number;
  slug: string;
  name: string;
  mainImageUrl?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  lowestPriceCache?: unknown | null;
  offerCountCache: number;
  specsJson?: unknown | null;
};

type BackendProductListResponse = {
  items: BackendProduct[];
  total: number;
  page: number;
  pageSize: number;
};

type BackendOffer = {
  id: number;
  currentPrice: unknown;
  originalPrice?: unknown | null;
  currency: string;
  affiliateUrl?: string | null;
  lastSeenAt?: string | null;
  updatedAt?: string;
  inStock?: boolean;
  status?: string;
  listDiscountPercent?: number | null;
  storefrontListDiscountEligible?: boolean;
  store: {
    name: string;
  };
};

type BackendPriceHistoryPoint = {
  date: string;
  minPrice: string;
  maxPrice: string;
  avgPrice: string;
  count: number;
};

type BackendPriceHistoryResponse = {
  range: string;
  points: BackendPriceHistoryPoint[];
};

function mapOffer(offer: BackendOffer): Offer {
  return {
    id: String(offer.id),
    storeName: offer.store.name,
    price: toMoney(offer.currentPrice, offer.currency),
    url: offer.affiliateUrl ?? undefined,
  };
}

async function fetchBackendOffersForSlug(slug: string): Promise<BackendOffer[]> {
  const rows = await apiFetchJson<BackendOffer[]>(`/products/${encodeURIComponent(slug)}/offers`);
  return rows;
}

function computeOldPriceFromOffers(offers: BackendOffer[]): {
  oldPrice?: Money | null;
  priceDropPercent?: number | null;
  bestOffer: Offer;
  bestCurrentPrice: number;
  bestCurrency?: string;
} {
  if (offers.length === 0) {
    const bestOffer: Offer = { id: "0", storeName: "—", price: { amount: 0 } };
    return { oldPrice: null, priceDropPercent: null, bestOffer, bestCurrentPrice: 0 };
  }

  const parsedCurrent = offers
    .map((o) => {
      const current = toNumber(o.currentPrice);
      return { o, current };
    })
    .filter((x): x is { o: BackendOffer; current: number } => x.current != null && x.current > 0)
    .slice()
    .sort((a, b) => a.current - b.current);

  if (parsedCurrent.length === 0) {
    const bestOffer = mapOffer(offers[0]);
    return { oldPrice: null, priceDropPercent: null, bestOffer, bestCurrentPrice: 0 };
  }

  const bestCurrent = parsedCurrent[0];
  const bestCurrency = bestCurrent.o.currency;
  const bestOffer = mapOffer(bestCurrent.o);
  const currentPrice = bestCurrent.current;

  const oldVal = bestCurrent.o.originalPrice == null ? null : toNumber(bestCurrent.o.originalPrice);
  const eligible = bestCurrent.o.storefrontListDiscountEligible === true;
  if (
    !eligible ||
    oldVal == null ||
    oldVal <= 0 ||
    currentPrice >= oldVal ||
    bestCurrent.o.status != null && bestCurrent.o.status !== "ACTIVE"
  ) {
    return { oldPrice: null, priceDropPercent: null, bestOffer, bestCurrentPrice: currentPrice, bestCurrency };
  }

  const oldPrice: Money = { amount: oldVal, currency: bestCurrent.o.currency };
  return {
    oldPrice,
    priceDropPercent: null,
    bestOffer,
    bestCurrentPrice: currentPrice,
    bestCurrency,
  };
}

function computeHistoryFromBackend(points: BackendPriceHistoryPoint[], baseNow: Date): ProductDetailHistoryPoint[] {
  if (points.length === 0) {
    return [];
  }

  const toPrice = (p: BackendPriceHistoryPoint) => toNumber(p.minPrice) ?? 0;
  const windowMin = (fromMs: number) => {
    const from = new Date(fromMs);
    const filtered = points.filter((p) => {
      const d = new Date(`${p.date}T00:00:00`);
      return d.getTime() >= from.getTime();
    });

    if (filtered.length === 0) return null;
    return Math.min(...filtered.map(toPrice));
  };

  const now = baseNow;
  const p7 = windowMin(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const p14 = windowMin(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const p30 = windowMin(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const p60 = windowMin(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  return [
    p7 != null ? { label: "7 gün", price: Math.round(p7) } : null,
    p14 != null ? { label: "14 gün", price: Math.round(p14) } : null,
    p30 != null ? { label: "1 ay", price: Math.round(p30) } : null,
    p60 != null ? { label: "2 ay", price: Math.round(p60) } : null,
  ].filter((x): x is ProductDetailHistoryPoint => x != null);
}

export async function fetchProductsList({
  mode,
  categoryId,
  q
}: {
  mode: ProductListMode;
  categoryId?: string;
  q?: string;
}): Promise<Product[]> {
  if (mode === "recent") {
    console.log("RECENT DEBUG: HomeScreen Son İncelediklerin from local viewed store");
    return getRecentlyViewed();
  }

  if (mode === "search") {
    const qq = (q ?? "").trim();
    console.log("[MOBILE API DEBUG] REAL API USED: search products (mode=search)");
    if (!qq) return [];
    return fetchSearchProducts(qq);
  }

  try {
    console.log("[MOBILE API DEBUG] REAL API USED: products list");
    const pageSize = 20;
    const category = categoryId ? `&categorySlug=${encodeURIComponent(categoryId)}` : "";

    // Backend:
    // - popular => /products?sort=popular
    // - price drops => /products/price-drops (kategori filtresi yok) veya /products?categorySlug&sort=price_drop (yaklaşık)
    let raw: BackendProductListResponse | BackendProduct[] = [];

    if (mode === "popular") {
      if (categoryId) {
        const path = `/products?${category.substring(1)}&sort=popular&page=1&pageSize=${pageSize}`;
        console.log("[MOBILE API DEBUG] products popular request URL:", `${API_BASE_URL}${path}`);
        raw = await apiFetchJson<BackendProductListResponse>(path);
      } else {
        const path = "/products/popular";
        console.log("[MOBILE API DEBUG] products popular request URL:", `${API_BASE_URL}${path}`);
        raw = await apiFetchJson<BackendProduct[]>(path);
      }
    } else {
      if (categoryId) {
        const path = `/products?${category.substring(1)}&sort=price_drop&page=1&pageSize=${pageSize}`;
        console.log("[MOBILE API DEBUG] products price-drops request URL:", `${API_BASE_URL}${path}`);
        raw = await apiFetchJson<BackendProductListResponse>(path);
      } else {
        // /products/price-drops direkt array dönüyor
        const path = "/products/price-drops";
        console.log("[MOBILE API DEBUG] products price-drops request URL:", `${API_BASE_URL}${path}`);
        raw = await apiFetchJson<BackendProduct[]>(path);
      }
    }

    const items: BackendProduct[] = Array.isArray(raw) ? raw : raw.items;

    if (items.length === 0) {
      console.log("FALLBACK USED: PRODUCTS EMPTY RESPONSE");
      console.log("FALLBACK USED: PRODUCTS EMPTY RESPONSE ORIGINAL ERROR: none (empty response)");
      return [];
    }

    if (mode !== "deals") {
      const mapped = items.map((p) => {
        const price = toMoney(p.lowestPriceCache, "TRY");
        if (p.mainImageUrl == null) {
          console.log("IMAGE MISSING intentionally blank", p.id, p.name);
        }
        return {
          id: String(p.id),
          slug: p.slug,
          name: p.name,
          imageUrl: p.mainImageUrl ?? null,
          ratingAvg: p.ratingAvg ?? null,
          ratingCount: p.ratingCount ?? null,
          price,
          oldPrice: null,
          priceDropPercent: null,
          storeCount: p.offerCountCache ?? 0,
          specs: toSpecsRecord(p.specsJson),
          dataSource: "backend",
        };
      });

      for (const p of mapped) {
        if (!p.slug) {
          console.log("PRODUCT WITHOUT SLUG", p.id, p.name);
        }
      }

      return mapped as Product[];
    }

    // deals (price-drop) için karttaki eski fiyat + yüzdeyi hesapla.
    const out: Product[] = [];
    for (const p of items) {
      try {
        const offers = await fetchBackendOffersForSlug(p.slug);
        const { oldPrice, bestOffer } = computeOldPriceFromOffers(offers);

        if (oldPrice?.amount != null) {
          if (p.mainImageUrl == null) {
            console.log("IMAGE MISSING intentionally blank", p.id, p.name);
          }
          out.push({
            id: String(p.id),
            slug: p.slug,
            name: p.name,
            imageUrl: p.mainImageUrl ?? null,
            ratingAvg: p.ratingAvg ?? null,
            ratingCount: p.ratingCount ?? null,
            price: bestOffer.price,
            oldPrice: oldPrice ?? null,
            priceDropPercent: null,
            storeCount: offers.length || p.offerCountCache || 0,
            specs: toSpecsRecord(p.specsJson),
            dataSource: "backend" as const
          });
        } else {
          const reason = !oldPrice?.amount ? "missing originalPrice/oldPrice" : "missing required values";
          console.log("PRICE DROP BADGE SKIPPED:", reason, p.id, p.name);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log("FALLBACK USED: DEAL OFFERS REQUEST FAILED", msg);
        console.log("FALLBACK USED: DEAL OFFERS REQUEST FAILED ORIGINAL ERROR:", msg);
        // Offers datası olmadan Fiyatı Düşenler UI'sine kart eklemeyeceğim.
      }
    }

    if (out.length === 0) {
      console.log("FALLBACK USED: DEALS RENDER EMPTY (no valid price-drop info)");
    }

    return out;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("FALLBACK USED: PRODUCTS API ERROR");
    console.log("FALLBACK USED: PRODUCTS API ERROR ORIGINAL ERROR:", msg);
    return [];
  }
}

export async function fetchProductDetail(product: Product): Promise<ProductDetailModel> {
  const slug = product.slug;
  if (!slug) {
    console.log("FALLBACK USED: PRODUCT DETAIL NO SLUG");
    return createProductDetailModel({ ...product, oldPrice: null, priceDropPercent: null });
  }

  console.log("[MOBILE API DEBUG] product detail uses slug:", slug);
  console.log("[MOBILE API DEBUG] REAL API USED: product detail");

  try {
    const encoded = encodeURIComponent(slug);

    console.log("[MOBILE API DEBUG] product detail request URL:", `${API_BASE_URL}/products/${encoded}`);

    const [backendProduct, backendOffers, backendHistory] = await Promise.all([
      apiFetchJson<BackendProduct & { productImages?: Array<{ imageUrl: string }> | null; lowestPriceCache?: unknown | null }>(
        `/products/${encoded}`
      ),
      fetchBackendOffersForSlug(slug),
      apiFetchJson<BackendPriceHistoryResponse>(`/products/${encoded}/price-history?range=90d`),
    ]);

    const galleryFromImages = (backendProduct.productImages ?? [])
      .map((pi) => pi.imageUrl)
      .filter((u): u is string => typeof u === "string" && u.length > 0);

    const galleryImages =
      galleryFromImages.length > 0
        ? galleryFromImages
        : backendProduct.mainImageUrl
          ? [backendProduct.mainImageUrl]
          : [];

    const offers = backendOffers.map(mapOffer);
    const dropComputed = computeOldPriceFromOffers(backendOffers);
    const bestOffer = dropComputed.bestCurrentPrice > 0 ? dropComputed.bestOffer : { ...dropComputed.bestOffer, price: product.price };

    const history = computeHistoryFromBackend(backendHistory.points ?? [], new Date());

    if (galleryImages.length === 0) {
      console.log("IMAGE MISSING intentionally blank", product.id, product.name);
    }

    const productWithDrop: Product = {
      ...product,
      imageUrl: backendProduct.mainImageUrl ?? product.imageUrl ?? null,
      price: bestOffer.price,
      oldPrice: dropComputed.oldPrice ?? null,
      priceDropPercent: null,
      dataSource: "backend",
    };

    if (productWithDrop.oldPrice?.amount != null) {
      const oldAmount = productWithDrop.oldPrice.amount;
      const currentAmount = productWithDrop.price.amount;
      const percent = ((oldAmount - currentAmount) / oldAmount) * 100;
      if (Number.isFinite(percent) && percent > 0) {
        console.log("PRICE DROP BADGE SHOWN (detail) oldPrice:", oldAmount, "current:", currentAmount, "computed %:", percent);
      } else {
        console.log("PRICE DROP BADGE HIDDEN (detail) reason: computed percent invalid", { oldAmount, currentAmount, percent });
      }
    } else {
      console.log("PRICE DROP BADGE HIDDEN (detail) reason: missing oldPrice", { oldPrice: dropComputed.oldPrice?.amount ?? null });
    }

    return {
      product: productWithDrop,
      galleryImages,
      offers,
      bestOffer,
      history,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("FALLBACK USED: PRODUCT DETAIL API ERROR");
    console.log("FALLBACK USED: PRODUCT DETAIL API ERROR ORIGINAL ERROR:", msg);
    return createProductDetailModel({ ...product, oldPrice: null, priceDropPercent: null, dataSource: product.dataSource ?? "mock" });
  }
}

export function getProductListParamsTyped(mode: ProductListMode) {
  return getProductListParams(mode);
}

