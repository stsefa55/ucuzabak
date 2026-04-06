"use client";

import Link from "next/link";
import { getRootCategoryIconComponent } from "../../lib/categoryIconMap";
import { ProductRailWithNav } from "./ProductRailWithNav";

export interface HomeCategoryItem {
  id: number;
  name: string;
  slug: string;
}

export function HomeCategoryShortcuts({ categories }: { categories: HomeCategoryItem[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="home-category-shortcuts" aria-labelledby="home-categories-heading">
      <h2 id="home-categories-heading" className="home-category-shortcuts__title">
        Kategorilere göz at
      </h2>
      <ProductRailWithNav ariaLabel="Kategorilere göz at">
        <ul className="home-category-shortcuts__track">
          {categories.map((cat) => {
            const Icon = getRootCategoryIconComponent(cat.slug);
            return (
              <li key={cat.id} className="home-category-shortcuts__item-wrap">
                <Link href={`/kategori/${encodeURIComponent(cat.slug)}`} className="home-category-shortcuts__item">
                  <span className="home-category-shortcuts__icon" aria-hidden>
                    <Icon size={22} strokeWidth={1.65} color="#1e40af" />
                  </span>
                  <span className="home-category-shortcuts__label">{cat.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </ProductRailWithNav>
    </section>
  );
}
