"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api-client";
import { ProductCard, type ProductCardProduct } from "./ProductCard";

type ProductsPageResponse = {
  items: ProductCardProduct[];
  total: number;
  page: number;
  pageSize: number;
};

type Props = {
  queryKeyPrefix: string;
  endpoint: "/products" | "/search/products";
  query: Record<string, string | undefined>;
  initialPage: ProductsPageResponse;
  emptyMessage?: string;
  /** Varsa boş sonuçta bu blok gösterilir (arama sayfası vb.). */
  emptyState?: ReactNode;
};

function buildParams(
  query: Record<string, string | undefined>,
  page: number,
  pageSize = 20
): URLSearchParams {
  const p = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v != null && v !== "") p.set(k, v);
  });
  p.set("page", String(page));
  p.set("pageSize", String(pageSize));
  return p;
}

export function ProductsInfiniteFromApi({
  queryKeyPrefix,
  endpoint,
  query,
  initialPage,
  emptyMessage = "Filtrelerinize uygun ürün bulunamadı.",
  emptyState
}: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const key = useMemo(
    () => [queryKeyPrefix, endpoint, ...Object.entries(query).flat()],
    [queryKeyPrefix, endpoint, query]
  );

  const q = useInfiniteQuery({
    queryKey: key,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = buildParams(query, Number(pageParam), initialPage.pageSize || 20);
      return apiFetch<ProductsPageResponse>(`${endpoint}?${params.toString()}`);
    },
    initialData: {
      pageParams: [1],
      pages: [initialPage]
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, page) => acc + page.items.length, 0);
      if (loaded >= lastPage.total) return undefined;
      return lastPage.page + 1;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const products = useMemo(() => {
    const dedupe = new Map<number, ProductCardProduct>();
    for (const page of q.data?.pages ?? []) {
      for (const item of page.items ?? []) {
        if (!dedupe.has(item.id)) dedupe.set(item.id, item);
      }
    }
    return Array.from(dedupe.values());
  }, [q.data]);

  const total = q.data?.pages?.[0]?.total ?? initialPage.total ?? 0;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && q.hasNextPage && !q.isFetchingNextPage) {
          q.fetchNextPage();
        }
      },
      { root: null, rootMargin: "300px 0px", threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [q.hasNextPage, q.isFetchingNextPage, q.fetchNextPage]);

  if (q.isError) {
    return <p className="text-danger">Ürünler yüklenirken bir hata oluştu.</p>;
  }

  if (products.length === 0) {
    if (emptyState) return emptyState;
    return (
      <p className="text-muted" style={{ fontSize: "0.9rem" }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <section>
      <div className="grid grid-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {q.isFetchingNextPage ? (
        <div className="skel-grid" style={{ marginTop: "1rem" }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skel skel--card" />
          ))}
        </div>
      ) : null}

      <div ref={sentinelRef} style={{ height: 1 }} />

      {!q.hasNextPage ? (
        <div className="products-infinite-foot products-infinite-foot--end" role="status" aria-live="polite">
          <span className="products-infinite-foot__icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="products-infinite-foot__body">
            <span className="products-infinite-foot__title">Tüm sonuçları gördünüz</span>
            <span className="products-infinite-foot__sub">
              {products.length === total
                ? `Bu listede toplam ${total.toLocaleString("tr-TR")} ürün var`
                : `${products.length.toLocaleString("tr-TR")} / ${total.toLocaleString("tr-TR")} ürün gösteriliyor`}
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

