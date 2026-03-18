"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../lib/api-client";

export function PopularSearches() {
  const [queries, setQueries] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/search/popular-queries?limit=12`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setQueries(Array.isArray(data) ? data : []))
      .catch(() => setQueries([]));
  }, []);

  if (queries.length === 0) return null;

  return (
    <section className="popular-searches" style={{ marginTop: "2.5rem", paddingTop: "2rem", borderTop: "1px solid #e5e7eb" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", textAlign: "center" }}>
        Popüler aramalar
      </h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.5rem"
        }}
      >
        {queries.map((q) => (
          <Link
            key={q}
            href={`/arama?q=${encodeURIComponent(q)}`}
            className="popular-search-tag"
            style={{
              display: "inline-block",
              padding: "0.4rem 0.85rem",
              fontSize: "0.875rem",
              color: "#374151",
              backgroundColor: "#f3f4f6",
              borderRadius: "9999px",
              textDecoration: "none",
              transition: "background-color 0.15s ease, color 0.15s ease"
            }}
          >
            {q}
          </Link>
        ))}
      </div>
    </section>
  );
}
