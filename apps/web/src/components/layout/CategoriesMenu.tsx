"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { apiFetch } from "../../lib/api-client";
import { cn } from "../../lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMenuBackdrop } from "./MenuBackdrop";
import { getRootCategoryIconComponent } from "../../lib/categoryIconMap";

interface Category {
  id: number;
  name: string;
  slug: string;
  iconName?: string | null;
  imageUrl?: string | null;
}

interface CategoriesMenuProps {
  anchorRef?: React.RefObject<HTMLDivElement | null>;
}

const HOVER_CLEAR_MS = 280;

export function CategoriesMenu({ anchorRef }: CategoriesMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const megaPanelRef = useRef<HTMLDivElement>(null);
  const hoverClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { register } = useMenuBackdrop();

  const [hoveredRootSlug, setHoveredRootSlug] = useState<string | null>(null);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["header-categories"],
    queryFn: () => apiFetch<Category[]>("/categories")
  });

  const clearHoverTimer = useCallback(() => {
    if (hoverClearTimerRef.current) {
      clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }
  }, []);

  const scheduleClearHover = useCallback(() => {
    clearHoverTimer();
    hoverClearTimerRef.current = setTimeout(() => {
      setHoveredRootSlug(null);
      hoverClearTimerRef.current = null;
    }, HOVER_CLEAR_MS);
  }, [clearHoverTimer]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) return register();
  }, [open, register]);

  useEffect(() => {
    if (!open) {
      setHoveredRootSlug(null);
    }
  }, [open]);

  const { data: children = [], isFetching: childrenLoading } = useQuery<Category[]>({
    queryKey: ["header-categories-children", hoveredRootSlug],
    enabled: open && !!hoveredRootSlug,
    queryFn: () =>
      apiFetch<Category[]>(`/categories/${encodeURIComponent(hoveredRootSlug as string)}/children`)
  });

  const activeRoot = categories.find((c) => c.slug === hoveredRootSlug);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      const inTrigger = triggerWrapRef.current?.contains(t);
      const inMega = megaPanelRef.current?.contains(t);
      if (!inTrigger && !inMega) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      window.addEventListener("click", onClick);
      window.addEventListener("keydown", onKey);
    }
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleOpenToggle = () => setOpen((v) => !v);

  const handleLeftEnter = (slug: string) => {
    clearHoverTimer();
    setHoveredRootSlug(slug);
  };

  const handleMegaEnter = () => {
    clearHoverTimer();
  };

  const handleMegaLeave = () => {
    scheduleClearHover();
  };

  const megaContent =
    open && categories.length > 0 ? (
      <div
        ref={megaPanelRef}
        id="mega-menu-panel"
        className="mega-menu"
        style={{ zIndex: 60 }}
        onMouseEnter={handleMegaEnter}
        onMouseLeave={handleMegaLeave}
        role="dialog"
        aria-label="Kategori menüsü"
        aria-modal="false"
      >
        <div className="mega-menu__inner">
          <nav
            className={cn("mega-menu__cols", activeRoot && "mega-menu__cols--with-preview")}
            aria-label="Kategoriler"
          >
            <div className="mega-menu__sidebar">
              <ul className="mega-menu__root-list">
                {categories.map((cat) => {
                  const isHighlight = hoveredRootSlug === cat.slug;
                  const Icon = getRootCategoryIconComponent(cat.slug);
                  return (
                    <li key={cat.id}>
                      <Link
                        href={`/kategori/${encodeURIComponent(cat.slug)}`}
                        className={cn(
                          "mega-menu__root-item",
                          isHighlight && "mega-menu__root-item--highlight"
                        )}
                        onMouseEnter={() => handleLeftEnter(cat.slug)}
                        onFocus={() => handleLeftEnter(cat.slug)}
                        onClick={() => setOpen(false)}
                      >
                        <span className="mega-menu__root-icon" aria-hidden>
                          <Icon size={18} color="#374151" />
                        </span>
                        <span className="mega-menu__root-label">{cat.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {activeRoot ? (
              <div className="mega-menu__main" aria-live="polite">
                <>
                  <div className="mega-menu__main-head">
                    <h2 className="mega-menu__main-title">{activeRoot.name}</h2>
                    <Link
                      href={`/kategori/${activeRoot.slug}`}
                      className="mega-menu__see-all"
                      onClick={() => setOpen(false)}
                    >
                      Tümünü gör
                    </Link>
                  </div>
                  {childrenLoading ? (
                    <p className="mega-menu__loading">Yükleniyor...</p>
                  ) : children.length > 0 ? (
                    <ul className="mega-menu__child-grid">
                      {children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={`/kategori/${activeRoot.slug}/${child.slug}`}
                            className="mega-menu__child-link"
                            onClick={() => setOpen(false)}
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mega-menu__empty">Bu kategoride alt kategori bulunmuyor.</p>
                  )}
                </>
              </div>
            ) : null}
          </nav>
        </div>
      </div>
    ) : null;

  return (
    <div
      ref={triggerWrapRef}
      className="desktop-only"
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        type="button"
        onClick={handleOpenToggle}
        className={cn("btn-ghost")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: "0.9rem",
          fontWeight: 500,
          color: "#374151"
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? "mega-menu-panel" : undefined}
      >
        <LayoutGrid size={18} />
        Kategoriler
        <ChevronDown size={16} style={{ opacity: open ? 1 : 0.7 }} />
      </button>
      {mounted && megaContent
        ? anchorRef?.current
          ? createPortal(megaContent, anchorRef.current)
          : megaContent
        : null}
    </div>
  );
}
