"use client";

import { useRouter, usePathname } from "next/navigation";
import { Dropdown, DropdownItem } from "../ui/dropdown";

const SORT_OPTIONS = [
  { value: "popular", label: "En Popüler Ürünler" },
  { value: "lowest_price", label: "En Düşük Fiyat" },
  { value: "highest_price", label: "En Yüksek Fiyat" },
  { value: "price_drop", label: "Fiyatı Düşenler" },
  { value: "newest", label: "En Yeni Ürünler" }
] as const;

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
  const currentLabel = SORT_OPTIONS.find((o) => o.value === defaultValue)?.label ?? SORT_OPTIONS[0].label;
  const triggerLabel = labelInTrigger ? `Sırala: ${currentLabel}` : currentLabel;

  const buildUrl = (sort: string) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && key !== "page") params.set(key, value);
    });
    params.set("sort", sort);
    return `${pathname}?${params.toString()}`;
  };

  const handleSelect = (value: string) => {
    router.push(buildUrl(value));
  };

  return (
    <Dropdown
      align="left"
      panelMatchTriggerWidth={labelInTrigger}
      useBackdrop={false}
      trigger={
        <span className={`sort-dropdown-trigger ${className ?? ""}`} style={style}>
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
      <div className={labelInTrigger ? "sort-dropdown-panel sort-dropdown-panel-match-trigger" : "sort-dropdown-panel"}>
        {SORT_OPTIONS.map(({ value, label }) => (
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
            {label}
          </DropdownItem>
        ))}
      </div>
    </Dropdown>
  );
}
