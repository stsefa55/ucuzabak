"use client";

import { useEffect } from "react";

const STORAGE_KEY = "recentlyViewedSlugs";
const MAX_ITEMS = 12;

export function RecordProductView({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const rest = list.filter((s) => s !== slug);
      const next = [slug, ...rest].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, [slug]);

  return null;
}
