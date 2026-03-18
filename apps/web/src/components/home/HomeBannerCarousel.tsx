"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { API_BASE_URL } from "../../lib/api-client";


interface Banner {
  id: number;
  imageUrl: string;
  linkUrl: string | null;
  title: string | null;
  position: number;
}

export function HomeBannerCarousel() {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ["banners"],
    queryFn: () => fetch(`${API_BASE_URL}/banners`, { credentials: "include" }).then((r) => r.json())
  });

  const count = banners.length;
  const go = useCallback(
    (delta: number) => {
      if (count <= 1) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => go(1), 5000);
    return () => clearInterval(t);
  }, [count, go]);

  if (banners.length === 0) return null;

  const current = banners[index];

  return (
    <section
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        marginTop: "0.75rem",
        marginBottom: "1.75rem",
        borderRadius: "0.75rem",
        overflow: "hidden",
        position: "relative",
        background: "#f3f4f6"
      }}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "32/10", minHeight: 140, maxHeight: 220 }}>
        {current && (
          <>
            {current.linkUrl ? (
              <Link
                href={current.linkUrl}
                target={current.linkUrl.startsWith("http") ? "_blank" : undefined}
                rel={current.linkUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                style={{ display: "block", width: "100%", height: "100%" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.imageUrl}
                  alt={current.title ?? "Kampanya"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block"
                  }}
                />
              </Link>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={current.imageUrl}
                alt={current.title ?? "Kampanya"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block"
                }}
              />
            )}
          </>
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="btn-ghost"
              aria-label="Önceki banner"
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.9)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: hovered ? 1 : 0,
                pointerEvents: hovered ? "auto" : "none",
                transition: "opacity 0.2s ease"
              }}
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="btn-ghost"
              aria-label="Sonraki banner"
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.9)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: hovered ? 1 : 0,
                pointerEvents: hovered ? "auto" : "none",
                transition: "opacity 0.2s ease"
              }}
            >
              <ChevronRight size={22} />
            </button>
            <div
              style={{
                position: "absolute",
                bottom: 10,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: 6
              }}
            >
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Banner ${i + 1}`}
                  onClick={() => setIndex(i)}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    border: "none",
                    padding: 0,
                    background: i === index ? "#2563eb" : "rgba(255,255,255,0.6)",
                    cursor: "pointer"
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
