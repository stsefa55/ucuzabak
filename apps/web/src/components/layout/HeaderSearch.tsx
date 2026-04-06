"use client";

import Link from "next/link";
import { FolderOpen, Package, Search, Tag, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject
} from "react";
import { getApiBaseUrl } from "../../lib/api-client";
import { cn } from "../../lib/utils";
import { addToSearchHistory, clearSearchHistory, getSearchHistory } from "../../lib/search-history";

/** Autocomplete satırı: ürün / marka / kategori (GET /search/suggest) */
export type SearchSuggestItem = {
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

export const HeaderSearch = forwardRef<HTMLDivElement, Record<string, never>>(function HeaderSearch(_props, ref) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchPanelId = useId();
  const listboxId = `${searchPanelId}-listbox`;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [popularQueries, setPopularQueries] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestItem[]>([]);
  const [panelQuery, setPanelQuery] = useState("");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<ComboRow[]>([]);
  const activeIndexRef = useRef(-1);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const assignWrapRef = useCallback(
    (el: HTMLDivElement | null) => {
      (wrapRef as MutableRefObject<HTMLDivElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref != null) {
        (ref as MutableRefObject<HTMLDivElement | null>).current = el;
      }
    },
    [ref]
  );

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, [searchOpen]);

  useEffect(() => {
    if (pathname === "/arama") setPanelQuery(searchParams?.get("q") ?? "");
    else setPanelQuery("");
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!searchOpen) return;
    fetch(`${getApiBaseUrl()}/search/popular-queries?limit=10`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPopularQueries(Array.isArray(data) ? data : []))
      .catch(() => setPopularQueries([]));
  }, [searchOpen]);

  const prefix = panelQuery.trim();

  const historyMatches = useMemo(() => {
    if (!prefix) return [];
    const p = prefix.toLowerCase();
    return searchHistory.filter((h) => h.toLowerCase().includes(p)).slice(0, HISTORY_MATCH_LIMIT);
  }, [searchHistory, prefix]);

  /** Yüklenirken katalog önerileri gizlenir (yanlış eşleşme / klavye indeksi karışmasın). */
  const displayRows: ComboRow[] = useMemo(() => {
    const r: ComboRow[] = [];
    for (const text of historyMatches) r.push({ kind: "history", text });
    if (!suggestionsLoading) {
      for (const item of suggestions.slice(0, SUGGEST_LIMIT)) r.push({ kind: "suggest", item });
    }
    return r;
  }, [historyMatches, suggestions, suggestionsLoading]);

  rowsRef.current = displayRows;

  useEffect(() => {
    setActiveIndex(-1);
  }, [prefix, suggestions, suggestionsLoading, searchOpen]);

  useEffect(() => {
    if (activeIndex < 0 || !searchOpen) return;
    const el = optionRefs.current[activeIndex];
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex, searchOpen, displayRows.length]);

  useEffect(() => {
    if (!prefix || prefix.length < MIN_SUGGEST_CHARS) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    setSuggestionsLoading(true);
    const ac = new AbortController();
    const t = window.setTimeout(() => {
      fetch(`${getApiBaseUrl()}/search/suggest?q=${encodeURIComponent(prefix)}&limit=${SUGGEST_LIMIT}`, {
        credentials: "include",
        signal: ac.signal
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (!ac.signal.aborted) setSuggestions(parseSuggestPayload(data));
        })
        .catch((err: Error) => {
          if (err.name !== "AbortError") setSuggestions([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setSuggestionsLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [prefix]);

  useEffect(() => {
    if (!searchOpen) return;
    /** Dışarı tıklama: HeaderSearch ref’siz kullanıldığında forwardRef null kalıyordu; wrapRef her zaman dolu. */
    function onPointerDown(e: MouseEvent) {
      const root = wrapRef.current;
      if (root && !root.contains(e.target as Node)) setSearchOpen(false);
    }
    function onKeyDoc(e: KeyboardEvent) {
      if (e.key === "Escape") setSearchOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDoc);
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDoc);
    };
  }, [searchOpen]);

  const runSearch = useCallback(
    (q: string) => {
      const t = String(q).trim();
      if (t) {
        addToSearchHistory(t);
        router.push(`/arama?q=${encodeURIComponent(t)}`);
      } else {
        router.push("/arama");
      }
      setSearchOpen(false);
      setSearchHistory(getSearchHistory());
    },
    [router]
  );

  const applySuggestion = useCallback(
    (s: SearchSuggestItem) => {
      addToSearchHistory(s.label);
      setSearchOpen(false);
      setSearchHistory(getSearchHistory());
      if (s.type === "product") router.push(`/urun/${encodeURIComponent(s.slug)}`);
      else if (s.type === "brand") router.push(`/marka/${encodeURIComponent(s.slug)}`);
      else router.push(`/kategori/${encodeURIComponent(s.slug)}`);
    },
    [router]
  );

  const handleClearHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearSearchHistory();
    setSearchHistory([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const list = rowsRef.current;
    const idx = activeIndexRef.current;
    if (idx >= 0 && idx < list.length) {
      const row = list[idx];
      if (row.kind === "history") runSearch(row.text);
      else applySuggestion(row.item);
      return;
    }
    runSearch(panelQuery);
  };

  const onInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setSearchOpen(false);
      return;
    }
    const len = rowsRef.current.length;
    if (e.key === "ArrowDown") {
      if (!searchOpen) setSearchOpen(true);
      if (len === 0) return;
      e.preventDefault();
      setActiveIndex((i) => (i < len - 1 ? i + 1 : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      if (len === 0) return;
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : len - 1));
    }
  };

  const activeOptionId =
    activeIndex >= 0 && displayRows[activeIndex]
      ? `${searchPanelId}-opt-${activeIndex}`
      : undefined;

  optionRefs.current = [];

  return (
    <div ref={assignWrapRef} className="desktop-only header-search-wrap">
      <form
        className={cn(
          "header-search-trigger",
          "header-search-input-wrap",
          searchOpen && "header-search-trigger-open"
        )}
        onSubmit={handleSubmit}
        role="search"
      >
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          value={panelQuery}
          onChange={(e) => setPanelQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder="Ürün, marka veya kategori ara…"
          className="header-search-input"
          role="combobox"
          aria-label="Site genelinde ara"
          aria-expanded={searchOpen}
          aria-controls={searchOpen ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={searchOpen ? activeOptionId : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {panelQuery.trim() && (
          <button
            type="button"
            onClick={() => {
              setPanelQuery("");
              inputRef.current?.focus();
            }}
            className="header-search-clear"
            aria-label="Aramayı temizle"
          >
            <X size={18} aria-hidden />
          </button>
        )}
        <Search size={20} className="header-search-icon" aria-hidden />
      </form>

      {searchOpen && (
        <div
          id={searchPanelId}
          className="header-search-panel header-search-panel--scroll"
          role="presentation"
        >
          <div className="header-search-panel-inner">
            {prefix ? (
              <div>
                <div className="header-search-panel__toolbar">
                  <span className="header-search-panel__section-title">Öneriler</span>
                  <span className="header-search-panel__hint" aria-hidden>
                    ↑↓ seç · Enter
                  </span>
                </div>

                {prefix.length < MIN_SUGGEST_CHARS && (
                  <p className="header-search-panel__microcopy">
                    Canlı öneriler için en az {MIN_SUGGEST_CHARS} karakter yazın. Aşağıdaki geçmiş satırları
                    kullanabilirsiniz.
                  </p>
                )}

                {suggestionsLoading && prefix.length >= MIN_SUGGEST_CHARS ? (
                  <div className="header-search-skeleton" aria-busy="true" aria-label="Öneriler yükleniyor">
                    <div className="header-search-skeleton__line" />
                    <div className="header-search-skeleton__line header-search-skeleton__line--mid" />
                    <div className="header-search-skeleton__line header-search-skeleton__line--short" />
                  </div>
                ) : null}

                {!suggestionsLoading && displayRows.length === 0 ? (
                  <p className="header-search-panel__empty">
                    {prefix.length < MIN_SUGGEST_CHARS
                      ? "Geçmişte bu harflerle eşleşen arama yok. Yazmaya devam edin veya Enter ile tam arama yapın."
                      : "Eşleşen ürün, marka veya kategori yok. Tam arama için Enter’a basın."}
                  </p>
                ) : null}

                {displayRows.length > 0 ? (
                  <ul id={listboxId} className="header-search-results" role="listbox" aria-label="Arama önerileri">
                    {displayRows.map((row, i) => {
                      const showSuggestLabel =
                        row.kind === "suggest" && (i === 0 || displayRows[i - 1]?.kind === "history");
                      const optionId = `${searchPanelId}-opt-${i}`;
                      const isActive = i === activeIndex;

                      if (row.kind === "history") {
                        return (
                          <li key={`h-${row.text}-${i}`} role="none">
                            {i === 0 || displayRows[i - 1]?.kind !== "history" ? (
                              <span className="header-search-results__group-label" aria-hidden>
                                Geçmişten
                              </span>
                            ) : null}
                            <button
                              ref={(el) => {
                                optionRefs.current[i] = el;
                              }}
                              type="button"
                              id={optionId}
                              role="option"
                              aria-selected={isActive}
                              className={cn(
                                "header-search-panel-item",
                                isActive && "header-search-panel-item--active"
                              )}
                              onMouseEnter={() => setActiveIndex(i)}
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
                          {showSuggestLabel ? (
                            <span className="header-search-results__group-label" aria-hidden>
                              Katalogdan
                            </span>
                          ) : null}
                          <button
                            ref={(el) => {
                              optionRefs.current[i] = el;
                            }}
                            type="button"
                            id={optionId}
                            role="option"
                            aria-selected={isActive}
                            className={cn(
                              "header-search-panel-item",
                              isActive && "header-search-panel-item--active"
                            )}
                            onMouseEnter={() => setActiveIndex(i)}
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
                ) : null}
              </div>
            ) : (
              <>
                {searchHistory.length > 0 && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem"
                      }}
                    >
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
                      {searchHistory.map((q) => (
                        <li key={q}>
                          <button
                            type="button"
                            className="header-search-panel-item"
                            onClick={() => runSearch(q)}
                          >
                            <Search size={14} style={{ flexShrink: 0, color: "#9ca3af" }} aria-hidden />
                            {q}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <span className="header-search-panel__section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
                    Popüler aramalar
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {popularQueries.length === 0 ? (
                      <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                        Sitede henüz arama verisi yok.
                      </span>
                    ) : (
                      popularQueries.map((q) => (
                        <Link
                          key={q}
                          href={`/arama?q=${encodeURIComponent(q)}`}
                          className="header-search-popular-tag"
                          onClick={() => {
                            addToSearchHistory(q);
                            setSearchOpen(false);
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
      )}
    </div>
  );
});
