"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Cloud, Heart, LogIn, Monitor, UserPlus } from "lucide-react";
import { Header } from "../../src/components/layout/Header";
import { ProductCard, type ProductCardProduct } from "../../src/components/products/ProductCard";
import { apiFetch, getApiBaseUrl } from "../../src/lib/api-client";
import { GUEST_FAVORITES_UPDATED_EVENT, readGuestFavoriteSlugs } from "../../src/lib/guest-favorites";
import { mapApiProductToCardProduct } from "../../src/lib/mapApiProductToCardProduct";
import { useAuthStore } from "../../src/stores/auth-store";

function orderProductsBySlugs(slugs: string[], items: any[]): any[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const bySlug = new Map<string, any>();
  for (const p of items) {
    if (p && typeof p.slug === "string" && p.slug.length > 0) {
      bySlug.set(p.slug, p);
    }
  }
  return slugs.map((s) => bySlug.get(s)).filter(Boolean);
}

function useGuestFavoriteSlugsList() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const on = () => setV((n) => n + 1);
    window.addEventListener(GUEST_FAVORITES_UPDATED_EVENT, on);
    return () => window.removeEventListener(GUEST_FAVORITES_UPDATED_EVENT, on);
  }, []);
  return useMemo(() => readGuestFavoriteSlugs(), [v]);
}

export default function FavoritesPage() {
  const { accessToken } = useAuthStore();
  const guestSlugs = useGuestFavoriteSlugsList();

  const { data, isLoading, error } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      if (!accessToken) throw new Error("UNAUTHENTICATED");
      return apiFetch<any[]>("/me/favorites", { accessToken });
    },
    enabled: !!accessToken
  });

  const { data: guestProducts = [], isLoading: guestLoading } = useQuery({
    queryKey: ["guest-favorite-products", guestSlugs.join("\0")],
    queryFn: async () => {
      if (guestSlugs.length === 0) return [];
      const q = guestSlugs.map((s) => encodeURIComponent(s)).join(",");
      const res = await fetch(`${getApiBaseUrl()}/products/by-slugs?slugs=${q}`, { credentials: "include" });
      const raw = res.ok ? await res.json() : [];
      const arr = Array.isArray(raw) ? raw : [];
      return orderProductsBySlugs(guestSlugs, arr);
    },
    enabled: !accessToken && guestSlugs.length > 0
  });

  const guestCardProducts = useMemo((): ProductCardProduct[] => {
    return guestProducts
      .map((p: unknown) => mapApiProductToCardProduct(p))
      .filter((x): x is ProductCardProduct => x != null);
  }, [guestProducts]);

  const memberCardProducts = useMemo((): ProductCardProduct[] => {
    if (!data || !Array.isArray(data)) return [];
    return data
      .map((fav: any) => mapApiProductToCardProduct(fav?.product))
      .filter((x): x is ProductCardProduct => x != null);
  }, [data]);

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "1rem" }}>
            Favorilerim
          </h1>

          {!accessToken && (
            <section className="favorites-guest-callout" aria-labelledby="favorites-guest-callout-title">
              <div className="favorites-guest-callout__inner">
                <div className="favorites-guest-callout__visual" aria-hidden>
                  <Heart />
                </div>
                <div className="favorites-guest-callout__main">
                  <p className="favorites-guest-callout__eyebrow">Misafir modu</p>
                  <h2 id="favorites-guest-callout-title" className="favorites-guest-callout__title">
                    Favorileriniz şu an yalnızca bu tarayıcıda
                  </h2>
                  <ul className="favorites-guest-callout__list">
                    <li>
                      <Monitor size={16} strokeWidth={2} aria-hidden />
                      <span>Eklediğiniz ürünler cihazınızda saklanır; başka telefon veya bilgisayarda görünmez.</span>
                    </li>
                    <li>
                      <Cloud size={16} strokeWidth={2} aria-hidden />
                      <span>
                        <strong>Giriş veya kayıt</strong> olduğunuzda liste otomatik hesabınıza aktarılır; tüm
                        cihazlarınızdan devam edebilirsiniz.
                      </span>
                    </li>
                  </ul>
                  <div className="favorites-guest-callout__actions">
                    <Link
                      href="/giris"
                      className="favorites-guest-callout__btn favorites-guest-callout__btn--secondary"
                    >
                      <LogIn size={17} strokeWidth={2} aria-hidden />
                      Giriş yap
                    </Link>
                    <Link
                      href="/kayit"
                      className="favorites-guest-callout__btn favorites-guest-callout__btn--primary"
                    >
                      <UserPlus size={17} strokeWidth={2} aria-hidden />
                      Kayıt ol
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {!accessToken && (
            <>
              {guestSlugs.length === 0 && !guestLoading && (
                <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
                  Henüz favori ürününüz yok. Listelerde veya ürün sayfasındaki kalp ikonuyla ekleyebilirsiniz.
                </p>
              )}
              {guestLoading && guestSlugs.length > 0 && (
                <p className="text-muted" style={{ marginBottom: "1rem" }}>
                  Ürünler yükleniyor…
                </p>
              )}
              {!guestLoading && guestCardProducts.length > 0 && (
                <section aria-label="Favori ürünler">
                  <div className="grid grid-3">
                    {guestCardProducts.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                  <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: "1rem", lineHeight: 1.5 }}>
                    Favoriden çıkarmak için kart üzerindeki kalbe tekrar tıklayın.
                  </p>
                </section>
              )}
              {!guestLoading && guestSlugs.length > 0 && guestCardProducts.length === 0 && (
                <div className="card">
                  <p className="text-muted" style={{ margin: 0, lineHeight: 1.5 }}>
                    Kayıtlı favorilerinizden bazıları artık bulunamıyor veya kaldırılmış olabilir. Listeyi güncellemek için
                    bu sayfayı yenileyin veya ürünleri yeniden favorilere ekleyin.
                  </p>
                </div>
              )}
            </>
          )}

          {accessToken && (
            <>
              {isLoading && <p className="text-muted">Favorileriniz yükleniyor…</p>}
              {error && (error as any).status === 401 && (
                <p className="text-muted">
                  Oturumunuzun süresi dolmuş. Favorilerinizi görmek için yeniden giriş yapın.
                </p>
              )}
              {error && (error as any).status !== 401 && (error as any).message !== "UNAUTHENTICATED" && (
                <p className="text-danger">Favoriler yüklenirken bir hata oluştu.</p>
              )}
              {!isLoading && data && data.length === 0 && (
                <p className="text-muted">Henüz favori ürününüz yok.</p>
              )}
              {!isLoading && memberCardProducts.length > 0 && (
                <section aria-label="Favori ürünler">
                  <div className="grid grid-3">
                    {memberCardProducts.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
