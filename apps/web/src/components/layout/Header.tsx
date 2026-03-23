"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useId, useRef, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Heart, Bell, User, LogOut, LogIn, UserPlus, Shield, Trash2, X } from "lucide-react";
import { useAuthStore } from "../../stores/auth-store";
import { apiFetch, API_BASE_URL } from "../../lib/api-client";
import { Dropdown, DropdownItem } from "../ui/dropdown";
import { CategoriesMenu } from "./CategoriesMenu";
import { cn } from "../../lib/utils";
import { getSearchHistory, addToSearchHistory, clearSearchHistory } from "../../lib/search-history";

function HeaderFallback() {
  const [logoError, setLogoError] = useState(false);
  return (
    <header className="header" style={{ borderBottom: "1px solid #e5e7eb", background: "#ffffffd9" }}>
      <div className="container header-inner" style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link href="/" className="header-logo" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {logoError ? (
              <>
                <span style={{ width: 32, height: 32, borderRadius: "999px", background: "linear-gradient(135deg, #2563eb, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "0.9rem" }}>U</span>
                <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>UcuzaBak</span>
              </>
            ) : (
              <Image
                src="/logo.png"
                alt="UcuzaBak.com - İndirimleri Yakala"
                width={200}
                height={52}
                style={{ height: 52, width: "auto", maxWidth: "100%", display: "block" }}
                onError={() => setLogoError(true)}
                priority
              />
            )}
          </Link>
          <CategoriesMenu />
        </div>
        <div style={{ flex: 1, minWidth: 0 }} />
        <nav className="header-nav" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/giris">Giriş</Link>
          <Link href="/kayit">Kayıt</Link>
        </nav>
      </div>
    </header>
  );
}

function HeaderInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, clearSession } = useAuthStore();
  const searchPanelId = useId();

  const isActive = (href: string) => pathname === href;

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearSession();
    router.push("/giris");
  };

  const categoriesAnchorRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [logoError, setLogoError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [popularQueries, setPopularQueries] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [panelQuery, setPanelQuery] = useState("");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, [searchOpen]);

  useEffect(() => {
    if (pathname === "/arama") {
      setPanelQuery(searchParams?.get("q") ?? "");
    } else {
      setPanelQuery("");
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!searchOpen) return;
    fetch(`${API_BASE_URL}/search/popular-queries?limit=10`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPopularQueries(Array.isArray(data) ? data : []))
      .catch(() => setPopularQueries([]));
  }, [searchOpen]);

  const prefix = panelQuery.trim();
  useEffect(() => {
    if (!prefix) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    const t = setTimeout(() => {
      fetch(
        `${API_BASE_URL}/search/popular-queries?limit=5&prefix=${encodeURIComponent(prefix)}`,
        { credentials: "include" }
      )
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setSuggestions(Array.isArray(data) ? data : []))
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestionsLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [prefix]);

  useEffect(() => {
    if (!searchOpen) return;
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [searchOpen]);

  const runSearch = (q: string) => {
    const t = String(q).trim();
    if (t) {
      addToSearchHistory(t);
      router.push(`/arama?q=${encodeURIComponent(t)}`);
    } else {
      router.push("/arama");
    }
    setSearchOpen(false);
    setSearchHistory(getSearchHistory());
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearSearchHistory();
    setSearchHistory([]);
  };

  return (
    <header className="header" style={{ borderBottom: "1px solid #e5e7eb", background: "#ffffffd9" }}>
      <div className="container header-inner" style={{ display: "flex", gap: "1.5rem" }}>
        <div ref={categoriesAnchorRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link href="/" className="header-logo" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {logoError ? (
              <>
                <span style={{ width: 32, height: 32, borderRadius: "999px", background: "linear-gradient(135deg, #2563eb, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "0.9rem" }}>U</span>
                <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>UcuzaBak</span>
              </>
            ) : (
              <Image
                src="/logo.png"
                alt="UcuzaBak.com - İndirimleri Yakala"
                width={200}
                height={52}
                style={{ height: 52, width: "auto", maxWidth: "100%", display: "block" }}
                onError={() => setLogoError(true)}
                priority
              />
            )}
          </Link>

          <CategoriesMenu anchorRef={categoriesAnchorRef} />
        </div>

        <div
          ref={searchRef}
          className="desktop-only header-search-wrap"
          style={{ flex: 1, maxWidth: 520, position: "relative" }}
        >
          <form
            className={cn("header-search-trigger", searchOpen && "header-search-trigger-open")}
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(panelQuery);
            }}
          >
            <input
              type="text"
              value={panelQuery}
              onChange={(e) => setPanelQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder="En uygun fiyatı bul, karşılaştır"
              className="header-search-input"
              aria-label="Ara"
              aria-controls={searchOpen ? searchPanelId : undefined}
              autoComplete="off"
            />
            {panelQuery.trim() && (
              <button
                type="button"
                onClick={() => setPanelQuery("")}
                className="header-search-clear"
                aria-label="Aramayı temizle"
              >
                <X size={18} aria-hidden />
              </button>
            )}
            <Search size={20} className="header-search-icon" aria-hidden />
          </form>

          {searchOpen && (
            <div id={searchPanelId} className="header-search-panel" role="dialog" aria-label="Arama menüsü">
              <div className="header-search-panel-inner">
                {prefix ? (
                  <div>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "0.5rem" }}>
                      Öneriler
                    </span>
                    {suggestionsLoading ? (
                      <span className="text-muted" style={{ fontSize: "0.85rem" }}>Yükleniyor...</span>
                    ) : suggestions.length === 0 ? (
                      <span className="text-muted" style={{ fontSize: "0.85rem" }}>Bu arama ile eşleşen popüler arama yok.</span>
                    ) : (
                      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {suggestions.slice(0, 5).map((q) => (
                          <li key={q}>
                            <button
                              type="button"
                              className="header-search-panel-item"
                              onClick={() => runSearch(q)}
                            >
                              <Search size={14} style={{ flexShrink: 0, color: "#9ca3af" }} />
                              {q}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <>
                    {searchHistory.length > 0 && (
                      <div style={{ marginBottom: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6b7280" }}>Geçmiş aramalar</span>
                          <button
                            type="button"
                            onClick={handleClearHistory}
                            className="btn-ghost"
                            style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem", color: "#9ca3af" }}
                            aria-label="Geçmişi temizle"
                          >
                            <Trash2 size={12} style={{ marginRight: 2 }} /> Temizle
                          </button>
                        </div>
                        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                          {searchHistory.map((q) => (
                            <li key={q}>
                              <button
                                type="button"
                                className="header-search-panel-item"
                                onClick={() => runSearch(q)}
                              >
                                <Search size={14} style={{ flexShrink: 0, color: "#9ca3af" }} />
                                {q}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "0.5rem" }}>Popüler aramalar</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                        {popularQueries.length === 0 ? (
                          <span className="text-muted" style={{ fontSize: "0.85rem" }}>Sitede henüz arama verisi yok.</span>
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

        <nav
          className="header-nav"
          style={{ display: "flex", alignItems: "center", gap: "0.75rem", whiteSpace: "nowrap" }}
        >
          {/* Masaüstü kısayol ikonları */}
          {user?.role !== "ADMIN" && (
            <>
              <Link
                href={user ? "/favoriler" : "/giris"}
                className={cn(isActive("/favoriler") && user && "text-blue-600", "desktop-only")}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Heart size={16} /> Favoriler
                </span>
              </Link>
              <Link
                href={user ? "/alarm" : "/giris"}
                className={cn(isActive("/alarm") && user && "text-blue-600", "desktop-only")}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Bell size={16} /> Alarmlar
                </span>
              </Link>
            </>
          )}

          {/* Mobil arama ikonu */}
          <button
            type="button"
            className="btn-ghost mobile-only"
            onClick={() => router.push("/arama")}
            aria-label="Ara"
          >
            <Search size={18} />
          </button>

          {/* Kullanıcı menüsü */}
          {user ? (
            <Dropdown
              trigger={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <User size={18} />
                  <span className="desktop-only" style={{ fontSize: "0.85rem" }}>
                    {user.name}
                  </span>
                </span>
              }
              align="right"
            >
              <DropdownItem onClick={() => router.push("/profil")}>
                <User size={14} style={{ marginRight: 6 }} />
                Hesabım
              </DropdownItem>
              <DropdownItem onClick={() => router.push("/favoriler")}>
                <Heart size={14} style={{ marginRight: 6 }} />
                Favorilerim
              </DropdownItem>
              <DropdownItem onClick={() => router.push("/alarm")}>
                <Bell size={14} style={{ marginRight: 6 }} />
                Fiyat alarmlarım
              </DropdownItem>
              {user.role === "ADMIN" && (
                <DropdownItem onClick={() => router.push("/admin")}>
                  <Shield size={14} style={{ marginRight: 6 }} />
                  Admin paneli
                </DropdownItem>
              )}
              <DropdownItem onClick={handleLogout}>
                <LogOut size={14} style={{ marginRight: 6 }} />
                Çıkış
              </DropdownItem>
            </Dropdown>
          ) : (
            <>
              <Link href="/giris" className="desktop-only">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <LogIn size={16} /> Giriş yap
                </span>
              </Link>
              <Link href="/kayit" className="desktop-only">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <UserPlus size={16} /> Kayıt ol
                </span>
              </Link>
              {/* Mobilde login/register için sade ikon */}
              <Link href="/giris" className="mobile-only" aria-label="Giriş yap">
                <LogIn size={18} />
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Header() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <HeaderInner />
    </Suspense>
  );
}

