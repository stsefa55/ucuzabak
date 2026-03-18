"use client";

import Link from "next/link";
import { X, Scale } from "lucide-react";
import { useCompareStore } from "../../stores/compare-store";

export function CompareBar() {
  const compareProducts = useCompareStore((s) => s.compareProducts);
  const removeProduct = useCompareStore((s) => s.removeProduct);

  if (compareProducts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#0f172a",
        color: "#f9fafb",
        borderRadius: 999,
        padding: "0.5rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: "0.82rem",
        boxShadow: "0 10px 25px rgba(15,23,42,0.35)",
        zIndex: 40
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Scale size={16} />
        <span style={{ fontWeight: 500 }}>{compareProducts.length} ürün karşılaştırılıyor</span>
      </div>

      <div className="scroll-hide" style={{ display: "flex", alignItems: "center", gap: 6, maxWidth: 260 }}>
        {compareProducts.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => removeProduct(p.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              borderRadius: 999,
              border: "1px solid #1f2937",
              backgroundColor: "#111827",
              padding: "0.2rem 0.55rem",
              fontSize: "0.74rem",
              color: "#e5e7eb",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
            <X size={12} />
          </button>
        ))}
      </div>

      <Link
        href="/karsilastir"
        className="btn-secondary"
        style={{
          fontSize: "0.78rem",
          padding: "0.35rem 0.8rem",
          backgroundColor: "#f9fafb",
          color: "#111827",
          whiteSpace: "nowrap"
        }}
      >
        KARŞILAŞTIR
      </Link>
    </div>
  );
}

