"use client";

import Link from "next/link";
import { isValidCanonicalSlug } from "@ucuzabak/shared";
import { ChevronLeft, ChevronRight, ShoppingBag, X } from "lucide-react";
import type { CSSProperties, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { categoryHrefFromSlugs } from "../../lib/categoryPaths";
import { buildQuickPreviewImageUrls } from "../../lib/productCardImages";
import { pickPreviewSpecs } from "../../lib/previewSpecs";
import { useCompareStore } from "../../stores/compare-store";
import { useProductQuickPreviewStore } from "../../stores/product-quick-preview-store";

const PREVIEW_ZOOM_SCALE = 2.25;

function QuickPreviewZoomableImage({ src, alt }: { src: string; alt: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [zoomAllowed, setZoomAllowed] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setZoomAllowed(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const onMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setOrigin({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y))
    });
  }, []);

  const finePointer =
    typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const zoomActive = hover && zoomAllowed && finePointer;

  const imgStyle: CSSProperties | undefined = zoomActive
    ? {
        transform: `scale(${PREVIEW_ZOOM_SCALE})`,
        transformOrigin: `${origin.x}% ${origin.y}%`
      }
    : undefined;

  return (
    <div
      ref={wrapRef}
      className="product-quick-preview-zoom-wrap"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseMove={onMove}
    >
      <img
        src={src}
        alt={alt}
        className="product-quick-preview-gallery-img"
        loading="lazy"
        decoding="async"
        draggable={false}
        style={imgStyle}
      />
    </div>
  );
}

export function ProductQuickPreviewModal() {
  const product = useProductQuickPreviewStore((s) => s.product);
  const closePreview = useProductQuickPreviewStore((s) => s.closePreview);
  const compareProducts = useCompareStore((s) => s.compareProducts);
  const addProduct = useCompareStore((s) => s.addProduct);

  const [mounted, setMounted] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setImgIdx(0);
  }, [product?.id]);

  const imageUrls = useMemo(() => (product ? buildQuickPreviewImageUrls(product) : []), [product]);

  const open = Boolean(product);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closePreview]);

  const detailHref =
    product?.slug && isValidCanonicalSlug(product.slug) ? `/urun/${product.slug}` : null;

  const specs = useMemo(() => (product ? pickPreviewSpecs(product.specsJson ?? undefined) : []), [product]);

  const extraRows = useMemo(() => {
    if (!product) return [] as { key: string; value: string }[];
    const rows: { key: string; value: string }[] = [];
    if (product.modelNumber?.trim()) rows.push({ key: "Model numarası", value: product.modelNumber.trim() });
    if (product.ean?.trim()) rows.push({ key: "Barkod (EAN)", value: product.ean.trim() });
    return rows;
  }, [product]);

  const alreadyInCompare = product ? compareProducts.some((p) => p.id === product.id) : false;
  const canAddMore = product ? compareProducts.length < 4 || alreadyInCompare : false;

  const handleAddCompare = useCallback(() => {
    if (!product) return;
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
    });
  }, [product, addProduct]);

  if (!mounted || !open || !product) return null;

  const lowestPrice =
    product.lowestPriceCache != null ? `${product.lowestPriceCache} TL` : "Fiyat bilgisi yok";
  const currentImg = imageUrls[imgIdx] ?? null;
  const hasMany = imageUrls.length > 1;

  const dialog = (
    <div className="product-quick-preview-root" role="presentation">
      <button
        type="button"
        className="product-quick-preview-backdrop"
        aria-label="Önizlemeyi kapat"
        onClick={closePreview}
      />
      <div
        className="product-quick-preview-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-quick-preview-title"
      >
        <div className="product-quick-preview-head">
          <h2 id="product-quick-preview-title" className="product-quick-preview-title">
            {product.name}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="product-quick-preview-close"
            aria-label="Kapat"
            onClick={closePreview}
          >
            <X size={22} aria-hidden />
          </button>
        </div>

        <div className="product-quick-preview-body product-quick-preview-body--layout">
          <div className="product-quick-preview-main">
            <div className="product-quick-preview-gallery">
              {currentImg ? (
                <QuickPreviewZoomableImage key={currentImg} src={currentImg} alt="" />
              ) : (
                <div className="product-image-placeholder product-quick-preview-placeholder">Görsel yok</div>
              )}
              {hasMany ? (
                <>
                  <div className="product-quick-preview-gallery-nav">
                    <button
                      type="button"
                      className="product-quick-preview-nav-btn product-quick-preview-nav-btn--prev"
                      aria-label="Önceki görsel"
                      onClick={() => setImgIdx((i) => (i - 1 + imageUrls.length) % imageUrls.length)}
                    >
                      <ChevronLeft size={18} strokeWidth={2} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="product-quick-preview-nav-btn product-quick-preview-nav-btn--next"
                      aria-label="Sonraki görsel"
                      onClick={() => setImgIdx((i) => (i + 1) % imageUrls.length)}
                    >
                      <ChevronRight size={18} strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                  <p className="product-quick-preview-gallery-count" aria-live="polite">
                    {imgIdx + 1} / {imageUrls.length}
                  </p>
                </>
              ) : null}
            </div>
          </div>

          <div className="product-quick-preview-side">
            <div className="product-quick-preview-summary">
              <p className="product-quick-preview-price">{lowestPrice}</p>
              <p className="product-quick-preview-offers text-muted">
                <ShoppingBag size={15} aria-hidden />
                {product.offerCountCache ?? 0} teklif
              </p>
              {product.brand?.name ? (
                <p className="product-quick-preview-line">
                  <span className="product-quick-preview-k">Marka</span>
                  <span className="product-quick-preview-v">{product.brand.name}</span>
                </p>
              ) : null}
              {product.category ? (
                <p className="product-quick-preview-line">
                  <span className="product-quick-preview-k">Kategori</span>
                  <Link
                    href={categoryHrefFromSlugs(product.categoryPathSlugs, product.category.slug)}
                    className="product-quick-preview-category-link"
                    onClick={closePreview}
                  >
                    {product.category.name}
                  </Link>
                </p>
              ) : null}
            </div>

            {(specs.length > 0 || extraRows.length > 0) && (
              <dl className="product-quick-preview-specs">
                {extraRows.map((row) => (
                  <div key={row.key} className="product-quick-preview-spec-row">
                    <dt>{row.key}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
                {specs.map((row, i) => (
                  <div key={`spec-${i}-${row.key}`} className="product-quick-preview-spec-row">
                    <dt>{row.key}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="product-quick-preview-actions">
              {detailHref ? (
                <Link href={detailHref} className="btn-primary product-quick-preview-btn" onClick={closePreview}>
                  Ürün detayına git
                </Link>
              ) : null}
              {alreadyInCompare ? (
                <Link href="/karsilastir" className="btn-secondary product-quick-preview-btn" onClick={closePreview}>
                  Karşılaştırma sayfasına git
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn-secondary product-quick-preview-btn"
                  disabled={!canAddMore}
                  onClick={handleAddCompare}
                >
                  {canAddMore ? "Fiyatları karşılaştır" : "Liste dolu (en fazla 4 ürün)"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
