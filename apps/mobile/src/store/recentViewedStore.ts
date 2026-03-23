import type { Product } from "../lib/types";

const MAX_RECENT = 20;

let recentlyViewed: Product[] = [];

export function addRecentlyViewed(product: Product) {
  if (!product?.id) return;

  if (product.dataSource !== "backend") {
    console.log("[RECENT DEBUG] skip recently viewed (not backend):", product.id, product.name, "dataSource:", product.dataSource);
    return;
  }

  recentlyViewed = [product, ...recentlyViewed.filter((p) => p.id !== product.id)].slice(0, MAX_RECENT);
  console.log("[RECENT DEBUG] saved recently viewed:", product.id, product.name);
}

export function getRecentlyViewed(): Product[] {
  const filtered = recentlyViewed.filter((p) => p.dataSource === "backend");
  const skipped = recentlyViewed.length - filtered.length;
  if (skipped > 0) {
    console.log("[RECENT DEBUG] filtered out non-backend recently viewed items:", skipped);
  }
  console.log("[RECENT DEBUG] recent products from local history:", filtered.length);
  return filtered;
}

