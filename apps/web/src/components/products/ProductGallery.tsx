"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  const go = useCallback(
    (delta: number) => {
      if (urls.length <= 1) return;
      setIndex((i) => (i + delta + urls.length) % urls.length);
    },
    [urls.length]
  );

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
      <div className="product-detail-image" style={{ maxWidth: "100%", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={currentUrl} alt={productName} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      </div>

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
    </div>
  );
}
