"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api-client";
import {
  GUEST_FAVORITES_UPDATED_EVENT,
  isGuestFavoriteSlug,
  toggleGuestFavoriteSlug
} from "../../lib/guest-favorites";
import { useAuthStore } from "../../stores/auth-store";

interface Props {
  productId: number;
  /** Giriş yokken yerel favori için canonical ürün slug (detay sayfası) */
  productSlug?: string;
  /** Ürün kartı sağ üst: sadece buton */
  compact?: boolean;
}

export function ProductFavoriteSection({ productId, productSlug, compact = false }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();
  const [guestRev, setGuestRev] = useState(0);

  useEffect(() => {
    const on = () => setGuestRev((n) => n + 1);
    window.addEventListener(GUEST_FAVORITES_UPDATED_EVENT, on);
    return () => window.removeEventListener(GUEST_FAVORITES_UPDATED_EVENT, on);
  }, []);

  const guestIsFavorite = !accessToken && productSlug ? isGuestFavoriteSlug(productSlug) : false;

  const favoritesQuery = useQuery({
    queryKey: ["favorites"],
    enabled: !!accessToken,
    queryFn: async () => {
      if (!accessToken) throw new Error("UNAUTHENTICATED");
      return apiFetch<any[]>("/me/favorites", { accessToken });
    }
  });

  const serverFavorite = !!favoritesQuery.data?.some((f) => f.productId === productId);
  const isFavorite = accessToken ? serverFavorite : guestIsFavorite;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("UNAUTHENTICATED");
      if (serverFavorite) {
        return apiFetch(`/me/favorites/${productId}`, {
          method: "DELETE",
          accessToken
        });
      }
      return apiFetch("/me/favorites", {
        method: "POST",
        body: { productId },
        accessToken
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["favorites"] });

      const previous = queryClient.getQueryData<any[]>(["favorites"]);

      if (!previous) {
        return { previous };
      }

      const next = serverFavorite
        ? previous.filter((f) => f.productId !== productId)
        : [...previous, { productId }];

      queryClient.setQueryData(["favorites"], next);

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["favorites"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    }
  });

  const handleGuestToggle = useCallback(() => {
    if (!productSlug) {
      router.push("/giris");
      return;
    }
    toggleGuestFavoriteSlug(productSlug);
    setGuestRev((n) => n + 1);
  }, [productSlug, router]);

  const handleClick = () => {
    if (!accessToken) {
      handleGuestToggle();
      return;
    }
    mutation.mutate();
  };

  if (compact) {
    return (
      <button
        type="button"
        className={
          isFavorite
            ? "product-detail-hero__fav-icon-btn product-detail-hero__fav-icon-btn--active"
            : "product-detail-hero__fav-icon-btn"
        }
        onClick={handleClick}
        disabled={mutation.isPending}
        title={
          !accessToken && !productSlug
            ? "Favoriler için giriş yapın"
            : isFavorite
              ? "Favorilerden kaldır"
              : "Favorilere ekle"
        }
        aria-label={
          !accessToken && !productSlug
            ? "Favoriler için giriş yapın"
            : isFavorite
              ? "Favorilerden kaldır"
              : "Favorilere ekle"
        }
      >
        <Heart
          size={20}
          strokeWidth={2}
          fill={isFavorite ? "currentColor" : "none"}
          aria-hidden
        />
      </button>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Favori</h3>
      <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
        Favorilerinize ekleyerek bu ürüne daha hızlı erişebilirsiniz.
      </p>
      <button
        type="button"
        className={isFavorite ? "btn-secondary" : "btn-primary"}
        onClick={handleClick}
        disabled={mutation.isPending}
      >
        {mutation.isPending
          ? "Güncelleniyor..."
          : isFavorite
            ? "Favorilerden kaldır"
            : "Favorilere ekle"}
      </button>
    </div>
  );
}
