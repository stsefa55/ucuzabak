"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "../../src/components/layout/Header";
import { apiFetch } from "../../src/lib/api-client";
import { useAuthStore } from "../../src/stores/auth-store";

export default function FavoritesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      if (!accessToken) throw new Error("UNAUTHENTICATED");
      return apiFetch<any[]>("/me/favorites", { accessToken });
    },
    enabled: !!accessToken
  });

  const removeMutation = useMutation({
    mutationFn: async (productId: number) => {
      if (!accessToken) throw new Error("UNAUTHENTICATED");
      return apiFetch(`/me/favorites/${productId}`, {
        method: "DELETE",
        accessToken
      });
    },
    onMutate: async (productId: number) => {
      await queryClient.cancelQueries({ queryKey: ["favorites"] });
      const previous = queryClient.getQueryData<any[]>(["favorites"]);
      if (previous) {
        queryClient.setQueryData(
          ["favorites"],
          previous.filter((f) => f.productId !== productId),
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["favorites"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    }
  });

  const handleRequireLogin = () => {
    router.push("/giris");
  };

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "1rem" }}>
            Favorilerim
          </h1>

          {!accessToken && (
            <div className="card">
              <p className="text-muted" style={{ marginBottom: "0.75rem" }}>
                Favorilerinizi görmek için giriş yapmanız gerekiyor.
              </p>
              <button type="button" className="btn-primary" onClick={handleRequireLogin}>
                Giriş yap
              </button>
            </div>
          )}

          {accessToken && (
            <div className="card">
              {isLoading && <p>Yükleniyor...</p>}
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
              {!isLoading && data && data.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {data.map((fav: any) => (
                    <li
                      key={fav.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.6rem 0",
                        borderBottom: "1px solid #e5e7eb"
                      }}
                    >
                      <div>
                        <Link href={`/urun/${fav.product.slug}`}>
                          <strong>{fav.product.name}</strong>
                        </Link>
                        <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                          {fav.product.brand?.name}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ fontSize: "0.8rem" }}
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(fav.productId)}
                      >
                        {removeMutation.isPending ? "Kaldırılıyor..." : "Favorilerden çıkar"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

