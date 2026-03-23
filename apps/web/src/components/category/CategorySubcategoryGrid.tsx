"use client";

import { useMemo } from "react";
import { getRootCategoryIconComponent } from "../../lib/categoryIconMap";
import { FilterCheckboxRow } from "../search/FilterCheckboxRow";

export type SubcategoryNavItem = {
  id: number;
  name: string;
  slug: string;
  productCount: number;
  pathSlugs: string[];
  iconName?: string | null;
  imageUrl?: string | null;
};

type CategorySubcategoryGridProps = {
  items: SubcategoryNavItem[];
  hrefFor: (item: SubcategoryNavItem) => string;
  currentSlug: string;
  /**
   * root: kök kategoriler — checkbox satırı + küçük ikon.
   * sub: alt / yan — checkbox satırı, ikon yok.
   */
  variant: "root" | "sub";
  emptyMessage?: string;
};

/**
 * Pazaryeri tarzı checkbox görünümlü kategori listesi (yalnızca ürünü olanlar).
 */
export function CategorySubcategoryGrid({
  items,
  hrefFor,
  currentSlug,
  variant,
  emptyMessage
}: CategorySubcategoryGridProps) {
  const displayItems = useMemo(() => items.filter((c) => c.productCount > 0), [items]);

  if (items.length === 0) {
    return (
      <div className="category-filter-empty" role="status">
        <p className="category-filter-empty__text">
          {emptyMessage ?? "Bu kategoride henüz ürün bulunmuyor"}
        </p>
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div className="category-filter-empty" role="status">
        <p className="category-filter-empty__text">
          {emptyMessage ?? "Bu kategoride henüz ürün bulunmuyor"}
        </p>
      </div>
    );
  }

  return (
    <div className="category-filter-checklist" role="navigation" aria-label="Kategori filtreleri">
      {displayItems.map((cat) => {
        const checked = currentSlug === cat.slug;
        const leading =
          variant === "root" ? (
            <span className="category-filter-checklist__icon" aria-hidden>
              {(() => {
                const Icon = getRootCategoryIconComponent(cat.slug);
                return <Icon size={16} color="#475569" />;
              })()}
            </span>
          ) : undefined;

        return (
          <FilterCheckboxRow
            key={cat.id}
            mode="link"
            href={hrefFor(cat)}
            checked={checked}
            label={cat.name}
            meta={<span className="filter-check__count">{cat.productCount}</span>}
            leading={leading}
            className={variant === "sub" ? "filter-check__row--subcategory" : ""}
          />
        );
      })}
    </div>
  );
}
