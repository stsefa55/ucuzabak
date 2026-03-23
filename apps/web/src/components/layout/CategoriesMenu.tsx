"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import { apiFetch } from "../../lib/api-client";
import { cn } from "../../lib/utils";
import { useEffect, useRef, useState } from "react";
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

export function CategoriesMenu({ anchorRef }: CategoriesMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { register } = useMenuBackdrop();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["header-categories"],
    queryFn: () => apiFetch<Category[]>("/categories")
  });
  const [expandedRoot, setExpandedRoot] = useState<string | null>(null);

  const { data: children = [], isFetching: childrenLoading } = useQuery<Category[]>({
    queryKey: ["header-categories-children", expandedRoot],
    enabled: open && !!expandedRoot,
    queryFn: () => apiFetch<Category[]>(`/categories/${encodeURIComponent(expandedRoot as string)}/children`)
  });

  useEffect(() => {
    if (open) return register();
  }, [open, register]);

  useEffect(() => {
    if (!open) setExpandedRoot(null);
  }, [open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const anchor = anchorRef?.current;
      const inAnchor = anchor && anchor.contains(e.target as Node);
      const inTrigger = ref.current && ref.current.contains(e.target as Node);
      if (!inAnchor && !inTrigger) setOpen(false);
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
  }, [open, anchorRef]);

  const renderRootRow = (cat: Category) => {
    const isExpanded = expandedRoot === cat.slug;
    const currentChildren = isExpanded ? children : [];
    return (
      <div key={cat.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
        <button
          type="button"
          onClick={() => setExpandedRoot((prev) => (prev === cat.slug ? null : cat.slug))}
          className="dropdown-item"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: "space-between"
          }}
          aria-expanded={isExpanded}
          aria-controls={`categories-children-${cat.id}`}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {(() => {
              const Icon = getRootCategoryIconComponent(cat.slug);
              return (
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f3f4f6",
                    flex: "0 0 auto"
                  }}
                >
                  <Icon size={18} color="#374151" />
                </span>
              );
            })()}
            <span style={{ fontWeight: 600 }}>{cat.name}</span>
          </span>
          <ChevronRight
            size={16}
            style={{
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
              opacity: 0.8
            }}
          />
        </button>

        {isExpanded ? (
          <div id={`categories-children-${cat.id}`} style={{ padding: "0 8px 10px 28px", display: "grid", gap: 4 }}>
            <Link
              href={`/kategori/${cat.slug}`}
              onClick={() => setOpen(false)}
              className="dropdown-item"
              style={{ fontSize: 13, fontWeight: 700, color: "#2563eb" }}
            >
              Tümünü gör
            </Link>

            {childrenLoading ? (
              <div style={{ fontSize: 13, color: "#6b7280", padding: "6px 8px" }}>Yükleniyor...</div>
            ) : currentChildren.length > 0 ? (
              currentChildren.map((child) => (
                <Link
                  key={child.id}
                  href={`/kategori/${cat.slug}/${child.slug}`}
                  onClick={() => setOpen(false)}
                  className="dropdown-item"
                  style={{ display: "block", padding: "6px 8px", fontSize: 13, color: "#374151" }}
                >
                  {child.name}
                </Link>
              ))
            ) : (
              <div style={{ fontSize: 13, color: "#6b7280", padding: "6px 8px" }}>Alt kategori bulunamadı.</div>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const widePanel =
    open && categories.length > 0 ? (
      <div
        className="dropdown-panel dropdown-panel-categories dropdown-panel-categories-wide"
        style={{
          position: "absolute",
          left: 0,
          top: "100%",
          marginTop: 6,
          width: "100%",
          maxHeight: "min(70vh, 420px)",
          overflowY: "auto",
          overflowX: "hidden",
          zIndex: 60
        }}
      >
        <div style={{ padding: 8 }}>{categories.map(renderRootRow)}</div>
      </div>
    ) : null;

  const narrowPanel =
    open && categories.length > 0 ? (
      <div
        className="dropdown-panel dropdown-panel-categories"
        style={{
          position: "absolute",
          top: "100%",
          left: 0,
          marginTop: 6,
          minWidth: 220,
          maxHeight: "min(70vh, 420px)",
          overflowY: "auto",
          overflowX: "hidden",
          zIndex: 60
        }}
      >
        <div style={{ padding: 6 }}>{categories.map(renderRootRow)}</div>
      </div>
    ) : null;

  return (
    <div ref={ref} className="desktop-only" style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn("btn-ghost")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: "0.9rem",
          fontWeight: 500,
          color: "#374151"
        }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <LayoutGrid size={18} />
        Kategoriler
        <ChevronDown size={16} style={{ opacity: open ? 1 : 0.7 }} />
      </button>
      {anchorRef?.current ? createPortal(widePanel, anchorRef.current) : narrowPanel}
    </div>
  );
}
