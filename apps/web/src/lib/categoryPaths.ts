/**
 * Hiyerarşik kategori URL'i: /kategori/kok/.../yaprak
 * API'den gelen categoryPathSlugs (kökten yaprağa) ile üretilir.
 */
export function categoryHrefFromSlugs(
  pathSlugs?: string[] | null,
  fallbackLeafSlug?: string | null
): string {
  const slugs =
    pathSlugs && pathSlugs.length > 0 ? pathSlugs : fallbackLeafSlug ? [fallbackLeafSlug] : [];
  if (slugs.length === 0) return "/arama";
  return `/kategori/${slugs.map((s) => encodeURIComponent(s)).join("/")}`;
}

/** Mevcut kategori sayfası pathname'i (query hariç) */
export function categoryPageBasePathFromSlugs(slugs: string[]): string {
  if (!slugs.length) return "/arama";
  return `/kategori/${slugs.map((s) => encodeURIComponent(s)).join("/")}`;
}
