"use client";

import { useState, useCallback, useEffect } from "react";
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

/** Build ordered list of image URLs: productImages first, then mainImageUrl if not already in list */
function buildImageUrls(mainImageUrl: string | null | undefined, images: ProductImageItem[] | undefined): string[] {
  const fromImages = (images ?? []).map((i) => i.imageUrl).filter(Boolean);
  if (fromImages.length > 0) return fromImages;
  if (mainImageUrl) return [mainImageUrl];
  return [];
}

export function ProductGallery({ productName, mainImageUrl, images }: ProductGalleryProps) {
  const urls = buildImageUrls(mainImageUrl, images);
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const go = useCallback(
    (delta: number) => {
      if (urls.length <= 1) return;
      setIndex((i) => (i + delta + urls.length) % urls.length);
    },
    [urls.length]
  );

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

  return (
    <div
      className="product-detail-gallery-wrapper"
      style={{
        position: "relative",
        maxWidth: "100%"
      }}
    >
      <button
        type="button"
        className="product-detail-image product-detail-image--button"
        style={{ maxWidth: "100%", position: "relative" }}
        onClick={() => setLightboxOpen(true)}
        aria-label="Gorseli buyut"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={currentUrl} alt={productName} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      </button>

      {urls.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Önceki görsel"
            className="btn-ghost"
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.9)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Sonraki görsel"
            className="btn-ghost"
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.9)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2
            }}
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {((images?.length ?? 0) >= 1 || urls.length > 1) && (
        <div
          className="product-detail-gallery-thumbnails"
          style={{
            display: "flex",
            gap: 6,
            marginTop: 8,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: "100%",
            overflowX: "auto"
          }}
        >
          {urls.map((url, i) => (
            <button
              key={`${i}-${url}`}
              type="button"
              aria-label={`Görsel ${i + 1}`}
              onClick={() => setIndex(i)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 6,
                overflow: "hidden",
                border: index === i ? "2px solid #2563eb" : "1px solid #e5e7eb",
                padding: 0,
                background: "#f9fafb",
                cursor: "pointer",
                flexShrink: 0
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen ? (
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
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    type="button"
                    className="product-lightbox__nav product-lightbox__nav--next"
                    aria-label="Sonraki gorsel"
                    onClick={() => go(1)}
                  >
                    <ChevronRight size={24} />
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
        </div>
      ) : null}
    </div>
  );
}
