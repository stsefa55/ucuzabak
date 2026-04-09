import type { ProductCardProduct } from "../components/products/ProductCard";

/**
 * API’den gelen tek ürün satırını ProductCardProduct’a çevirir.
 * SSR’de elle map edilen tüm listeler bu fonksiyonu kullanmalı; aksi halde
 * productImages / imageUrls düşer ve kart galerisi ilk sayfada kırılır.
 */
export function mapApiProductToCardProduct(item: unknown): ProductCardProduct | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;

  const id = Number(raw.id);
  const name = typeof raw.name === "string" ? raw.name : "";
  const slug = typeof raw.slug === "string" ? raw.slug : "";
  if (!Number.isFinite(id) || id <= 0 || !slug || !name) return null;

  const productImagesRaw: unknown[] = Array.isArray(raw.productImages)
    ? (raw.productImages as unknown[])
    : [];
  type Img = { imageUrl: string; position?: number };
  const productImages: Img[] = productImagesRaw
    .map((imgRaw: unknown): Img | null => {
      if (!imgRaw || typeof imgRaw !== "object") return null;
      const o = imgRaw as Record<string, unknown>;
      const imageUrl = typeof o.imageUrl === "string" ? o.imageUrl : null;
      if (!imageUrl) return null;
      return {
        imageUrl,
        position: typeof o.position === "number" ? o.position : undefined
      };
    })
    .filter((x): x is Img => x != null);

  const imageUrls = Array.isArray(raw.imageUrls)
    ? (raw.imageUrls as unknown[]).filter(
        (x: unknown): x is string => typeof x === "string" && x.length > 0
      )
    : undefined;

  const brandRaw = raw.brand;
  const categoryRaw = raw.category;

  const brandName =
    brandRaw && typeof brandRaw === "object" && typeof (brandRaw as { name?: unknown }).name === "string"
      ? (brandRaw as { name: string }).name
      : null;

  const categorySlugOk =
    categoryRaw &&
    typeof categoryRaw === "object" &&
    typeof (categoryRaw as { slug?: unknown }).slug === "string"
      ? (categoryRaw as { slug: string }).slug
      : null;
  const categoryName =
    categoryRaw &&
    typeof categoryRaw === "object" &&
    typeof (categoryRaw as { name?: unknown }).name === "string"
      ? (categoryRaw as { name: string }).name
      : null;

  const cardDiscount =
    typeof raw.cardDiscountPercent === "number" && Number.isFinite(raw.cardDiscountPercent)
      ? raw.cardDiscountPercent
      : raw.cardDiscountPercent != null
        ? Number(raw.cardDiscountPercent)
        : null;

  return {
    id,
    name,
    slug,
    mainImageUrl: typeof raw.mainImageUrl === "string" ? raw.mainImageUrl : null,
    ...(productImages.length > 0 ? { productImages } : {}),
    ...(imageUrls && imageUrls.length > 0 ? { imageUrls } : {}),
    lowestPriceCache: raw.lowestPriceCache != null ? String(raw.lowestPriceCache) : null,
    offerCountCache: typeof raw.offerCountCache === "number" ? raw.offerCountCache : 0,
    cardListingCurrentPrice:
      raw.cardListingCurrentPrice != null && String(raw.cardListingCurrentPrice).trim()
        ? String(raw.cardListingCurrentPrice)
        : null,
    cardActiveOfferCount:
      typeof raw.cardActiveOfferCount === "number" && Number.isFinite(raw.cardActiveOfferCount)
        ? Math.max(0, Math.floor(raw.cardActiveOfferCount))
        : undefined,
    cardOriginalPrice:
      raw.cardOriginalPrice != null && String(raw.cardOriginalPrice).trim()
        ? String(raw.cardOriginalPrice)
        : null,
    cardDiscountPercent:
      cardDiscount != null && Number.isFinite(cardDiscount) && cardDiscount > 0 ? Math.round(cardDiscount) : null,
    cardInStock:
      typeof raw.cardInStock === "boolean" ? raw.cardInStock : raw.cardInStock === null ? null : undefined,
    cardStoreName: typeof raw.cardStoreName === "string" ? raw.cardStoreName : null,
    brand: brandRaw && typeof brandRaw === "object" ? { name: brandName } : null,
    category:
      categorySlugOk != null
        ? {
            name: categoryName,
            slug: categorySlugOk
          }
        : null,
    categoryPathSlugs: Array.isArray(raw.categoryPathSlugs)
      ? (raw.categoryPathSlugs as string[])
      : undefined,
    categoryPathNames: Array.isArray(raw.categoryPathNames)
      ? (raw.categoryPathNames as string[])
      : undefined,
    ean: typeof raw.ean === "string" ? raw.ean : null,
    modelNumber: typeof raw.modelNumber === "string" ? raw.modelNumber : null,
    specsJson:
      raw.specsJson && typeof raw.specsJson === "object" && !Array.isArray(raw.specsJson)
        ? (raw.specsJson as Record<string, unknown>)
        : null
  };
}
