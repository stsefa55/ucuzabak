 "use client";

import Link from "next/link";
import { Tag, ShoppingBag, Scale } from "lucide-react";
import { categoryHrefFromSlugs } from "../../lib/categoryPaths";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { useCompareStore } from "../../stores/compare-store";

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    slug: string;
    mainImageUrl?: string | null;
    lowestPriceCache?: string | null;
    offerCountCache?: number;
    brand?: { name: string | null } | null;
    category?: { name: string | null; slug: string } | null;
    /** API: kökten yaprağa slug zinciri (hiyerarşik /kategori/... URL için) */
    categoryPathSlugs?: string[];
    categoryPathNames?: string[];
    ean?: string | null;
    modelNumber?: string | null;
    specsJson?: Record<string, unknown> | null;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const lowestPrice =
    product.lowestPriceCache != null ? `${product.lowestPriceCache} TL` : "Fiyat bilgisi yok";
  const compareProducts = useCompareStore((s) => s.compareProducts);
  const addProduct = useCompareStore((s) => s.addProduct);

  const alreadyInCompare = compareProducts.some((p) => p.id === product.id);
  const canAddMore = compareProducts.length < 4 || alreadyInCompare;

  return (
    <Card className="product-card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="product-card__content">
        <Link href={`/urun/${product.slug}`}>
          <div className="product-card-image">
            {product.mainImageUrl ? (
              <img src={product.mainImageUrl} alt={product.name} draggable={false} />
            ) : (
              <div className="product-image-placeholder">Görsel yok</div>
            )}
          </div>
        </Link>
        <Link href={`/urun/${product.slug}`}>
          <h3 className="product-card__title">{product.name}</h3>
        </Link>
        {(product.brand?.name || product.category) && (
          <div className="product-card__meta text-muted" style={{ display: "grid", gap: 6 }}>
            {product.brand?.name ? <span>{product.brand.name}</span> : null}
            {product.category ? (
              <div>
                <Link
                  href={categoryHrefFromSlugs(product.categoryPathSlugs, product.category.slug)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    border: "1px solid #e5e7eb",
                    borderRadius: 999,
                    padding: "2px 8px",
                    fontSize: 12,
                    color: "#4b5563",
                    background: "#f9fafb"
                  }}
                >
                  {product.category.name}
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </div>
      <div className="product-card__footer">
        <div className="product-card__prices">
          <span className="product-card__price">{lowestPrice}</span>
          <span className="product-card__offers text-muted">
            <ShoppingBag size={14} />
            {product.offerCountCache ?? 0} teklif
          </span>
        </div>
        <div className="product-card__actions">
          <Badge style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem" }} className="product-card__badge">
            <Tag size={14} />
            Öne çıkan
          </Badge>
          <button
            type="button"
            className="btn-secondary btn-sm product-card__compare"
            style={{ opacity: canAddMore || alreadyInCompare ? 1 : 0.6 }}
            disabled={!canAddMore}
            onClick={() =>
              addProduct({
                id: product.id,
                name: product.name,
                slug: product.slug,
                lowestPriceCache: product.lowestPriceCache,
                offerCountCache: product.offerCountCache,
                brand: product.brand,
                category: product.category,
                ean: product.ean,
                modelNumber: product.modelNumber,
                specsJson: product.specsJson ?? undefined
              })
            }
          >
            <Scale size={12} />
            {alreadyInCompare ? "Karşılaştırmada" : "Karşılaştır"}
          </button>
        </div>
      </div>
    </Card>
  );
}

