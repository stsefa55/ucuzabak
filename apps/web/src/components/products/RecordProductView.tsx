"use client";

import { useEffect } from "react";
import { touchRecentlyViewed } from "../../stores/recent-viewed-store";

export function RecordProductView({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug) return;
    touchRecentlyViewed(slug);
  }, [slug]);

  return null;
}
