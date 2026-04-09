import type { MetadataRoute } from "next";
import { resolveStorefrontBaseUrlForWeb } from "@ucuzabak/shared";
import { getApiBaseUrl } from "../src/lib/api-client";

const STATIC_PAGES = [
  { path: "/", priority: 1.0, changeFrequency: "daily" as const },
  { path: "/hakkimizda", priority: 0.3, changeFrequency: "monthly" as const },
  { path: "/iletisim", priority: 0.3, changeFrequency: "monthly" as const },
  { path: "/sikca-sorulan-sorular", priority: 0.3, changeFrequency: "monthly" as const },
  { path: "/gizlilik", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/gizlilik-politikasi", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/cerez-politikasi", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/kullanim-kosullari", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/kullanici-sozlesmesi", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/islem-rehberi", priority: 0.3, changeFrequency: "monthly" as const },
  { path: "/reklam-verin", priority: 0.3, changeFrequency: "monthly" as const },
  { path: "/satici-basvuru", priority: 0.3, changeFrequency: "monthly" as const },
  { path: "/firsat-urunleri", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/fiyati-dusen-urunler", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/populer-urunler", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/one-cikan-urunler", priority: 0.7, changeFrequency: "daily" as const }
];

interface ApiProduct {
  slug: string;
  updatedAt?: string;
}

interface ApiCategory {
  id: number;
  slug: string;
  name: string;
  parentId: number | null;
  children?: ApiCategory[];
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function flattenCategories(cats: ApiCategory[], parentSlugs: string[] = []): string[][] {
  const result: string[][] = [];
  for (const cat of cats) {
    const path = [...parentSlugs, cat.slug];
    result.push(path);
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children, path));
    }
  }
  return result;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = resolveStorefrontBaseUrlForWeb();
  const api = getApiBaseUrl();

  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${base}${p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority
  }));

  const [productsData, categoriesData, brandsData] = await Promise.all([
    fetchJson<{ items: ApiProduct[] } | ApiProduct[]>(`${api}/products?pageSize=5000&page=1`),
    fetchJson<ApiCategory[]>(`${api}/categories`),
    fetchJson<Array<{ slug: string }>>(`${api}/brands`)
  ]);

  const products: ApiProduct[] = Array.isArray(productsData)
    ? productsData
    : (productsData as { items: ApiProduct[] })?.items ?? [];

  for (const p of products) {
    if (!p.slug) continue;
    entries.push({
      url: `${base}/urun/${p.slug}`,
      changeFrequency: "daily",
      priority: 0.8,
      ...(p.updatedAt ? { lastModified: new Date(p.updatedAt) } : {})
    });
  }

  if (Array.isArray(categoriesData)) {
    const paths = flattenCategories(categoriesData);
    for (const slugArr of paths) {
      entries.push({
        url: `${base}/kategori/${slugArr.join("/")}`,
        changeFrequency: "daily",
        priority: 0.6
      });
    }
  }

  if (Array.isArray(brandsData)) {
    for (const b of brandsData) {
      if (!b.slug) continue;
      entries.push({
        url: `${base}/marka/${b.slug}`,
        changeFrequency: "weekly",
        priority: 0.5
      });
    }
  }

  return entries;
}
