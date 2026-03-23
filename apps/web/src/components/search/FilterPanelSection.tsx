"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

type FilterPanelSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  /** Ek sınıf (örn. kategori gövdesi) */
  bodyClassName?: string;
};

/**
 * Pazaryeri tarzı daraltılabilir filtre grubu (chevron).
 */
export function FilterPanelSection({
  title,
  defaultOpen = true,
  children,
  bodyClassName = ""
}: FilterPanelSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const headId = useId();
  const panelId = useId();

  return (
    <div className="filter-panel__group">
      <button
        type="button"
        id={headId}
        className="filter-panel__group-head"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="filter-panel__group-title">{title}</span>
        <ChevronDown
          className={`filter-panel__group-chevron ${open ? "filter-panel__group-chevron--open" : ""}`}
          size={18}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headId}
        className={`filter-panel__group-body ${bodyClassName}`.trim()}
        hidden={!open}
      >
        {children}
      </div>
    </div>
  );
}
