"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../lib/api-client";
import { ProductCard } from "../products/ProductCard";
import { ProductRailWithNav } from "./ProductRailWithNav";

const STORAGE_KEY = "recentlyViewedSlugs";

export function RecentlyViewedRail() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const slugs: string[] = raw ? JSON.parse(raw) : [];
      if (slugs.length === 0) {
        setProducts([]);
        return;
      }
      const query = slugs.slice(0, 12).map((s) => encodeURIComponent(s)).join(",");
      fetch(`${API_BASE_URL}/products/by-slugs?slugs=${query}`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : []))
        .then((data: any[]) => setProducts(Array.isArray(data) ? data : []))
        .catch(() => setProducts([]));
    } catch {
      setProducts([]);
    }
  }, []);

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
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Son gezilen ürünler</h2>
      </div>
      <ProductRailWithNav ariaLabel="Son gezilen ürünler">
        {products.map((p) => (
          <div key={p.id} className="product-rail-card">
            <ProductCard product={p} />
          </div>
        ))}
      </ProductRailWithNav>
    </section>
  );
}
