"use client";

import Link from "next/link";
import { FolderOpen, PackageSearch, SlidersHorizontal } from "lucide-react";

type Props = {
  categoryName: string;
  hasFilters: boolean;
  /** Marka / fiyat sıfır; isteğe bağlı sort korunur */
  clearFiltersHref: string;
  parentHref?: string;
  parentName?: string;
};

export function CategoryListingEmpty({
  categoryName,
  hasFilters,
  clearFiltersHref,
  parentHref,
  parentName
}: Props) {
  return (
    <div className="category-listing-empty-wrap" role="status" aria-live="polite">
      <div className="category-listing-empty">
        <div className="category-listing-empty__icon" aria-hidden>
          {hasFilters ? (
            <SlidersHorizontal size={42} strokeWidth={1.35} />
          ) : (
            <PackageSearch size={42} strokeWidth={1.35} />
          )}
        </div>
        <h2 className="category-listing-empty__title">
          {hasFilters ? "Filtrelere uygun ürün bulunamadı" : "Bu kategoride ürün yok"}
        </h2>
        <p className="category-listing-empty__category">{categoryName}</p>
        <p className="category-listing-empty__lead">
          {hasFilters
            ? "Marka veya fiyat aralığı sonuçları eleyebilir. Filtreleri kaldırarak bu kategorideki tüm ürünlere yeniden bakın."
            : "Şu an bu kategoride gösterilecek ürün bulunmuyor. Üst kategoriye çıkabilir veya ana sayfadan devam edebilirsiniz."}
        </p>
        <div className="category-listing-empty__actions">
          {hasFilters ? (
            <Link href={clearFiltersHref} className="btn-primary category-listing-empty__btn">
              Filtreleri temizle
            </Link>
          ) : null}
          {parentHref ? (
            <Link
              href={parentHref}
              className={
                hasFilters ? "btn-secondary category-listing-empty__btn" : "btn-primary category-listing-empty__btn"
              }
            >
              <FolderOpen size={16} strokeWidth={2} aria-hidden />
              <span>{parentName ? parentName : "Üst kategori"}</span>
            </Link>
          ) : null}
          <Link
            href="/"
            className={
              hasFilters || parentHref
                ? "btn-secondary category-listing-empty__btn"
                : "btn-primary category-listing-empty__btn"
            }
          >
            Ana sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
