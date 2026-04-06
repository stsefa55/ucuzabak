"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api-client";
import { buildFilterUrl } from "../../lib/listingFilterUrls";
import type { CategoryNavigationContext } from "../search/category-navigation.types";

type CategoryChildApi = {
  id: number;
  name: string;
  slug: string;
  hasChildren?: boolean;
};

type NavSibling = CategoryNavigationContext["siblings"][number];

type Props = {
  categoryNavigation: CategoryNavigationContext;
  basePath: string;
  baseParams: Record<string, string | undefined>;
  facetFilterQuery: string;
};

function filterByName<T extends { name: string }>(items: T[], q: string): T[] {
  const t = q.trim().toLowerCase();
  if (!t) return items;
  return items.filter((x) => x.name.toLowerCase().includes(t));
}

function isStrictDescendantPath(ancestorPath: string[], currentPath: string[]): boolean {
  if (currentPath.length <= ancestorPath.length) return false;
  return ancestorPath.every((s, i) => s === currentPath[i]);
}

function SiblingRow({
  item,
  href,
  isCurrent,
  currentSlug,
  currentPathSlugs,
  basePath,
  baseParams,
  depthPx,
  facetFilterQuery
}: {
  item: NavSibling;
  href: string;
  isCurrent: boolean;
  currentSlug: string;
  currentPathSlugs: string[];
  basePath: string;
  baseParams: Record<string, string | undefined>;
  depthPx: number;
  facetFilterQuery: string;
}) {
  const hasSub = Boolean(item.hasChildren);
  const isUnderThisBranch = useMemo(
    () => hasSub && isStrictDescendantPath(item.pathSlugs, currentPathSlugs),
    [hasSub, item.pathSlugs, currentPathSlugs]
  );

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isUnderThisBranch) setOpen(true);
  }, [isUnderThisBranch]);

  const q = useQuery({
    queryKey: ["category-accordion-nested", item.slug],
    queryFn: () =>
      apiFetch<CategoryChildApi[]>(`/categories/${encodeURIComponent(item.slug)}/children`),
    enabled: hasSub && (open || isUnderThisBranch),
    staleTime: 120_000
  });
  const nested = useMemo(() => filterByName(q.data ?? [], facetFilterQuery), [q.data, facetFilterQuery]);

  return (
    <li className="category-accordion__li">
      <div
        className={`category-accordion__row category-accordion__row--leaf ${isCurrent ? "category-accordion__row--current" : ""}`}
        style={{ paddingLeft: depthPx }}
      >
        <Link href={href} className="category-accordion__link">
          <span className="category-accordion__label">{item.name}</span>
        </Link>
        {hasSub ? (
          <button
            type="button"
            className="category-accordion__toggle category-accordion__toggle--iconless"
            aria-expanded={open}
            aria-label={open ? `${item.name} alt kategorilerini gizle` : `${item.name} alt kategorilerini göster`}
            onClick={(e) => {
              e.preventDefault();
              setOpen((v) => !v);
            }}
          />
        ) : null}
      </div>
      {open && hasSub ? (
        <ul className="category-accordion__nested" role="list">
          {q.isLoading ? (
            <li className="category-accordion__nested-hint" style={{ paddingLeft: depthPx + 12 }}>
              Yükleniyor…
            </li>
          ) : nested.length === 0 ? (
            <li className="category-accordion__nested-hint" style={{ paddingLeft: depthPx + 12 }}>
              Alt kategori yok
            </li>
          ) : (
            nested.map((ch) => {
              const chHref = buildFilterUrl(basePath, baseParams, {
                categoryPathSlugs: [...item.pathSlugs, ch.slug]
              });
              const childCurrent = currentSlug === ch.slug;
              return (
                <li key={ch.id} className="category-accordion__li">
                  <Link
                    href={chHref}
                    className={`category-accordion__row category-accordion__row--sublink${childCurrent ? " category-accordion__row--current" : ""}`}
                    style={{ paddingLeft: depthPx + 12 }}
                    aria-current={childCurrent ? "page" : undefined}
                  >
                    <span className="category-accordion__label">{ch.name}</span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Sadece seçilen yol (breadcrumb) + mevcut düzeydeki alt / yan liste.
 * Ara seviyelerde girmediğiniz kardeş kategoriler gösterilmez (Hepsiburada tarzı dar dal).
 */
export function CategoryAccordionNav({
  categoryNavigation,
  basePath,
  baseParams,
  facetFilterQuery
}: Props) {
  const { siblings: siblingsRaw, current } = categoryNavigation;
  const cur = current ?? { slug: "", name: "", pathSlugs: [] as string[], pathNames: [] as string[] };

  const pathSlugs = useMemo(() => {
    if (Array.isArray(cur.pathSlugs) && cur.pathSlugs.length > 0) return cur.pathSlugs;
    if (cur.slug) return [cur.slug];
    return [];
  }, [cur.pathSlugs, cur.slug]);

  const pathNames = useMemo(() => {
    const names = Array.isArray(cur.pathNames) ? cur.pathNames : [];
    return pathSlugs.map((slug, i) => (typeof names[i] === "string" ? names[i] : slug));
  }, [cur.pathNames, pathSlugs]);

  const filteredSiblings = useMemo(
    () => filterByName(Array.isArray(siblingsRaw) ? siblingsRaw : [], facetFilterQuery),
    [siblingsRaw, facetFilterQuery]
  );

  const indentBase = 2;
  const step = 12;
  const listDepth = indentBase + pathSlugs.length * step;

  if (pathSlugs.length === 0) {
    return (
      <nav className="category-accordion" aria-label="Kategori">
        <ul className="category-accordion__list category-accordion__list--branch" role="list">
          {filteredSiblings.map((item) => {
            const href = buildFilterUrl(basePath, baseParams, { categoryPathSlugs: item.pathSlugs });
            const isCurrent = cur.slug === item.slug;
            return (
              <SiblingRow
                key={item.id}
                item={item}
                href={href}
                isCurrent={isCurrent}
                currentSlug={cur.slug}
                currentPathSlugs={pathSlugs}
                basePath={basePath}
                baseParams={baseParams}
                depthPx={indentBase}
                facetFilterQuery={facetFilterQuery}
              />
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav className="category-accordion" aria-label="Kategori">
      {pathSlugs.map((slug, i) => {
        const headerHref = buildFilterUrl(basePath, baseParams, {
          categoryPathSlugs: pathSlugs.slice(0, i + 1)
        });
        return (
          <div key={`path-${slug}-${i}`} className="category-accordion__block">
            <div
              className="category-accordion__row category-accordion__row--header category-accordion__row--trail"
              style={{ paddingLeft: indentBase + i * step }}
            >
              <Link href={headerHref} className="category-accordion__link category-accordion__link--header">
                <span className="category-accordion__label">{pathNames[i]}</span>
              </Link>
            </div>
          </div>
        );
      })}

      <ul className="category-accordion__list category-accordion__list--branch" role="list">
        {filteredSiblings.length === 0 && facetFilterQuery.trim() ? (
          <li className="category-accordion__nested-hint" style={{ paddingLeft: listDepth }}>
            Aramanızla eşleşen alt kategori yok
          </li>
        ) : null}
        {filteredSiblings.map((item) => {
          const href = buildFilterUrl(basePath, baseParams, { categoryPathSlugs: item.pathSlugs });
          const isCurrent = cur.slug === item.slug;
          return (
            <SiblingRow
              key={item.id}
              item={item}
              href={href}
              isCurrent={isCurrent}
              currentSlug={cur.slug}
              currentPathSlugs={pathSlugs}
              basePath={basePath}
              baseParams={baseParams}
              depthPx={listDepth}
              facetFilterQuery={facetFilterQuery}
            />
          );
        })}
      </ul>
    </nav>
  );
}
