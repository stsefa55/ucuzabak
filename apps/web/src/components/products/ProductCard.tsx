"use client";

import Link from "next/link";
import { isValidCanonicalSlug } from "@ucuzabak/shared";
import { ShoppingBag, ChevronLeft, ChevronRight, TrendingDown } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEventHandler,
  type SyntheticEvent
} from "react";
import { categoryHrefFromSlugs } from "../../lib/categoryPaths";
import { buildCardImageUrls } from "../../lib/productCardImages";
import { formatTL } from "../../lib/utils";
import { Card } from "../ui/card";
import { ProductFavoriteSection } from "./ProductFavoriteSection";
import { touchRecentlyViewed } from "../../stores/recent-viewed-store";

/** Ürün kartı / liste API modeli */
export interface ProductCardProduct {
  id: number;
  name: string;
  slug: string;
  mainImageUrl?: string | null;
  imageUrls?: string[];
  productImages?: Array<{ imageUrl: string; position?: number }>;
  lowestPriceCache?: string | null;
  offerCountCache?: number;
  /** API: canlı ACTIVE teklif sayısı (offerCountCache stale ise buna güven) */
  cardActiveOfferCount?: number;
  brand?: { name: string | null } | null;
  category?: { name: string | null; slug: string } | null;
  /** API: kökten yaprağa slug zinciri (hiyerarşik /kategori/... URL için) */
  categoryPathSlugs?: string[];
  categoryPathNames?: string[];
  ean?: string | null;
  modelNumber?: string | null;
  specsJson?: Record<string, unknown> | null;
  /** API: canlı en ucuz teklif fiyatı (lowestPriceCache boş/stale ise) */
  cardListingCurrentPrice?: string | null;
  /** API: en uygun teklifte liste fiyatı (üstü çizili) */
  cardOriginalPrice?: string | null;
  cardDiscountPercent?: number | null;
  cardInStock?: boolean | null;
  cardStoreName?: string | null;
}

function formatTryLabel(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "Fiyat bilgisi yok";
  return formatTL(value);
}

interface ProductCardProps {
  product: ProductCardProduct;
  /** true: galeri ok/swipe son gezilen sırasını güncellemez (ör. Son gezilen rail içinde kararlılık için) */
  suppressRecentViewedOnImageBrowse?: boolean;
  /** true: yatay ürün rayında; görsel üzeri kaydırma rayı kaydırsın, kart galeri swipe kapalı */
  inHorizontalRail?: boolean;
}

