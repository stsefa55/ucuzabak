"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { FolderOpen, Package, Search, Tag, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { getApiBaseUrl } from "../../lib/api-client";
import { addToSearchHistory, clearSearchHistory, getSearchHistory } from "../../lib/search-history";

type SearchSuggestItem = {
  type: "product" | "brand" | "category";
  label: string;
  slug: string;
};

function parseSuggestPayload(data: unknown): SearchSuggestItem[] {
  if (!Array.isArray(data)) return [];
  const out: SearchSuggestItem[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const type = o.type;
    if (type !== "product" && type !== "brand" && type !== "category") continue;
    if (typeof o.label !== "string" || typeof o.slug !== "string") continue;
    if (!o.label.trim() || !o.slug.trim()) continue;
    out.push({ type, label: o.label.trim(), slug: o.slug.trim() });
  }
  return out;
}

const MIN_SUGGEST_CHARS = 2;
const DEBOUNCE_MS = 280;
const SUGGEST_LIMIT = 8;
const HISTORY_MATCH_LIMIT = 5;

type ComboRow = { kind: "history"; text: string } | { kind: "suggest"; item: SearchSuggestItem };

function HighlightMatch({ label, query }: { label: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{label}</>;
  const lower = label.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) return <>{label}</>;
  return (
    <>
      {label.slice(0, idx)}
      <mark className="header-search-highlight">{label.slice(idx, idx + q.length)}</mark>
      {label.slice(idx + q.length)}
    </>
  );
}

