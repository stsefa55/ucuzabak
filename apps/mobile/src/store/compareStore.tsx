import React, { createContext, useContext, useMemo, useReducer } from "react";
import type { Product } from "../lib/types";

type CompareAction =
  | { type: "toggle"; product: Product; max: number }
  | { type: "remove"; productId: string }
  | { type: "clear" }
  | { type: "set"; products: Product[] };

type CompareState = {
  products: Product[];
};

export type CompareToggleResult = "added" | "removed" | "max_reached";

const CompareContext = createContext<{
  products: Product[];
  isSelected: (productId: string) => boolean;
  toggle: (product: Product) => CompareToggleResult;
  remove: (productId: string) => void;
  clear: () => void;
} | null>(null);

function reducer(state: CompareState, action: CompareAction): CompareState {
  switch (action.type) {
    case "toggle": {
      const exists = state.products.some((p) => p.id === action.product.id);
      if (exists) {
        const next = state.products.filter((p) => p.id !== action.product.id);
        console.log("[COMPARE DEBUG] product removed from compare:", action.product.id, action.product.name, "compare count:", next.length);
        return { products: next };
      }
      if (state.products.length >= action.max) return state;
      const next = [...state.products, action.product];
      console.log(
        "[COMPARE DEBUG] product added to compare:",
        action.product.id,
        action.product.name,
        "compare count:",
        next.length
      );
      return { products: next };
    }
    case "remove":
      return { products: state.products.filter((p) => p.id !== action.productId) };
    case "clear":
      return { products: [] };
    case "set":
      return { products: action.products };
    default:
      return state;
  }
}

export function CompareProvider({ children, max = 3 }: { children: React.ReactNode; max?: number }) {
  const [state, dispatch] = useReducer(reducer, { products: [] });

  const api = useMemo(() => {
    return {
      products: state.products,
      isSelected: (id: string) => state.products.some((p) => p.id === id),
      toggle: (product: Product): CompareToggleResult => {
        const exists = state.products.some((p) => p.id === product.id);
        if (exists) {
          dispatch({ type: "toggle", product, max });
          return "removed";
        }
        if (state.products.length >= max) {
          return "max_reached";
        }
        dispatch({ type: "toggle", product, max });
        return "added";
      },
      remove: (productId: string) => dispatch({ type: "remove", productId }),
      clear: () => dispatch({ type: "clear" })
    };
  }, [state.products, max]);

  return <CompareContext.Provider value={api}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}

