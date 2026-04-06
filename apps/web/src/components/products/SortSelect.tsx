"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Dropdown, DropdownItem } from "../ui/dropdown";
import { LISTING_SORT_OPTIONS } from "../../lib/listingFilterUrls";

type SortSelectProps = {
  defaultValue: string;
  searchParams: Record<string, string | undefined>;
  className?: string;
  style?: React.CSSProperties;
  /** true = tetikleyicide "Sırala: [seçenek]" tek blok, panel tetikleyici ile aynı genişlikte (arama sayfası) */
  labelInTrigger?: boolean;
};

export function SortSelect({ defaultValue, searchParams, className, style, labelInTrigger }: SortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const currentLabel =
    LISTING_SORT_OPTIONS.find((o) => o.value === defaultValue)?.label ?? LISTING_SORT_OPTIONS[0].label;
  const triggerLabel = labelInTrigger ? `Sırala: ${currentLabel}` : currentLabel;

  const buildUrl = (sort: string) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && key !== "page") params.set(key, value);
    });
    // Infinite scroll için her yeni sıralama ilk sayfadan başlar.
    params.delete("page");
    params.set("sort", sort);
    return `${pathname}?${params.toString()}`;
  };

  const handleSelect = (value: string) => {
    startTransition(() => {
      router.push(buildUrl(value), { scroll: false });
    });
  };

  return (
    <Dropdown
      align="left"
      panelMatchTriggerWidth
      useBackdrop={false}
      trigger={
        <span
          className={`sort-dropdown-trigger ${className ?? ""} ${isPending ? "sort-dropdown-trigger--pending" : ""}`.trim()}
          style={style}
          aria-busy={isPending}
        >
          <span className="sort-dropdown-label">{triggerLabel}</span>
          <svg
            className="sort-dropdown-chevron"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      }
    >
      <div className="sort-dropdown-panel sort-dropdown-panel-match-trigger">
        {LISTING_SORT_OPTIONS.map(({ value, label }) => (
          <DropdownItem
            key={value}
            onClick={() => handleSelect(value)}
            className={defaultValue === value ? "sort-dropdown-item-active" : ""}
          >
            {defaultValue === value && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
                style={{ flexShrink: 0 }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {defaultValue !== value && <span style={{ width: 16, flexShrink: 0 }} />}
            <span className="sort-dropdown-item-label">{label}</span>
          </DropdownItem>
        ))}
      </div>
    </Dropdown>
  );
}
