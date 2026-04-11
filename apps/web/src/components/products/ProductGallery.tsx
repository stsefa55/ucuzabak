"use client";

import { useState, useCallback, useEffect, useRef, type PointerEventHandler } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface ProductImageItem {
  id?: number;
  imageUrl: string;
  position?: number;
}

interface ProductGalleryProps {
  productName: string;
  mainImageUrl?: string | null;
  images?: ProductImageItem[];
}

function buildImageUrls(mainImageUrl: string | null | undefined, images: ProductImageItem[] | undefined): string[] {
  const fromImages = (images ?? []).map((i) => i.imageUrl).filter(Boolean);
  if (fromImages.length > 0) return fromImages;
  if (mainImageUrl) return [mainImageUrl];
  return [];
}

const ZOOM_FACTOR = 2.5;
const LENS_SIZE = 120;

export function ProductGallery({ productName, mainImageUrl, images }: ProductGalleryProps) {
  const urls = buildImageUrls(mainImageUrl, images);
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const blockLightboxOpenRef = useRef(false);
  const lightboxSwipeY0 = useRef<number | null>(null);
  const lightboxSwipeX0 = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      if (urls.length <= 1) return;
      setIndex((i) => (i + delta + urls.length) % urls.length);
    },
    [urls.length]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = mainRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setZoom({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
  }, []);

  const handleMouseLeave = useCallback(() => setZoom(null), []);

  const handleMainPointerDown: PointerEventHandler<HTMLDivElement> = (e) => {
    if (urls.length <= 1) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
    blockLightboxOpenRef.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const releaseMainCapture = (el: HTMLDivElement, pointerId: number) => {
    try {
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleMainPointerUp: PointerEventHandler<HTMLDivElement> = (e) => {
    releaseMainCapture(e.currentTarget, e.pointerId);
    if (urls.length <= 1 || swipeStartX.current == null || swipeStartY.current == null) {
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
    blockLightboxOpenRef.current = true;
    if (dx < 0) go(1);
    else go(-1);
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen, go]);

  const onLightboxTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    lightboxSwipeY0.current = e.touches[0].clientY;
    lightboxSwipeX0.current = e.touches[0].clientX;
  };

  const onLightboxTouchEnd = (e: React.TouchEvent) => {
    const y0 = lightboxSwipeY0.current;
    const x0 = lightboxSwipeX0.current;
    lightboxSwipeY0.current = null;
    lightboxSwipeX0.current = null;
    if (y0 == null || x0 == null || e.changedTouches.length < 1) return;
    const y = e.changedTouches[0].clientY;
    const x = e.changedTouches[0].clientX;
    const dY = y - y0;
    const dX = x - x0;
    if (urls.length > 1 && Math.abs(dX) > 50 && Math.abs(dX) > Math.abs(dY) * 1.2) {
      if (dX < 0) go(1);
      else go(-1);
      return;
    }
    if (dY > 70 && Math.abs(dY) > Math.abs(dX) * 1.2) {
      setLightboxOpen(false);
    }
  };

  if (urls.length === 0) {
    return (
      <div className="product-detail-image product-detail-gallery-wrapper" style={{ maxWidth: "100%" }}>
        <div className="product-image-placeholder">Görsel yok</div>
      </div>
    );
  }

  const currentUrl = urls[index];

  const zoomPreviewSize = mainRef.current
    ? Math.min(mainRef.current.getBoundingClientRect().width, mainRef.current.getBoundingClientRect().height, 380)
    : 380;

  return (
    <div className="pdp-gallery">
      <div
        ref={mainRef}
        className="pdp-gallery__main"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onPointerDown={handleMainPointerDown}
        onPointerUp={handleMainPointerUp}
        onPointerCancel={(e) => {
          releaseMainCapture(e.currentTarget, e.pointerId);
          swipeStartX.current = null;
          swipeStartY.current = null;
        }}
        onClick={() => {
          if (blockLightboxOpenRef.current) {
            blockLightboxOpenRef.current = false;
            return;
          }
          setLightboxOpen(true);
        }}
        role="button"
        tabIndex={0}
        aria-label="Görseli büyüt"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={currentUrl} alt={productName} draggable={false} />

        {zoom && (
          <div
            className="pdp-gallery__lens"
            style={{
              width: LENS_SIZE,
              height: LENS_SIZE,
              left: `calc(${zoom.x * 100}% - ${LENS_SIZE / 2}px)`,
              top: `calc(${zoom.y * 100}% - ${LENS_SIZE / 2}px)`
            }}
          />
        )}
      </div>

      {zoom && (
        <div
          className="pdp-gallery__zoom-preview"
          style={{
            width: zoomPreviewSize,
            height: zoomPreviewSize,
            backgroundImage: `url(${currentUrl})`,
            backgroundSize: `${ZOOM_FACTOR * 100}% auto`,
            backgroundPosition: `${zoom.x * 100}% ${zoom.y * 100}%`
          }}
        />
      )}

      {urls.length > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Önceki görsel" className="pdp-gallery__nav pdp-gallery__nav--prev">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Sonraki görsel" className="pdp-gallery__nav pdp-gallery__nav--next">
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {urls.length > 1 && (
        <div className="pdp-gallery__thumbs">
          {urls.map((url, i) => (
            <button
              key={`${i}-${url}`}
              type="button"
              aria-label={`Görsel ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`pdp-gallery__thumb ${i === index ? "pdp-gallery__thumb--active" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen
        ? createPortal(
            <div
              className="product-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label={`${productName} görselleri`}
              onClick={(e) => {
                if (e.target === e.currentTarget) setLightboxOpen(false);
              }}
              onTouchStart={onLightboxTouchStart}
              onTouchEnd={onLightboxTouchEnd}
            >
              <div className="product-lightbox__surface" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="product-lightbox__close"
                  aria-label="Kapat"
                  onClick={() => setLightboxOpen(false)}
                >
                  <X size={20} />
                </button>

                <div className="product-lightbox__layout">
                  <div className="product-lightbox__canvas-wrap">
                    <div className="product-lightbox__counter" aria-live="polite">
                      {index + 1}/{urls.length}
                    </div>
                    {urls.length > 1 ? (
                      <>
                        <button
                          type="button"
                          className="product-lightbox__nav product-lightbox__nav--prev"
                          aria-label="Önceki görsel"
                          onClick={() => go(-1)}
                        >
                          <ChevronLeft size={28} />
                        </button>
                        <button
                          type="button"
                          className="product-lightbox__nav product-lightbox__nav--next"
                          aria-label="Sonraki görsel"
                          onClick={() => go(1)}
                        >
                          <ChevronRight size={28} />
                        </button>
                      </>
                    ) : null}
                    <div className="product-lightbox__canvas">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={currentUrl} alt={productName} className="product-lightbox__image" draggable={false} />
                    </div>
                    {urls.length > 1 ? (
                      <p className="product-lightbox__swipe-hint">Yukarı/aşağı kaydırarak kapatabilir, yatayda görsel değiştirebilirsiniz.</p>
                    ) : (
                      <p className="product-lightbox__swipe-hint">Aşağı kaydırarak kapatabilirsiniz.</p>
                    )}
                  </div>

                  {urls.length > 1 ? (
                    <div className="product-lightbox__thumbs" aria-label="Diğer görseller">
                      {urls.map((url, i) => (
                        <button
                          key={`${i}-${url}`}
                          type="button"
                          className={`product-lightbox__thumb ${i === index ? "product-lightbox__thumb--active" : ""}`}
                          aria-label={`Görsel ${i + 1}`}
                          onClick={() => setIndex(i)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
