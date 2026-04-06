"use client";

import { isValidCanonicalSlug } from "@ucuzabak/shared";
import { create } from "zustand";
import type { ProductCardProduct } from "../components/products/ProductCard";
import { touchRecentlyViewed } from "./recent-viewed-store";

interface ProductQuickPreviewState {
  product: ProductCardProduct | null;
  openPreview: (product: ProductCardProduct) => void;
  closePreview: () => void;
}

export const useProductQuickPreviewStore = create<ProductQuickPreviewState>((set) => ({
  product: null,
  openPreview: (product) => {
    if (product.slug && isValidCanonicalSlug(product.slug)) {
      touchRecentlyViewed(product.slug);
    }
    set({ product: { ...product } });
  },
  closePreview: () => set({ product: null })
}));
