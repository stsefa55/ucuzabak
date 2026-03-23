"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type FilterCheckboxRowLinkProps = {
  mode: "link";
  href: string;
  checked: boolean;
  label: string;
  /** Sağdaki ikincil metin (örn. sayı) */
  meta?: ReactNode;
  /** Sol ek (kök kategori ikonu vb.) */
  leading?: ReactNode;
  className?: string;
};

type FilterCheckboxRowStaticProps = {
  mode: "static";
  checked?: boolean;
  label: string;
  meta?: ReactNode;
  /** Yakında vb. */
  muted?: boolean;
  className?: string;
};

export type FilterCheckboxRowProps = FilterCheckboxRowLinkProps | FilterCheckboxRowStaticProps;

/**
 * Checkbox görünümlü satır: link (filtre seçimi) veya statik (yakında).
 */
export function FilterCheckboxRow(props: FilterCheckboxRowProps) {
  const checkedVal =
    props.mode === "link" ? props.checked : Boolean(props.mode === "static" && props.checked);
  const box = (
    <span
      className="filter-check__box"
      {...(checkedVal ? { "data-checked": "true" as const } : {})}
      aria-hidden
    />
  );

  if (props.mode === "link") {
    const { href, checked, label, meta, leading, className = "" } = props;
    return (
      <Link
        href={href}
        className={`filter-check__row ${checked ? "filter-check__row--checked" : ""} ${className}`.trim()}
        aria-current={checked ? "page" : undefined}
      >
        {box}
        {leading ? <span className="filter-check__leading">{leading}</span> : null}
        <span className="filter-check__label">{label}</span>
        {meta != null ? <span className="filter-check__meta">{meta}</span> : null}
      </Link>
    );
  }

  const { label, meta, muted = true, className = "" } = props;
  return (
    <span
      className={`filter-check__row filter-check__row--static ${muted ? "filter-check__row--muted" : ""} ${className}`.trim()}
      aria-disabled="true"
    >
      {box}
      <span className="filter-check__label">{label}</span>
      {meta != null ? <span className="filter-check__meta">{meta}</span> : null}
    </span>
  );
}
