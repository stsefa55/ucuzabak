 "use client";

import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { useMenuBackdrop } from "../layout/MenuBackdrop";

interface DropdownProps {
  trigger: ReactNode;
  align?: "left" | "right";
  /** Açılan panelin tetikleyici ile aynı genişlikte olması */
  panelMatchTriggerWidth?: boolean;
  /** Arka plan karartma/blur (varsayılan true; sıralama gibi küçük menülerde false) */
  useBackdrop?: boolean;
}

export function Dropdown({ trigger, align = "right", panelMatchTriggerWidth, useBackdrop = true, children }: PropsWithChildren<DropdownProps>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const { register } = useMenuBackdrop();

  useEffect(() => {
    if (open && useBackdrop) return register();
  }, [open, useBackdrop, register]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      const target = e.target as Node;
      if (!ref.current.contains(target)) {
        setOpen(false);
        return;
      }
      const el = target as Element;
      if (el.closest?.(".dropdown-panel") && el.closest?.("button")) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      window.addEventListener("click", onClick);
      window.addEventListener("keydown", onKey);
    }
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn("btn-ghost")}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </button>
      {open && (
        <div
          className="dropdown-panel"
          style={{
            position: "absolute",
            top: "100%",
            left: panelMatchTriggerWidth ? 0 : align === "right" ? undefined : 0,
            right: panelMatchTriggerWidth ? 0 : align === "right" ? 0 : undefined,
            marginTop: 6,
            zIndex: 60
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export function DropdownItem({ className, children, ...rest }: DropdownItemProps) {
  return (
    <button
      type="button"
      className={cn("dropdown-item", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

