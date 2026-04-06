"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";

type CategoryLink = { name: string; slug: string };

type Props = {
  q?: string;
  /** Kategori / marka / fiyat filtresi açık mı */
  hasFilters: boolean;
  popularQueries: string[];
  popularCategories: CategoryLink[];
  sort?: string;
};

function buildAramaUrlOnlyQuery(q: string | undefined, sort: string | undefined) {
  const p = new URLSearchParams();
  const t = q?.trim();
  if (t) p.set("q", t);
  if (sort) p.set("sort", sort);
  const s = p.toString();
  return s ? `/arama?${s}` : "/arama";
}

export function SearchEmptyState({
  q,
  hasFilters,
  popularQueries,
  popularCategories,
  sort
}: Props) {
  const trimmed = q?.trim() ?? "";
  const clearFiltersHref = buildAramaUrlOnlyQuery(trimmed || undefined, sort);

  return (
    <div className="search-empty-state-wrap">
      <section className="search-empty-state" aria-labelledby="search-empty-title">
        <div className="search-empty-state__icon" aria-hidden>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            <path d="M8 11h6" strokeLinecap="round" />
          </svg>
        </div>
        <h2 id="search-empty-title" className="search-empty-state__kicker">
          Sonuç bulunamadı
        </h2>
        {trimmed ? (
          <p className="search-empty-state__query-big">&quot;{trimmed}&quot;</p>
        ) : null}
        {trimmed ? (
          <p className="search-empty-state__lead">ile ilgili bir sonuç bulunamadı.</p>
        ) : (
          <p className="search-empty-state__lead">
            Arama kutusuna bir şey yazın veya aşağıdaki önerilere göz atın.
          </p>
        )}

        <div className="search-empty-state__actions">
          {hasFilters ? (
            <Link href={clearFiltersHref} className="btn-primary search-empty-state__btn">
              Filtreleri temizle
            </Link>
          ) : null}
          <Link
            href="/"
            className={hasFilters ? "btn-secondary search-empty-state__btn" : "btn-primary search-empty-state__btn"}
          >
            Ana sayfaya dön
          </Link>
        </div>
      </section>

      {popularQueries.length > 0 ? (
        <section className="search-empty-block" aria-labelledby="search-popular-queries-title">
          <h3 id="search-popular-queries-title" className="search-empty-block__title">
            Popüler aramalar
          </h3>
          <div className="search-empty-block__tags">
            {popularQueries.map((term, i) => (
              <Link
                key={`${i}-${term}`}
                href={`/arama?q=${encodeURIComponent(term)}`}
                className="header-search-popular-tag"
              >
                {term}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {popularCategories.length > 0 ? (
        <section className="search-empty-block" aria-labelledby="search-popular-cats-title">
          <h3 id="search-popular-cats-title" className="search-empty-block__title search-empty-block__title--with-icon">
            <LayoutGrid className="search-empty-block__title-icon" size={18} strokeWidth={1.75} aria-hidden />
            Popüler kategoriler
          </h3>
          <ul className="search-empty-cat-grid">
            {popularCategories.map((cat) => (
              <li key={cat.slug} className="search-empty-cat-grid__cell">
                <Link href={`/kategori/${encodeURIComponent(cat.slug)}`} className="search-empty-cat-grid__link">
                  <span className="search-empty-cat-grid__name">{cat.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
