"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogIn, ShieldCheck, Smartphone, UserPlus, ShoppingBag } from "lucide-react";
import { Header } from "../../src/components/layout/Header";
import { apiFetch } from "../../src/lib/api-client";
import { getErrorStatus, parseNestErrorMessage } from "../../src/lib/nest-error";
import { formatTL } from "../../src/lib/utils";
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
      const st = getErrorStatus(err);
      if (st === 403 || st === 400) {
        window.alert(parseNestErrorMessage(err));
      }
    }
  });

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <div className="alarm-page__header">
            <div className="alarm-page__icon">
              <Bell size={20} strokeWidth={1.8} />
            </div>
            <h1 className="alarm-page__title">Fiyat alarmlarım</h1>
          </div>

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
            <div className="alarm-verify-banner">
              <p className="alarm-verify-banner__title">E-posta doğrulaması gerekli</p>
              <p className="alarm-verify-banner__desc">
                Alarm hedefini değiştirmek veya durumu güncellemek için önce e-postanızı doğrulayın.{" "}
                <Link href="/profil">Hesabım</Link>
              </p>
            </div>
          )}

          {accessToken && (
            <div className="card">
              {isLoading && <p className="text-muted" style={{ padding: "1rem" }}>Yükleniyor...</p>}

              {error && (error as any).status === 401 && (
                <p className="text-muted" style={{ padding: "1rem" }}>
                  Oturumunuzun süresi dolmuş. Fiyat alarmlarınızı görmek için yeniden giriş yapın.
                </p>
              )}

              {error && (error as any).status !== 401 && (error as any).message !== "UNAUTHENTICATED" && (
                <p className="text-danger" style={{ padding: "1rem" }}>
                  Fiyat alarmları yüklenirken bir hata oluştu.
                </p>
              )}

              {!isLoading && data && data.length === 0 && (
                <div className="alarm-empty">
                  <div className="alarm-empty__icon">
                    <Bell size={26} strokeWidth={1.6} />
                  </div>
                  <p className="alarm-empty__title">Henüz fiyat alarmınız yok</p>
                  <p className="alarm-empty__desc">
                    Beğendiğiniz ürünlerin sayfasından fiyat alarmı kurarak, fiyat düştüğünde e-posta ile bilgilendirilirsiniz.
                  </p>
                  <Link href="/" className="alarm-empty__btn">
                    <ShoppingBag size={16} strokeWidth={2} />
                    Ürünlere göz at
                  </Link>
                </div>
              )}

              {!isLoading && data && data.length > 0 && (
                <ul className="alarm-list">
                  {data.map((alert: any) => (
                    <li key={alert.id} className="alarm-list__item">
                      <div className="alarm-list__info">
                        <Link href={`/urun/${alert.product.slug}`} className="alarm-list__name">
                          {alert.product.name}
                        </Link>
                        <span className="alarm-list__meta">
                          Hedef: {formatTL(alert.targetPrice)}
                          <span className={`alarm-list__badge ${alert.isActive ? "alarm-list__badge--active" : "alarm-list__badge--paused"}`}>
                            {alert.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </span>
                      </div>
                      <div className="alarm-list__actions">
                        <button
                          type="button"
                          className="alarm-list__action-btn"
                          disabled={updateMutation.isPending || needsEmailVerification}
                          title={needsEmailVerification ? "Önce e-postanızı doğrulayın" : undefined}
                          onClick={() => {
                            if (needsEmailVerification) {
                              window.alert("Alarmı güncellemek için önce e-postanızı doğrulayın.");
                              return;
                            }
                            const next = window.prompt("Yeni hedef fiyat (TL)", String(alert.targetPrice));
                            if (!next) return;
                            const value = Number(next);
                            if (!Number.isFinite(value) || value <= 0) return;
                            const lowRaw = alert.product?.lowestPriceCache;
                            const low =
                              lowRaw != null && String(lowRaw).trim() !== "" ? Number(lowRaw) : NaN;
                            if (Number.isFinite(low) && low > 0 && value >= low) {
                              window.alert("Hedef fiyat, güncel en düşük fiyatın altında olmalıdır.");
                              return;
                            }
                            updateMutation.mutate({ id: alert.id, targetPrice: value });
                          }}
                        >
                          Fiyatı güncelle
                        </button>
                        <button
                          type="button"
                          className="alarm-list__action-btn"
                          disabled={updateMutation.isPending || needsEmailVerification}
                          title={needsEmailVerification ? "Önce e-postanızı doğrulayın" : undefined}
                          onClick={() => {
                            if (needsEmailVerification) {
                              window.alert("Alarmı güncellemek için önce e-postanızı doğrulayın.");
                              return;
                            }
                            updateMutation.mutate({ id: alert.id, isActive: !alert.isActive });
                          }}
                        >
                          {alert.isActive ? "Pasifleştir" : "Aktifleştir"}
                        </button>
                        <button
                          type="button"
                          className="alarm-list__action-btn alarm-list__action-btn--danger"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(alert.id)}
                        >
                          {deleteMutation.isPending ? "Kaldırılıyor..." : "Kaldır"}
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
