import type { Category } from "../../lib/types";
import { API_BASE_URL, apiFetchJson } from "../client";

export async function fetchCategories(): Promise<Category[]> {
  try {
    console.log("[MOBILE API DEBUG] REAL API USED: categories");
    console.log(
      "[MOBILE API DEBUG] categories request URL:",
      `${API_BASE_URL}/categories`
    );

    const rows = await apiFetchJson<
      Array<{
        id: number;
        name: string;
        slug: string;
        iconName?: string | null;
        imageUrl?: string | null;
        sortOrder?: number | null;
        isActive?: boolean;
      }>
    >(`/categories`);

    if (!rows.length) {
      console.log("FALLBACK USED: CATEGORIES EMPTY RESPONSE");
      console.log("FALLBACK USED: CATEGORIES EMPTY RESPONSE ORIGINAL ERROR: none (empty response)");
      return [];
    }

    const mapped: Category[] = [];
    for (const c of rows) {
      if (!c?.slug || !c?.name) {
        console.log("CATEGORIES DEBUG: SKIP invalid backend category", c);
        continue;
      }
      if (c.isActive === false) continue;
      mapped.push({
        id: c.slug,
        slug: c.slug,
        name: c.name,
        iconName: c.iconName ?? null,
        imageUrl: c.imageUrl ?? null,
        sortOrder: c.sortOrder ?? null,
        isActive: c.isActive ?? true
      });
      console.log("CATEGORIES DEBUG: rendered backend category", c.slug, c.name);
    }

    console.log("[CATEGORIES DEBUG] categories loaded count:", mapped.length);
    return mapped;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("FALLBACK USED: CATEGORIES API ERROR");
    console.log("FALLBACK USED: CATEGORIES API ERROR ORIGINAL ERROR:", msg);
    // backend endpoint'ine ulaşılamıyorsa sadece service katmanında mock'a dön
    return [];
  }
}

export async function fetchCategoryChildren(parentSlug: string): Promise<Category[]> {
  try {
    const safeSlug = parentSlug.trim();
    if (!safeSlug) return [];

    console.log("[MOBILE API DEBUG] REAL API USED: category children");
    console.log("[MOBILE API DEBUG] category children request URL:", `${API_BASE_URL}/categories/${encodeURIComponent(safeSlug)}/children`);

    const rows = await apiFetchJson<
      Array<{
        id: number;
        name: string;
        slug: string;
        iconName?: string | null;
        imageUrl?: string | null;
        sortOrder?: number | null;
        isActive?: boolean;
      }>
    >(`/categories/${encodeURIComponent(safeSlug)}/children`);

    if (!rows?.length) return [];

    const mapped: Category[] = [];
    for (const c of rows) {
      if (!c?.slug || !c?.name) continue;
      if (c.isActive === false) continue;
      mapped.push({
        id: c.slug,
        slug: c.slug,
        name: c.name,
        iconName: c.iconName ?? null,
        imageUrl: c.imageUrl ?? null,
        sortOrder: c.sortOrder ?? null,
        isActive: c.isActive ?? true
      });
    }

    return mapped;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("FALLBACK USED: CATEGORY CHILDREN API ERROR");
    console.log("FALLBACK USED: CATEGORY CHILDREN API ERROR ORIGINAL ERROR:", msg);
    return [];
  }
}

