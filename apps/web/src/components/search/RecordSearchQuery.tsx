"use client";

import { useEffect } from "react";
import { addToSearchHistory } from "../../lib/search-history";

export function RecordSearchQuery({ query }: { query?: string }) {
  useEffect(() => {
    if (query && query.trim()) addToSearchHistory(query.trim());
  }, [query]);
  return null;
}
