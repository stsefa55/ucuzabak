"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiBaseUrl } from "../../lib/api-client";
import {
  RECENTLY_VIEWED_STORAGE_KEY,
  RECENTLY_VIEWED_UPDATED_EVENT
} from "../../stores/recent-viewed-store";
import { ProductCard } from "../products/ProductCard";
import { ProductRailWithNav } from "./ProductRailWithNav";

/** localStorage slug sırasına göre API yanıtını hizala (sıra sapması / yarış koşullarına karşı). */
function orderProductsBySlugs(slugs: string[], items: any[]): any[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const bySlug = new Map<string, any>();
  for (const p of items) {
    if (p && typeof p.slug === "string" && p.slug.length > 0) {
      bySlug.set(p.slug, p);
    }
  }
  return slugs.map((s) => bySlug.get(s)).filter(Boolean);
}

type RecentlyViewedRailProps = {
  /** Varsayılan: "Son gezilen ürünler" */
  title?: string;
};

export function RecentlyViewedRail({ title = "Son gezilen ürünler" }: RecentlyViewedRailProps) {
  const [products, setProducts] = useState<any[]>([]);
  const fetchGenerationRef = useRef(0);

  const loadFromStorage = useCallback(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY) : null;
      const slugs: string[] = raw ? JSON.parse(raw) : [];
      if (slugs.length === 0) {
        fetchGenerationRef.current += 1;
        setProducts([]);
        return;
      }
      const orderedSlugs = slugs.slice(0, 12);
      const gen = ++fetchGenerationRef.current;
      const query = orderedSlugs.map((s) => encodeURIComponent(s)).join(",");
      fetch(`${getApiBaseUrl()}/products/by-slugs?slugs=${query}`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : []))
        .then((data: any[]) => {
          if (gen !== fetchGenerationRef.current) return;
          if (!Array.isArray(data)) {
            setProducts([]);
            return;
          }
          setProducts(orderProductsBySlugs(orderedSlugs, data));
        })
        .catch(() => {
          if (gen !== fetchGenerationRef.current) return;
          setProducts([]);
        });
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
    const onUpdate = () => loadFromStorage();
    window.addEventListener(RECENTLY_VIEWED_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(RECENTLY_VIEWED_UPDATED_EVENT, onUpdate);
  }, [loadFromStorage]);

  if (products.length < 4) return null;

  return (
    <section style={{ marginTop: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "0.5rem"
        }}
      >
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>{title}</h2>
      </div>
      <ProductRailWithNav ariaLabel="Son gezilen ürünler">
        {products.map((p) => (
          <div key={p.slug} className="product-rail-card">
            <ProductCard product={p} suppressRecentViewedOnImageBrowse />
          </div>
        ))}
      </ProductRailWithNav>
    </section>
  );
}
