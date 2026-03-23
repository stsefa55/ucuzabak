import type { Product, Offer } from "../../lib/types";
import { getProductsForList, getProductListParams, mockImageUrls } from "../../lib/railsMock";
import { withMockDelay } from "../client";

export type ProductListMode = "popular" | "deals" | "recent";

export type ProductDetailHistoryPoint = { label: string; price: number };

export type ProductDetailModel = {
  product: Product;
  galleryImages: string[];
  offers: Offer[];
  bestOffer: Offer;
  history: ProductDetailHistoryPoint[];
};

export function createProductDetailModel(product: Product): ProductDetailModel {
  const rest = mockImageUrls(product.id, 4);
  const galleryImages = product.imageUrl ? [product.imageUrl, ...rest.slice(1)] : rest;

  const offers = (product.offers ?? []).length
    ? product.offers!.slice().sort((a, b) => a.price.amount - b.price.amount)
    : [
        { id: `${product.id}-offer-1`, storeName: "Örnek Mağaza", price: product.price, url: "https://example.com/offer" }
      ];

  const bestOffer = offers[0];

  const drop = product.priceDropPercent ?? 0;
  const base = product.price.amount;
  const history: ProductDetailHistoryPoint[] = [
    { label: "7 gün", price: Math.round(base * (1 + Math.max(drop, 0) / 220)) },
    { label: "14 gün", price: Math.round(base * (1 + Math.max(drop, 0) / 180)) },
    { label: "1 ay", price: Math.round(base * (1 + Math.max(drop, 0) / 140)) },
    { label: "2 ay", price: Math.round(base * (1 + Math.max(drop, 0) / 90)) }
  ];

  return { product, galleryImages, offers, bestOffer, history };
}

export async function fetchProductsList({
  mode,
  categoryId
}: {
  mode: ProductListMode;
  categoryId?: string;
}): Promise<Product[]> {
  return withMockDelay(() => getProductsForList({ mode, categoryId }));
}

export async function fetchProductDetail(product: Product): Promise<ProductDetailModel> {
  return withMockDelay(() => createProductDetailModel(product));
}

export function getProductListParamsTyped(mode: ProductListMode) {
  return getProductListParams(mode);
}

