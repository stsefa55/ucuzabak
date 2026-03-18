"use client";

import { create } from "zustand";

export interface CompareProduct {
  id: number;
  name: string;
  slug: string;
  lowestPriceCache?: string | null;
  offerCountCache?: number;
  brand?: { name: string | null } | null;
  category?: { name: string | null; slug: string } | null;
  ean?: string | null;
  modelNumber?: string | null;
  // specsJson frontend tarafında gösterim için basitçe JSON olarak tutulabilir
  specsJson?: Record<string, unknown> | null;
}

interface CompareState {
  compareProducts: CompareProduct[];
  addProduct: (product: CompareProduct) => void;
  removeProduct: (id: number) => void;
  clearCompare: () => void;
}

export const useCompareStore = create<CompareState>((set) => ({
  compareProducts: [],
  addProduct: (product) =>
    set((state) => {
      if (state.compareProducts.find((p) => p.id === product.id)) return state;
      if (state.compareProducts.length >= 4) return state;
      return { compareProducts: [...state.compareProducts, product] };
    }),
  removeProduct: (id) =>
    set((state) => ({
      compareProducts: state.compareProducts.filter((p) => p.id !== id)
    })),
  clearCompare: () => set({ compareProducts: [] })
}));