export function HeaderMobileSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const panelId = useId();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (pathname === "/arama") setQuery(searchParams?.get("q") ?? "");
    else setQuery("");
  }, [pathname, searchParams]);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetch(`${getApiBaseUrl()}/search/popular-queries?limit=10`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPopular(Array.isArray(data) ? data : []))
      .catch(() => setPopular([]));
  }, [open]);

  const prefix = query.trim();

  const historyMatches = useMemo(() => {
    if (!prefix) return [];
    const p = prefix.toLowerCase();
    return history.filter((h) => h.toLowerCase().includes(p)).slice(0, HISTORY_MATCH_LIMIT);
  }, [history, prefix]);

  const displayRows: ComboRow[] = useMemo(() => {
    const r: ComboRow[] = [];
    for (const text of historyMatches) r.push({ kind: "history", text });
    if (!loading) {
      for (const item of suggestions.slice(0, SUGGEST_LIMIT)) r.push({ kind: "suggest", item });
    }
    return r;
  }, [historyMatches, suggestions, loading]);

  useEffect(() => {
    if (!prefix || prefix.length < MIN_SUGGEST_CHARS) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ac = new AbortController();
    const t = window.setTimeout(() => {
      fetch(`${getApiBaseUrl()}/search/suggest?q=${encodeURIComponent(prefix)}&limit=${SUGGEST_LIMIT}`, {
        credentials: "include",
        signal: ac.signal,
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (!ac.signal.aborted) setSuggestions(parseSuggestPayload(data));
        })
        .catch((err: Error) => {
          if (err.name !== "AbortError") setSuggestions([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [prefix]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        const panel = document.getElementById(panelId);
        if (panel && panel.contains(e.target as Node)) return;
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown, true);
    return () => document.removeEventListener("mousedown", onPointerDown, true);
  }, [open, panelId]);

  const runSearch = useCallback(
    (q: string) => {
      const t = q.trim();
      if (t) {
        addToSearchHistory(t);
        router.push(`/arama?q=${encodeURIComponent(t)}`);
      } else {
        router.push("/arama");
      }
      setOpen(false);
      setHistory(getSearchHistory());
      inputRef.current?.blur();
    },
    [router],
  );

  const applySuggestion = useCallback(
    (s: SearchSuggestItem) => {
      addToSearchHistory(s.label);
      setOpen(false);
      setHistory(getSearchHistory());
      inputRef.current?.blur();
      if (s.type === "product") router.push(`/urun/${encodeURIComponent(s.slug)}`);
      else if (s.type === "brand") router.push(`/marka/${encodeURIComponent(s.slug)}`);
      else router.push(`/kategori/${encodeURIComponent(s.slug)}`);
    },
    [router],
  );

  const handleClearHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearSearchHistory();
    setHistory([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const panelContent = open ? (
    <div id={panelId} className="mobile-search-panel">
      <div className="mobile-search-panel__inner">
        {prefix ? (
          <div>
            <span className="header-search-panel__section-title">Öneriler</span>

            {loading && prefix.length >= MIN_SUGGEST_CHARS && (
              <div className="header-search-skeleton" aria-busy="true">
                <div className="header-search-skeleton__line" />
                <div className="header-search-skeleton__line header-search-skeleton__line--mid" />
                <div className="header-search-skeleton__line header-search-skeleton__line--short" />
              </div>
            )}

            {!loading && displayRows.length === 0 && (
              <p className="header-search-panel__empty">
                {prefix.length < MIN_SUGGEST_CHARS
                  ? "Canlı öneriler için en az 2 karakter yazın."
                  : "Eşleşen sonuç yok. Tam arama için arayın."}
              </p>
            )}

            {displayRows.length > 0 && (
              <ul className="header-search-results" role="listbox">
                {displayRows.map((row, i) => {
                  const showSuggestLabel =
                    row.kind === "suggest" && (i === 0 || displayRows[i - 1]?.kind === "history");

                  if (row.kind === "history") {
                    return (
                      <li key={`h-${row.text}-${i}`} role="none">
                        {i === 0 && (
                          <span className="header-search-results__group-label" aria-hidden>
                            Geçmişten
                          </span>
                        )}
                        <button
                          type="button"
                          className="header-search-panel-item"
                          onClick={() => runSearch(row.text)}
                        >
                          <Search size={14} style={{ flexShrink: 0, color: "#9ca3af" }} aria-hidden />
                          <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                            <HighlightMatch label={row.text} query={prefix} />
                          </span>
                        </button>
                      </li>
                    );
                  }

                  const s = row.item;
                  const Icon = s.type === "product" ? Package : s.type === "brand" ? Tag : FolderOpen;
                  const kind = s.type === "product" ? "Ürün" : s.type === "brand" ? "Marka" : "Kategori";
                  return (
                    <li key={`${s.type}-${s.slug}-${i}`} role="none">
                      {showSuggestLabel && (
                        <span className="header-search-results__group-label" aria-hidden>
                          Katalogdan
                        </span>
                      )}
                      <button
                        type="button"
                        className="header-search-panel-item"
                        onClick={() => applySuggestion(s)}
                      >
                        <Icon size={14} style={{ flexShrink: 0, color: "#9ca3af" }} aria-hidden />
                        <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                          <HighlightMatch label={s.label} query={prefix} />
                        </span>
                        <span className="header-search-kind">{kind}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <>
            {history.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span className="header-search-panel__section-title">Geçmiş aramalar</span>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="btn-ghost header-search-panel__clear-history"
                    aria-label="Geçmişi temizle"
                  >
                    <Trash2 size={12} style={{ marginRight: 2 }} aria-hidden /> Temizle
                  </button>
                </div>
                <ul className="header-search-results header-search-results--plain" role="list">
                  {history.map((q) => (
                    <li key={q}>
                      <button type="button" className="header-search-panel-item" onClick={() => runSearch(q)}>
                        <Search size={14} style={{ flexShrink: 0, color: "#9ca3af" }} aria-hidden />
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <span className="header-search-panel__section-title" style={{ display: "block", marginBottom: "0.4rem" }}>
                Popüler aramalar
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {popular.length === 0 ? (
                  <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                    Henüz popüler arama yok.
                  </span>
                ) : (
                  popular.map((q) => (
                    <Link
                      key={q}
                      href={`/arama?q=${encodeURIComponent(q)}`}
                      className="header-search-popular-tag"
                      onClick={() => {
                        addToSearchHistory(q);
                        setOpen(false);
                        inputRef.current?.blur();
                      }}
                    >
                      {q}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div ref={wrapRef} className="mobile-search-wrap">
      <form className="header-mobile-search" onSubmit={handleSubmit} role="search">
        <Search size={16} className="header-mobile-search__icon" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Ürün, marka veya kategori ara…"
          className="header-mobile-search__input"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {query.trim() && (
          <button
            type="button"
            className="mobile-search-clear"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Temizle"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </form>
      {mounted && panelContent && createPortal(panelContent, document.body)}
    </div>
  );
}
