"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../stores/auth-store";

interface Props {
  productId: number;
}

export function ProductFavoriteSection({ productId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();

  const favoritesQuery = useQuery({
    queryKey: ["favorites"],
    enabled: !!accessToken,
    queryFn: async () => {
      if (!accessToken) throw new Error("UNAUTHENTICATED");
      return apiFetch<any[]>("/me/favorites", { accessToken });
    }
  });

  const isFavorite = !!favoritesQuery.data?.some((f) => f.productId === productId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("UNAUTHENTICATED");
      if (isFavorite) {
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

      const next = isFavorite
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

  const handleClick = () => {
    if (!accessToken) {
      router.push("/giris");
      return;
    }
    mutation.mutate();
  };

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