function ProductCardImpl({
  product,
  suppressRecentViewedOnImageBrowse = false,
  inHorizontalRail = false
}: ProductCardProps) {
  const detailHref =
    product.slug && isValidCanonicalSlug(product.slug) ? `/urun/${product.slug}` : null;
  const currentPriceLabel = formatTryLabel(
    product.cardListingCurrentPrice ?? product.lowestPriceCache
  );
  const originalPriceLabel =
    product.cardOriginalPrice != null && String(product.cardOriginalPrice).trim()
      ? formatTryLabel(product.cardOriginalPrice)
      : null;
  const showDiscountBadge =
    product.cardDiscountPercent != null &&
    product.cardDiscountPercent > 0 &&
    product.cardOriginalPrice != null &&
    String(product.cardOriginalPrice).trim() !== "";
  const imageUrls = useMemo(
    () => buildCardImageUrls(product),
    [product.productImages, product.imageUrls, product.mainImageUrl]
  );
  const imageUrlsIdentity = useMemo(() => imageUrls.join("\0"), [imageUrls]);
  const [imageIndex, setImageIndex] = useState(0);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const blockDetailNavRef = useRef(false);

  useEffect(() => {
    setImageIndex(0);
  }, [product.id, product.slug, imageUrlsIdentity]);

  const currentImageUrl = imageUrls[imageIndex] ?? null;
  const hasMultipleImages = imageUrls.length > 1;

  /**
   * Son gezilen: yalnızca ok veya swipe ile indeks değişince (nokta tıklaması hariç).
   * suppressRecentViewedOnImageBrowse ile (ör. Son gezilen rail) bu güncelleme kapatılabilir.
   */
  const goImage = useCallback(
    (delta: number, mode: "nav" | "swipe") => {
      if (!hasMultipleImages) return;
      setImageIndex((prev) => {
        const next = (prev + delta + imageUrls.length) % imageUrls.length;
        if (
          !suppressRecentViewedOnImageBrowse &&
          next !== prev &&
          (mode === "nav" || mode === "swipe")
        ) {
          queueMicrotask(() => {
            if (product.slug && isValidCanonicalSlug(product.slug)) {
              touchRecentlyViewed(product.slug);
            }
          });
        }
        return next;
      });
    },
    [hasMultipleImages, imageUrls.length, product.slug, suppressRecentViewedOnImageBrowse]
  );

  /** Dokunma + fare: pointer capture ile dışarı bırakınca da up alınır */
  const handleImagePointerDown: PointerEventHandler<HTMLDivElement> = (e) => {
    if (!hasMultipleImages) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
    blockDetailNavRef.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const releaseSwipeCapture = (el: HTMLDivElement, pointerId: number) => {
    try {
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleImagePointerUp: PointerEventHandler<HTMLDivElement> = (e) => {
    releaseSwipeCapture(e.currentTarget, e.pointerId);
    if (!hasMultipleImages || swipeStartX.current == null || swipeStartY.current == null) {
      swipeStartX.current = null;
      swipeStartY.current = null;
      return;
    }
    const dx = e.clientX - swipeStartX.current;
    const dy = e.clientY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    const minSwipe = 40;
    if (Math.abs(dx) < minSwipe || Math.abs(dx) <= Math.abs(dy) * 1.05) return;
    blockDetailNavRef.current = true;
    if (dx < 0) goImage(1, "swipe");
    else goImage(-1, "swipe");
  };

  const stopCardNav = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const stopRailDrag = (e: SyntheticEvent) => {
    e.stopPropagation();
  };

  const gallerySwipeEnabled = hasMultipleImages && !inHorizontalRail;
  const imageAreaClassName = `product-card-image${inHorizontalRail ? " product-card-image--in-rail" : ""}`;

  return (
    <Card className="product-card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="product-card__content">
        <div className={hasMultipleImages ? "product-card-image-wrap product-card-image-wrap--gallery" : "product-card-image-wrap"}>
          {detailHref ? (
            <div className="product-card__fav-wrap">
              <ProductFavoriteSection productId={product.id} productSlug={product.slug} compact />
            </div>
          ) : null}
          {detailHref ? (
            <Link
              href={detailHref}
              className="product-card-image-link"
              onClick={(e) => {
                if (blockDetailNavRef.current) {
                  e.preventDefault();
                  blockDetailNavRef.current = false;
                }
              }}
            >
              <div
                className={imageAreaClassName}
                onPointerDown={gallerySwipeEnabled ? handleImagePointerDown : undefined}
                onPointerUp={gallerySwipeEnabled ? handleImagePointerUp : undefined}
                onPointerCancel={
                  gallerySwipeEnabled
                    ? (e) => {
                        releaseSwipeCapture(e.currentTarget, e.pointerId);
                        swipeStartX.current = null;
                        swipeStartY.current = null;
                      }
                    : undefined
                }
              >
                {currentImageUrl ? (
                  <img
                    src={currentImageUrl}
                    alt={product.name}
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="product-image-placeholder">Görsel yok</div>
                )}
              </div>
            </Link>
          ) : (
            <div
              className={imageAreaClassName}
              aria-disabled="true"
              style={{ cursor: "not-allowed", opacity: 0.85 }}
              onPointerDown={gallerySwipeEnabled ? handleImagePointerDown : undefined}
              onPointerUp={gallerySwipeEnabled ? handleImagePointerUp : undefined}
              onPointerCancel={
                gallerySwipeEnabled
                  ? (e) => {
                      releaseSwipeCapture(e.currentTarget, e.pointerId);
                      swipeStartX.current = null;
                      swipeStartY.current = null;
                    }
                  : undefined
              }
            >
              {currentImageUrl ? (
                <img
                  src={currentImageUrl}
                  alt={product.name}
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="product-image-placeholder">Görsel yok</div>
              )}
            </div>
          )}
          {hasMultipleImages ? (
            <div className="product-card-image-nav">
              <button
                type="button"
                className="product-card-image-nav-btn product-card-image-nav-btn--prev"
                aria-label="Önceki görsel"
                onPointerDown={stopRailDrag}
                onMouseDown={stopRailDrag}
                onClick={(e) => {
                  stopCardNav(e);
                  blockDetailNavRef.current = false;
                  goImage(-1, "nav");
                }}
              >
                <ChevronLeft size={18} strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                className="product-card-image-nav-btn product-card-image-nav-btn--next"
                aria-label="Sonraki görsel"
                onPointerDown={stopRailDrag}
                onMouseDown={stopRailDrag}
                onClick={(e) => {
                  stopCardNav(e);
                  blockDetailNavRef.current = false;
                  goImage(1, "nav");
                }}
              >
                <ChevronRight size={18} strokeWidth={2} aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
        <div className="product-card-image-dots" role="group" aria-label="Ürün görselleri">
          {hasMultipleImages
            ? imageUrls.map((_, i) => (
                <button
                  key={`${product.id}-dot-${i}`}
                  type="button"
                  className={`product-card-image-dot ${i === imageIndex ? "product-card-image-dot--active" : ""}`}
                  aria-label={`Görsel ${i + 1} / ${imageUrls.length}`}
                  aria-current={i === imageIndex ? "true" : undefined}
                  onPointerDown={stopRailDrag}
                  onMouseDown={stopRailDrag}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    blockDetailNavRef.current = false;
                    setImageIndex(i);
                  }}
                />
              ))
            : null}
        </div>
        {product.brand?.name?.trim() ? (
          <span className="product-card__brand-prefix">{product.brand.name.trim()}</span>
        ) : null}
        {detailHref ? (
          <Link href={detailHref}>
            <h3 className="product-card__title">{product.name}</h3>
          </Link>
        ) : (
          <h3 className="product-card__title">{product.name}</h3>
        )}
        {product.category ? (
          <div className="product-card__meta">
            <Link
              href={categoryHrefFromSlugs(product.categoryPathSlugs, product.category.slug)}
              className="product-card__category-pill"
            >
              {product.category.name}
            </Link>
          </div>
        ) : null}
      </div>
      <div className="product-card__footer">
        <div className="product-card__prices">
          <div className="product-card__price-row">
            <span className="product-card__price-current">{currentPriceLabel}</span>
            {originalPriceLabel ? (
              <span className="product-card__price-original">{originalPriceLabel}</span>
            ) : null}
            {showDiscountBadge ? (
              <span className="product-card__discount-badge">
                <TrendingDown size={11} strokeWidth={2.5} aria-hidden />
                %{product.cardDiscountPercent} indirim
              </span>
            ) : null}
          </div>
          {product.cardInStock === false ? (
            <span className="product-card__stock-hint product-card__stock-hint--out">Stokta yok (en ucuz teklif)</span>
          ) : product.cardInStock === true ? (
            <span className="product-card__stock-hint product-card__stock-hint--ok">Stokta</span>
          ) : null}
          {product.cardStoreName ? (
            <div className="product-card__store-hint" title={product.cardStoreName}>
              {product.cardStoreName}
            </div>
          ) : null}
          <span className="product-card__offers text-muted">
            <ShoppingBag size={14} />
            {product.cardActiveOfferCount ?? product.offerCountCache ?? 0} teklif
          </span>
        </div>
      </div>
    </Card>
  );
}

export const ProductCard = memo(ProductCardImpl);

