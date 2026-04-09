"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
        onClick={() => setLightboxOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="Gorseli buyut"
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
              top: `calc(${zoom.y * 100}% - ${LENS_SIZE / 2}px)`,
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
            backgroundPosition: `${zoom.x * 100}% ${zoom.y * 100}%`,
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
              aria-label={`${productName} gorselleri`}
              onClick={(e) => {
                if (e.target === e.currentTarget) setLightboxOpen(false);
              }}
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
                          aria-label="Onceki gorsel"
                          onClick={() => go(-1)}
                        >
                          <ChevronLeft size={28} />
                        </button>
                        <button
                          type="button"
                          className="product-lightbox__nav product-lightbox__nav--next"
                          aria-label="Sonraki gorsel"
                          onClick={() => go(1)}
                        >
                          <ChevronRight size={28} />
                        </button>
                      </>
                    ) : null}
                    <div className="product-lightbox__canvas">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={currentUrl} alt={productName} className="product-lightbox__image" />
                    </div>
                  </div>

                  {urls.length > 1 ? (
                    <div className="product-lightbox__thumbs" aria-label="Diger gorseller">
                      {urls.map((url, i) => (
                        <button
                          key={`${i}-${url}`}
                          type="button"
                          className={`product-lightbox__thumb ${i === index ? "product-lightbox__thumb--active" : ""}`}
                          aria-label={`Gorsel ${i + 1}`}
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
