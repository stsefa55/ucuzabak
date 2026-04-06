"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "../../src/components/layout/Header";
import { apiFetch } from "../../src/lib/api-client";
import { getErrorStatus, parseNestErrorMessage } from "../../src/lib/nest-error";
import { useAuthStore } from "../../src/stores/auth-store";

export default function AlertsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuthStore();
  const needsEmailVerification = !!accessToken && user?.emailVerified === false;

  const { data, isLoading, error } = useQuery({
    queryKey: ["price-alerts"],
    queryFn: async () => {
      if (!accessToken) throw new Error("UNAUTHENTICATED");
      return apiFetch<any[]>("/me/price-alerts", { accessToken });
    },
    enabled: !!accessToken
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!accessToken) throw new Error("UNAUTHENTICATED");
      return apiFetch(`/me/price-alerts/${id}`, {
        method: "DELETE",
        accessToken
      });
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["price-alerts"] });
      const previous = queryClient.getQueryData<any[]>(["price-alerts"]);
      if (previous) {
        queryClient.setQueryData(
          ["price-alerts"],
          previous.filter((a) => a.id !== id),
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["price-alerts"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["price-alerts"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: number; targetPrice?: number; isActive?: boolean }) => {
      if (!accessToken) throw new Error("UNAUTHENTICATED");
      return apiFetch(`/me/price-alerts/${payload.id}`, {
        method: "PATCH",
        body: { targetPrice: payload.targetPrice, isActive: payload.isActive },
        accessToken
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-alerts"] });
    },
    onError: (err: unknown) => {
      if (getErrorStatus(err) === 403) {
        window.alert(parseNestErrorMessage(err));
      }
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
            Fiyat alarmlarım
          </h1>

          {!accessToken && (
            <div className="card">
              <p className="text-muted" style={{ marginBottom: "0.75rem" }}>
                Fiyat alarmlarınızı görmek için giriş yapmanız gerekiyor.
              </p>
              <button type="button" className="btn-primary" onClick={handleRequireLogin}>
                Giriş yap
              </button>
            </div>
          )}

          {accessToken && needsEmailVerification && (
            <div
              className="card"
              style={{
                marginBottom: "1rem",
                borderColor: "#fde68a",
                background: "linear-gradient(180deg, #fffbeb 0%, #fefce8 100%)"
              }}
            >
              <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#92400e", margin: "0 0 0.35rem" }}>
                E-posta doğrulaması gerekli
              </p>
              <p style={{ fontSize: "0.85rem", color: "#78350f", margin: 0, lineHeight: 1.5 }}>
                Alarm hedefini değiştirmek veya durumu güncellemek için önce e-postanızı doğrulayın.{" "}
                <Link href="/profil" style={{ fontWeight: 700, color: "#b45309" }}>
                  Hesabım
                </Link>
              </p>
            </div>
          )}

          {accessToken && (
            <div className="card">
              {isLoading && <p>Yükleniyor...</p>}
              {error && (error as any).status === 401 && (
                <p className="text-muted">
                  Oturumunuzun süresi dolmuş. Fiyat alarmlarınızı görmek için yeniden giriş yapın.
                </p>
              )}
              {error && (error as any).status !== 401 && (error as any).message !== "UNAUTHENTICATED" && (
                <p className="text-danger">Fiyat alarmları yüklenirken bir hata oluştu.</p>
              )}
              {!isLoading && data && data.length === 0 && (
                <p className="text-muted">Henüz kayıtlı fiyat alarmınız yok.</p>
              )}
              {!isLoading && data && data.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {data.map((alert: any) => (
                    <li
                      key={alert.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.6rem 0",
                        borderBottom: "1px solid #e5e7eb"
                      }}
                    >
                      <div>
                        <Link href={`/urun/${alert.product.slug}`}>
                          <strong>{alert.product.name}</strong>
                        </Link>
                        <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                          Hedef fiyat: {alert.targetPrice} TL •{" "}
                          {alert.isActive ? "Aktif" : "Pasif"}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: "0.8rem" }}
                          disabled={updateMutation.isPending || needsEmailVerification}
                          title={needsEmailVerification ? "Önce e-postanızı doğrulayın" : undefined}
                          onClick={() => {
                            if (needsEmailVerification) {
                              window.alert(
                                "Alarmı güncellemek için önce e-postanızı doğrulayın. Hesabım sayfasından devam edebilirsiniz.",
                              );
                              return;
                            }
                            const next = window.prompt(
                              "Yeni hedef fiyat (TL)",
                              String(alert.targetPrice),
                            );
                            if (!next) return;
                            const value = Number(next);
                            if (!Number.isFinite(value) || value <= 0) return;
                            updateMutation.mutate({ id: alert.id, targetPrice: value });
                          }}
                        >
                          Fiyatı güncelle
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ fontSize: "0.8rem" }}
                          disabled={updateMutation.isPending || needsEmailVerification}
                          title={needsEmailVerification ? "Önce e-postanızı doğrulayın" : undefined}
                          onClick={() => {
                            if (needsEmailVerification) {
                              window.alert(
                                "Alarmı güncellemek için önce e-postanızı doğrulayın. Hesabım sayfasından devam edebilirsiniz.",
                              );
                              return;
                            }
                            updateMutation.mutate({
                              id: alert.id,
                              isActive: !alert.isActive
                            });
                          }}
                        >
                          {alert.isActive ? "Pasifleştir" : "Aktifleştir"}
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ fontSize: "0.8rem" }}
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(alert.id)}
                        >
                          {deleteMutation.isPending ? "Kaldırılıyor..." : "Alarmı kaldır"}
                        </button>
                      </div>
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

