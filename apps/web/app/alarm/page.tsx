"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogIn, ShieldCheck, Smartphone, UserPlus } from "lucide-react";
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
            <section className="auth-gate" aria-labelledby="alarm-gate-title">
              <div className="auth-gate__icon-wrap">
                <Bell size={32} strokeWidth={1.6} />
              </div>
              <h2 id="alarm-gate-title" className="auth-gate__title">
                Fiyat alarmlarını kullanmak için giriş yapın
              </h2>
              <p className="auth-gate__desc">
                Beğendiğiniz ürünlere fiyat alarmı kurun, fiyat düştüğünde anında e-posta ile bilgilendirilirsiniz.
              </p>
              <ul className="auth-gate__features">
                <li>
                  <ShieldCheck size={16} strokeWidth={2} aria-hidden />
                  <span>Hedef fiyat belirleme ve otomatik bildirim</span>
                </li>
                <li>
                  <Smartphone size={16} strokeWidth={2} aria-hidden />
                  <span>Tüm cihazlarınızda senkronize alarmlar</span>
                </li>
              </ul>
              <div className="auth-gate__actions">
                <Link href="/giris" className="auth-gate__btn auth-gate__btn--primary">
                  <LogIn size={17} strokeWidth={2} aria-hidden />
                  Giriş yap
                </Link>
                <Link href="/kayit" className="auth-gate__btn auth-gate__btn--secondary">
                  <UserPlus size={17} strokeWidth={2} aria-hidden />
                  Hesap oluştur
                </Link>
              </div>
            </section>
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
                <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔔</div>
                  <p style={{ fontSize: "1rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Henüz fiyat alarmınız yok
                  </p>
                  <p className="text-muted" style={{ fontSize: "0.88rem", marginBottom: "1rem", maxWidth: 400, margin: "0 auto 1rem" }}>
                    Beğendiğiniz ürünlerin sayfasından fiyat alarmı kurarak, fiyat düştüğünde e-posta ile bilgilendirilirsiniz.
                  </p>
                  <Link href="/" className="btn-primary" style={{ display: "inline-flex", padding: "0.5rem 1.25rem", fontSize: "0.88rem" }}>
                    Ürünlere göz at
                  </Link>
                </div>
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

