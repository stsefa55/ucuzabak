"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

interface ProductRailWithNavProps {
  children: React.ReactNode;
  ariaLabel?: string;
}

const BAR_HEIGHT = 8;

export function ProductRailWithNav({ children, ariaLabel = "Ürün listesi" }: ProductRailWithNavProps) {
  const scrollRegionId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(100);
  const [scrollProgress, setScrollProgress] = useState(0);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);

  const updateUI = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    if (scrollWidth > clientWidth) {
      const ratio = clientWidth / scrollWidth;
      setTrackWidth(ratio * 100);
      const max = scrollWidth - clientWidth;
      setScrollProgress(max > 0 ? scrollLeft / max : 0);
    } else {
      setTrackWidth(100);
      setScrollProgress(0);
    }
  }, []);

  useEffect(() => {
    updateUI();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateUI);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, updateUI]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return; // sadece sol tık
      // Görsel üzerinde mousedown'da tarayıcı resim sürüklemeyi başlatmasın; böylece ray kaydırma çalışsın
      const t = e.target as HTMLElement;
      if (t.tagName === "IMG" || t.closest?.(".product-card-image")) e.preventDefault();
      const el = scrollRef.current;
      if (!el) return;
      hasDraggedRef.current = false;
      isDraggingRef.current = true;
      startXRef.current = e.clientX;
      scrollLeftStartRef.current = el.scrollLeft;
      el.style.scrollBehavior = "auto";
      document.body.style.userSelect = "none";

      let ended = false;
      const endDrag = () => {
        if (ended) return;
        ended = true;
        isDraggingRef.current = false;
        const el2 = scrollRef.current;
        if (el2) el2.style.scrollBehavior = "smooth";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", onMove, true);
        document.removeEventListener("mouseup", onUp, true);
        window.removeEventListener("mouseup", onUp, true);
        window.removeEventListener("blur", onUp);
      };

      const onMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return;
        if (moveEvent.buttons === 0) {
          endDrag();
          return;
        }
        const el2 = scrollRef.current;
        if (!el2) return;
        moveEvent.preventDefault();
        const dx = startXRef.current - moveEvent.clientX;
        const newScrollLeft = scrollLeftStartRef.current + dx;
        el2.scrollLeft = Math.max(0, Math.min(newScrollLeft, el2.scrollWidth - el2.clientWidth));
        hasDraggedRef.current = true;
        startXRef.current = moveEvent.clientX;
        scrollLeftStartRef.current = el2.scrollLeft;
        updateUI();
      };
      const onUp = () => {
        endDrag();
      };
      document.addEventListener("mousemove", onMove, { passive: false, capture: true });
      document.addEventListener("mouseup", onUp, true);
      window.addEventListener("mouseup", onUp, true);
      window.addEventListener("blur", onUp);
    },
    [updateUI]
  );

  const handleRailClick = useCallback((e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDraggedRef.current = false;
    }
  }, []);

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = scrollRef.current;
      const trackEl = trackRef.current;
      if (!el || !trackEl) return;
      const { scrollWidth, clientWidth } = el;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll <= 0) return;
      const trackRect = trackEl.getBoundingClientRect();
      const clickX = e.clientX - trackRect.left;
      const ratio = Math.max(0, Math.min(1, clickX / trackRect.width));
      const prevBehavior = el.style.scrollBehavior;
      el.style.scrollBehavior = "auto";
      el.scrollLeft = ratio * maxScroll;
      updateUI();
      el.style.scrollBehavior = prevBehavior || "smooth";
    },
    [updateUI]
  );

  const trackOffset = (100 - trackWidth) * scrollProgress;
  const sliderValue = Math.round(scrollProgress * 100);

  return (
    <div style={{ position: "relative" }}>
      <div
        id={scrollRegionId}
        ref={scrollRef}
        onScroll={updateUI}
        onMouseDownCapture={handleMouseDown}
        onClickCapture={handleRailClick}
        role="region"
        aria-label={ariaLabel}
        style={{
          display: "flex",
          gap: "1rem",
          overflowX: "auto",
          scrollBehavior: "smooth",
          paddingBottom: "0.5rem",
          marginBottom: 8,
          scrollPadding: "0 1rem"
        }}
        className="product-rail product-rail-with-nav product-rail-scrollbar-hidden"
      >
        {children}
      </div>
      <div
        ref={trackRef}
        role="slider"
        aria-label="Yatay kaydırma"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={sliderValue}
        aria-controls={scrollRegionId}
        tabIndex={0}
        onClick={handleBarClick}
        style={{
          marginTop: 6,
          height: BAR_HEIGHT,
          borderRadius: BAR_HEIGHT / 2,
          background: "#e5e7eb",
          overflow: "hidden",
          position: "relative"
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${trackOffset}%`,
            width: `${trackWidth}%`,
            height: "100%",
            borderRadius: BAR_HEIGHT / 2,
            background: "#2563eb",
            pointerEvents: "none"
          }}
        />
      </div>
    </div>
  );
}
