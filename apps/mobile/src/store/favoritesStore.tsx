import React, { createContext, useContext, useMemo, useReducer } from "react";
import type { Product } from "../lib/types";

type FavoritesState = {
  products: Product[];
};

type FavoritesAction =
  | { type: "toggle"; product: Product }
  | { type: "remove"; productId: string }
  | { type: "clear" };

type FavoritesApi = {
  products: Product[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (product: Product) => void;
  removeFavorite: (productId: string) => void;
  clearFavorites: () => void;
};

const FavoritesContext = createContext<FavoritesApi | null>(null);

function reducer(state: FavoritesState, action: FavoritesAction): FavoritesState {
  switch (action.type) {
    case "toggle": {
      const exists = state.products.some((p) => p.id === action.product.id);
      if (exists) {
        return { products: state.products.filter((p) => p.id !== action.product.id) };
      }
      return { products: [action.product, ...state.products].slice(0, 200) };
    }
    case "remove":
      return { products: state.products.filter((p) => p.id !== action.productId) };
    case "clear":
      return { products: [] };
    default:
      return state;
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { products: [] });

  const api = useMemo<FavoritesApi>(() => {
    const backendProducts = state.products.filter((p) => p.dataSource === "backend");
    return {
      products: backendProducts,
      isFavorite: (productId: string) => backendProducts.some((p) => p.id === productId),
      toggleFavorite: (product: Product) => {
        if (product.dataSource !== "backend") {
          console.log("[FAVORITES DEBUG] skip toggleFavorite (not backend):", product.id, product.name, "dataSource:", product.dataSource);
          return;
        }
        console.log("[FAVORITES DEBUG] toggle:", product.id);
        dispatch({ type: "toggle", product });
      },
      removeFavorite: (productId: string) => {
        console.log("[FAVORITES DEBUG] remove:", productId);
        dispatch({ type: "remove", productId });
      },
      clearFavorites: () => {
        console.log("[FAVORITES DEBUG] clear");
        dispatch({ type: "clear" });
      },
    };
  }, [state.products]);

  return <FavoritesContext.Provider value={api}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  console.log("[FAVORITES DEBUG] current favorites count:", ctx.products.length);
  return ctx;
}

