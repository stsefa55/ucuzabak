"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Heart,
  Bell,
  User,
  LogIn,
  UserPlus,
  LogOut,
  Shield,
  ChevronRight,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useCallback, useState } from "react";
import { apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../stores/auth-store";
import { getRootCategoryIconComponent } from "../../lib/categoryIconMap";

interface Category {
  id: number;
  name: string;
  slug: string;
  iconName?: string | null;
  imageUrl?: string | null;
}

interface MobileMenuProps {
  onClose: () => void;
}

export function MobileMenu({ onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearSession } = useAuthStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["header-categories"],
    queryFn: () => apiFetch<Category[]>("/categories"),
  });

  // İlk kategori yüklendiğinde otomatik seç
  useEffect(() => {
    if (categories.length > 0 && !activeSlug) {
      setActiveSlug(categories[0].slug);
    }
  }, [categories, activeSlug]);

  const { data: children = [], isFetching: childrenLoading } = useQuery<Category[]>({
    queryKey: ["header-categories-children", activeSlug],
    enabled: !!activeSlug,
    queryFn: () =>
      apiFetch<Category[]>(`/categories/${encodeURIComponent(activeSlug as string)}/children`),
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    clearSession();
    onClose();
    router.push("/giris");
  };

  const nav = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleTabClick = (slug: string) => {
    setActiveSlug(slug);
    // Seçilen sekmeyi görünür alana kaydır
    const tab = document.getElementById(`mm-tab-${slug}`);
    tab?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  };

  const activeCategory = categories.find((c) => c.slug === activeSlug);

  const content = (
    <div className="mobile-menu-overlay" onClick={handleBackdropClick}>
      <div ref={panelRef} className="mobile-menu" role="dialog" aria-label="Menü" aria-modal="true">
        {/* Header */}
        <div className="mobile-menu__header">
          {user ? (
            <div className="mobile-menu__user">
              <div className="mobile-menu__avatar">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="mobile-menu__user-info">
                <span className="mobile-menu__user-name">{user.name}</span>
                <span className="mobile-menu__user-email">{user.email}</span>
              </div>
            </div>
          ) : (
            <div className="mobile-menu__guest">
              <span className="mobile-menu__guest-text">Hoş geldiniz</span>
            </div>
          )}
          <button type="button" className="mobile-menu__close" onClick={onClose} aria-label="Kapat">
            <X size={20} />
          </button>
        </div>

        {/* Quick links / Auth */}
        {user ? (
          <div className="mobile-menu__quick-links">
            <button
              type="button"
              className={`mobile-menu__quick-link ${pathname === "/profil" ? "mobile-menu__quick-link--active" : ""}`}
              onClick={() => nav("/profil")}
            >
              <User size={16} />
              <span>Hesabım</span>
            </button>
            <button
              type="button"
              className={`mobile-menu__quick-link ${pathname === "/favoriler" ? "mobile-menu__quick-link--active" : ""}`}
              onClick={() => nav("/favoriler")}
            >
              <Heart size={16} />
              <span>Favoriler</span>
            </button>
            <button
              type="button"
              className={`mobile-menu__quick-link ${pathname === "/alarm" ? "mobile-menu__quick-link--active" : ""}`}
              onClick={() => nav("/alarm")}
            >
              <Bell size={16} />
              <span>Alarmlar</span>
            </button>
            {user.role === "ADMIN" && (
              <button
                type="button"
                className="mobile-menu__quick-link"
                onClick={() => nav("/admin")}
              >
                <Shield size={16} />
                <span>Admin</span>
              </button>
            )}
          </div>
        ) : (
          <div className="mobile-menu__auth-buttons">
            <Link href="/giris" className="mobile-menu__auth-btn mobile-menu__auth-btn--primary" onClick={onClose}>
              <LogIn size={16} />
              Giriş yap
            </Link>
            <Link href="/kayit" className="mobile-menu__auth-btn mobile-menu__auth-btn--secondary" onClick={onClose}>
              <UserPlus size={16} />
              Kayıt ol
            </Link>
          </div>
        )}

        {/* Kategori sekmeleri (yatay scroll) */}
        <div className="mobile-menu__tabs-wrap">
          <div ref={tabsRef} className="mobile-menu__tabs">
            {categories.map((cat) => {
              const isActive = activeSlug === cat.slug;
              return (
                <button
                  key={cat.id}
                  id={`mm-tab-${cat.slug}`}
                  type="button"
                  className={`mobile-menu__tab ${isActive ? "mobile-menu__tab--active" : ""}`}
                  onClick={() => handleTabClick(cat.slug)}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Alt kategoriler alanı */}
        <div className="mobile-menu__subcats">
          {activeCategory && (
            <Link
              href={`/kategori/${encodeURIComponent(activeCategory.slug)}`}
              className="mobile-menu__subcat-see-all"
              onClick={onClose}
            >
              Tüm {activeCategory.name}
              <ChevronRight size={14} />
            </Link>
          )}

          {childrenLoading ? (
            <div className="mobile-menu__subcat-loading">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="mobile-menu__subcat-skel" />
              ))}
            </div>
          ) : children.length > 0 ? (
            <ul className="mobile-menu__subcat-list">
              {children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/kategori/${encodeURIComponent(activeSlug!)}/${encodeURIComponent(child.slug)}`}
                    className="mobile-menu__subcat-item"
                    onClick={onClose}
                  >
                    <span className="mobile-menu__subcat-icon">
                      {(() => {
                        const Icon = getRootCategoryIconComponent(child.slug);
                        return <Icon size={16} color="#64748b" />;
                      })()}
                    </span>
                    <span className="mobile-menu__subcat-label">{child.name}</span>
                    <ChevronRight size={13} className="mobile-menu__cat-arrow" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mobile-menu__subcat-empty">Bu kategoride alt kategori yok.</p>
          )}
        </div>

        {/* Footer */}
        {user && (
          <div className="mobile-menu__footer">
            <button type="button" className="mobile-menu__logout" onClick={handleLogout}>
              <LogOut size={16} />
              Çıkış yap
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
