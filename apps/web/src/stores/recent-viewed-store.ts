/**
 * Son gezilen ürün slug listesi (localStorage).
 * Ürün detayı ve kartta galeri gezinmesi aynı fonksiyonu kullanır.
 */

export const RECENTLY_VIEWED_STORAGE_KEY = "recentlyViewedSlugs";
export const RECENTLY_VIEWED_MAX = 12;

/** Aynı sayfada rail’in güncellenmesi için */
export const RECENTLY_VIEWED_UPDATED_EVENT = "recentlyViewedUpdated";

const lastPersistMsBySlug = new Map<string, number>();
const PERSIST_THROTTLE_MS = 450;

/**
 * Slug’ı listenin başına alır; yinelenenleri kaldırır.
 * Aynı slug için kısa aralıkta tekrarlanan yazımlar azaltılır (performans).
 */
export function touchRecentlyViewed(slug: string): void {
  if (!slug || typeof window === "undefined") return;
  const now = Date.now();
  const prev = lastPersistMsBySlug.get(slug) ?? 0;
  if (now - prev < PERSIST_THROTTLE_MS) return;
  lastPersistMsBySlug.set(slug, now);

  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const rest = list.filter((s) => s !== slug);
    const next = [slug, ...rest].slice(0, RECENTLY_VIEWED_MAX);
    localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_UPDATED_EVENT));
  } catch {
    /* ignore */
  }
}
