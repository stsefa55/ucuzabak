"use client";

import type { ReactNode } from "react";
import type { ProductCardProduct } from "../products/ProductCard";
import { ProductsInfiniteFromApi } from "../products/ProductsInfiniteFromApi";

type SearchQuery = {
  q?: string;
  categorySlug?: string;
  categorySlugs?: string;
  brandSlug?: string;
  brandSlugs?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
};

type SearchPageResponse = {
  items: ProductCardProduct[];
  total: number;
  page: number;
  pageSize: number;
};

type Props = {
  query: SearchQuery;
  initialPage: SearchPageResponse;
  emptyState?: ReactNode;
};

export function SearchResultsInfinite({ query, initialPage, emptyState }: Props) {
  return (
    <ProductsInfiniteFromApi
      queryKeyPrefix="search-infinite"
      endpoint="/search/products"
      query={{
        q: query.q,
        categorySlug: query.categorySlug,
        categorySlugs: query.categorySlugs,
        brandSlug: query.brandSlug,
        brandSlugs: query.brandSlugs,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        sort: query.sort
      }}
      initialPage={initialPage}
      emptyMessage="Filtrelerinize uygun ürün bulunamadı."
      emptyState={emptyState}
    />
  );
}

