/**
 * Giriş yapmamış kullanıcılar için favoriler (yalnızca bu tarayıcı / cihaz).
 * Giriş/kayıt sonrası `syncGuestFavoritesToAccount` ile hesaba aktarılıp bu liste temizlenir.
 */

export const GUEST_FAVORITES_STORAGE_KEY = "guestFavoriteSlugs";
export const GUEST_FAVORITES_MAX = 50;
export const GUEST_FAVORITES_UPDATED_EVENT = "guestFavoritesUpdated";

export function readGuestFavoriteSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string" && s.length > 0);
  } catch {
    return [];
  }
}

function writeGuestFavoriteSlugs(slugs: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_FAVORITES_STORAGE_KEY, JSON.stringify(slugs.slice(0, GUEST_FAVORITES_MAX)));
  window.dispatchEvent(new CustomEvent(GUEST_FAVORITES_UPDATED_EVENT));
}

export function isGuestFavoriteSlug(slug: string): boolean {
  if (!slug) return false;
  return readGuestFavoriteSlugs().includes(slug);
}

/** @returns güncel durum: slug favoride mi */
export function toggleGuestFavoriteSlug(slug: string): boolean {
  if (!slug || typeof window === "undefined") return false;
  const list = [...readGuestFavoriteSlugs()];
  const i = list.indexOf(slug);
  if (i >= 0) {
    list.splice(i, 1);
    writeGuestFavoriteSlugs(list);
    return false;
  }
  writeGuestFavoriteSlugs([slug, ...list.filter((s) => s !== slug)]);
  return true;
}

export function removeGuestFavoriteSlug(slug: string) {
  if (!slug || typeof window === "undefined") return;
  writeGuestFavoriteSlugs(readGuestFavoriteSlugs().filter((s) => s !== slug));
}

/** Girişte sunucuya aktarım sonrası veya sıfırlamada tüm misafir favorilerini siler. */
export function clearGuestFavoriteSlugs() {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_FAVORITES_STORAGE_KEY, JSON.stringify([]));
  window.dispatchEvent(new CustomEvent(GUEST_FAVORITES_UPDATED_EVENT));
}
