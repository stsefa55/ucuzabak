"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProductCard, type ProductCardProduct } from "./ProductCard";

type Props = {
  items: ProductCardProduct[];
  emptyMessage?: string;
  pageSize?: number;
};

export function ProductsInfiniteFromList({
  items,
  emptyMessage = "Listeleyecek urun bulunamadi.",
  pageSize = 20
}: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const dedupedItems = useMemo(() => {
    const map = new Map<number, ProductCardProduct>();
    for (const item of items) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
    return Array.from(map.values());
  }, [items]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize, dedupedItems.length]);

  const visibleItems = dedupedItems.slice(0, visibleCount);
  const hasMore = visibleCount < dedupedItems.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + pageSize, dedupedItems.length));
        }
      },
      { root: null, rootMargin: "300px 0px", threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, pageSize, dedupedItems.length]);

  if (dedupedItems.length === 0) {
    return <p className="text-muted">{emptyMessage}</p>;
  }

  return (
    <section>
      <div className="grid grid-3">
        {visibleItems.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {hasMore ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "1rem",
            marginTop: "1rem"
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="card"
              style={{ height: "220px", background: "#f8fafc", border: "1px solid #eef2f7" }}
            />
          ))}
        </div>
      ) : null}

      <div ref={sentinelRef} style={{ height: 1 }} />

      {!hasMore ? (
        <div className="products-infinite-foot products-infinite-foot--end" role="status" aria-live="polite">
          <span className="products-infinite-foot__icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="products-infinite-foot__body">
            <span className="products-infinite-foot__title">Tüm sonuçları gördünüz</span>
            <span className="products-infinite-foot__sub">
              {visibleItems.length === dedupedItems.length
                ? `Bu listede toplam ${dedupedItems.length.toLocaleString("tr-TR")} ürün var`
                : `${visibleItems.length.toLocaleString("tr-TR")} / ${dedupedItems.length.toLocaleString("tr-TR")} ürün gösteriliyor`}
            </span>
          </div>
        </div>
      ) : (
        <div className="products-infinite-foot products-infinite-foot--more">
          <span className="products-infinite-foot__icon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="products-infinite-foot__body">
            <span className="products-infinite-foot__title">Aşağı kaydırdıkça daha fazla ürün yüklenecek</span>
            <span className="products-infinite-foot__sub">Sayfa sonuna gelince otomatik devam eder</span>
          </div>
        </div>
      )}
    </section>
  );
}

