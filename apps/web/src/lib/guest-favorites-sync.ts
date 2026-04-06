"use client";

import { apiFetch } from "./api-client";
import { clearGuestFavoriteSlugs, GUEST_FAVORITES_MAX, readGuestFavoriteSlugs } from "./guest-favorites";
import { getBrowserQueryClient } from "./query-client";

/** Giriş/kayıt veya oturum yenileme sonrası: yerel slug’ları API’ye aktarır, başarıda localStorage temizlenir. */
export async function syncGuestFavoritesToAccount(accessToken: string): Promise<void> {
  if (!accessToken || typeof window === "undefined") return;
  const slugs = readGuestFavoriteSlugs();
  if (slugs.length === 0) return;

  try {
    await apiFetch<{ merged: number; notFound: number }>("/me/favorites/import-slugs", {
      method: "POST",
      accessToken,
      body: { slugs: slugs.slice(0, GUEST_FAVORITES_MAX) },
    });
    clearGuestFavoriteSlugs();
    getBrowserQueryClient()?.invalidateQueries({ queryKey: ["favorites"] });
  } catch {
    /* API hatasında yerel favoriler korunur */
  }
}
