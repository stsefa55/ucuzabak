"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "../../lib/api-client";

export function PopularSearches() {
  const [queries, setQueries] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${getApiBaseUrl()}/search/popular-queries?limit=12`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setQueries(Array.isArray(data) ? data : []))
      .catch(() => setQueries([]));
  }, []);

  if (queries.length === 0) return null;

  return (
    <section className="popular-searches">
      <h2 className="popular-searches__title">Popüler aramalar</h2>
      <div className="popular-searches__list">
        {queries.map((q) => (
          <Link
            key={q}
            href={`/arama?q=${encodeURIComponent(q)}`}
            className="popular-search-tag"
          >
            {q}
          </Link>
        ))}
      </div>
    </section>
  );
}
