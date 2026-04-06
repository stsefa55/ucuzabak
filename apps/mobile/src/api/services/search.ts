import type { Product } from "../../lib/types";
import { API_BASE_URL, apiFetchJson } from "../client";

function toMoney(amount: unknown, currency?: unknown) {
  const a = typeof amount === "number" ? amount : typeof amount === "string" ? Number(amount) : 0;
  const cur = typeof currency === "string" ? currency : undefined;
  return { amount: Number.isFinite(a) ? a : 0, currency: cur };
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toSpecsRecord(specsJson: unknown): Product["specs"] | undefined {
  if (!specsJson || typeof specsJson !== "object") return undefined;
  const obj = specsJson as Record<string, unknown>;
  const entries = Object.entries(obj).filter(([_, v]) => typeof v !== "undefined");
  if (entries.length === 0) return undefined;
  return entries.reduce(
    (acc: NonNullable<Product["specs"]>, [k, v]) => {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
        acc[k] = v;
      }
      return acc;
    },
    {} as NonNullable<Product["specs"]>,
  );
}

type BackendSearchProduct = {
  id: number;
  slug: string;
  name: string;
  mainImageUrl?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  lowestPriceCache?: unknown | null;
  offerCountCache: number;
  specsJson?: unknown | null;
};

type BackendSearchListResponse = {
  items: BackendSearchProduct[];
  total: number;
  page: number;
  pageSize: number;
};

export async function fetchSearchProducts(q: string): Promise<Product[]> {
  const trimmed = q.trim();
  if (!trimmed) {
    console.log("FALLBACK USED: SEARCH SUBMITTED EMPTY QUERY - skipping search");
    return [];
  }

  const page = 1;
  const pageSize = 20;
  const path = `/search/products?q=${encodeURIComponent(trimmed)}&page=${page}&pageSize=${pageSize}`;

  console.log("[MOBILE API DEBUG] search request URL:", `${API_BASE_URL}${path}`);

  try {
    const rows = await apiFetchJson<BackendSearchListResponse>(path);
    const items = rows?.items ?? [];

    if (items.length === 0) {
      console.log("SEARCH EMPTY RESULTS for q:", trimmed);
    }

    const mapped = items.map((p) => {
      const price = toMoney(p.lowestPriceCache, "TRY");

      // Search endpoint doesn't include offer/originalPrice data; drop badge must be hidden.
      return {
        id: String(p.id),
        slug: p.slug,
        name: p.name,
        imageUrl: p.mainImageUrl ?? null,
        ratingAvg: p.ratingAvg ?? null,
        ratingCount: p.ratingCount ?? null,
        price,
        oldPrice: null,
        priceDropPercent: null,
        storeCount: p.offerCountCache ?? 0,
        specs: toSpecsRecord(p.specsJson),
        dataSource: "backend" as const
      };
    });

    console.log("[SEARCH DEBUG] result count returned:", mapped.length);
    return mapped as Product[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("FALLBACK USED: SEARCH API ERROR");
    console.log("FALLBACK USED: SEARCH API ERROR ORIGINAL ERROR:", msg);
    return [];
  }
}

export async function fetchPopularSearchQueries(limit: number, prefix?: string): Promise<string[]> {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(20, limit)) : 10;
  const p = prefix?.trim();

  const params = new URLSearchParams();
  params.set("limit", String(safeLimit));
  if (p) params.set("prefix", p);

  const path = `/search/popular-queries?${params.toString()}`;
  console.log("[MOBILE API DEBUG] popular queries request URL:", `${API_BASE_URL}${path}`);

  try {
    const rows = await apiFetchJson<unknown>(path);
    if (!Array.isArray(rows)) {
      console.log("FALLBACK USED: POPULAR QUERIES invalid response shape");
      return [];
    }
    return rows.filter((x) => typeof x === "string" && x.trim().length > 0) as string[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("FALLBACK USED: POPULAR QUERIES API ERROR");
    console.log("FALLBACK USED: POPULAR QUERIES API ERROR ORIGINAL ERROR:", msg);
    return [];
  }
}

