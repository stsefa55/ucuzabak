"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { apiFetch } from "../../lib/api-client";
import { cn } from "../../lib/utils";
import { useEffect, useRef, useState } from "react";
import { useMenuBackdrop } from "./MenuBackdrop";

interface Category {
  id: number;
  name: string;
  slug: string;
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

  useEffect(() => {
    if (open) return register();
  }, [open, register]);

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
        <div className="dropdown-panel-categories-grid">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/kategori/${cat.slug}`}
              onClick={() => setOpen(false)}
              className="dropdown-item"
            >
              {cat.name}
            </Link>
          ))}
        </div>
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
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/kategori/${cat.slug}`}
            onClick={() => setOpen(false)}
            className="dropdown-item"
          >
            {cat.name}
          </Link>
        ))}
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
