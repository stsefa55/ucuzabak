"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Bell, Heart, Home, Mail, MailWarning, Phone, ShieldAlert, ShieldCheck, User } from "lucide-react";
import { Header } from "../../src/components/layout/Header";
import { apiFetch } from "../../src/lib/api-client";
import { useAuthStore, type UserInfo } from "../../src/stores/auth-store";
import styles from "./page.module.css";

function parseApiError(err: unknown): string {
  const e = err as { message?: string };
  const raw = typeof e?.message === "string" ? e.message : "";
  try {
    const j = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(j.message)) return String(j.message[0] ?? "Hata");
    if (typeof j.message === "string") return j.message;
  } catch {
    if (raw && !raw.startsWith("{")) return raw;
  }
  return "Profil güncellenirken bir hata oluştu.";
}

function initialsFromName(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const ch = email.trim()[0];
  return ch ? ch.toUpperCase() : "?";
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, accessToken, setSession } = useAuthStore();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("UNAUTHENTICATED");
      const payload: { name?: string; phone?: string } = {};
      if (name && name !== user?.name) payload.name = name;
      if (phone !== (user?.phone ?? "")) payload.phone = phone || undefined;
      return apiFetch<{ user: UserInfo }>("/auth/me", {
        method: "PATCH",
        body: payload,
        accessToken
      });
    },
    onSuccess: (data) => {
      if (accessToken && data.user) {
        setSession(accessToken, data.user);
      }
      setSuccess("Değişiklikleriniz kaydedildi.");
    },
    onError: (err: unknown) => {
      setError(parseApiError(err));
    },
    onSettled: () => {
      setSaving(false);
    }
  });

  useEffect(() => {
    if (!user) router.push("/giris");
  }, [router, user]);

  const initials = useMemo(
    () => (user ? initialsFromName(user.name || "", user.email) : ""),
    [user]
  );

  if (!user) return null;

  const emailVerified = user.emailVerified !== false;

  const handleResend = async () => {
    if (!accessToken) return;
    setResendMsg(null);
    setResendBusy(true);
    try {
      const res = await apiFetch<{ message: string }>("/auth/me/resend-verification-email", {
        method: "POST",
        accessToken
      });
      setResendMsg(res.message);
    } catch {
      setResendMsg("İstek gönderilemedi. Lütfen bir süre sonra tekrar deneyin.");
    } finally {
      setResendBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    mutation.mutate();
  };

  return (
    <>
      <Header />
      <main className={`main ${styles.pageBg}`}>
        <div className={`container ${styles.wrap}`}>
          <div className={styles.inner}>
            <div className={styles.profileHero}>
              <div className={styles.avatar} aria-hidden>
                {initials}
              </div>
              <div className={styles.heroText}>
                <h1>Hesabım</h1>
                <div className={styles.heroMeta}>
                  <span className={styles.emailLine}>
                    <Mail size={14} style={{ verticalAlign: "-2px", marginRight: 4, opacity: 0.7 }} />
                    {user.email}
                  </span>
                  {emailVerified ? (
                    <span className={styles.badgeVerified}>
                      <ShieldCheck size={12} aria-hidden />
                      Doğrulanmış
                    </span>
                  ) : (
                    <span className={styles.badgePending}>
                      <ShieldAlert size={12} aria-hidden />
                      Doğrulama gerekli
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.grid}>
              <nav className={styles.sideNav} aria-label="Hesap kısayolları">
                <Link className={styles.sideLink} href="/">
                  <Home size={16} aria-hidden />
                  Ana sayfa
                </Link>
                <Link className={styles.sideLink} href="/favoriler">
                  <Heart size={16} aria-hidden />
                  Favorilerim
                </Link>
                <Link className={styles.sideLink} href="/alarm">
                  <Bell size={16} aria-hidden />
                  Fiyat alarmlarım
                </Link>
              </nav>

              <div className={styles.mainStack}>
                {!emailVerified && (
                  <aside className={styles.verifyCard}>
                    <p className={styles.verifyTitle}>
                      <MailWarning size={18} aria-hidden />
                      E-posta doğrulaması bekleniyor
                    </p>
                    <p className={styles.verifyBody}>
                      Fiyat alarmı oluşturmak veya güncellemek için <strong>{user.email}</strong> adresine gönderdiğimiz
                      bağlantıyı açmanız gerekir. Gelen kutunuzu ve spam klasörünü kontrol edin.
                    </p>
                    <div className={styles.verifyActions}>
                      <button type="button" className="btn-primary btn-sm" disabled={resendBusy} onClick={handleResend}>
                        {resendBusy ? "Gönderiliyor…" : "Doğrulama e-postasını tekrar gönder"}
                      </button>
                    </div>
                    {resendMsg ? <p className={styles.verifyFeedback}>{resendMsg}</p> : null}
                  </aside>
                )}

                <div className={styles.panel}>
                  <div className={styles.panelHead}>
                    <h2>Kişisel bilgiler</h2>
                    <p>Adınız ve telefonunuz hesabınızda güvenle saklanır. E-posta adresi güvenlik nedeniyle buradan
                      değiştirilemez.</p>
                  </div>
                  <div className={styles.panelBody}>
                    <div className={styles.statusMini}>
                      <User size={16} aria-hidden style={{ color: "#64748b" }} />
                      <span>
                        Oturum: <strong>{user.name}</strong>
                        {user.role === "ADMIN" ? " · Yönetici" : null}
                      </span>
                    </div>

                    <form className={styles.formGrid} onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
                      <div className={styles.field}>
                        <label htmlFor="profile-name">Ad soyad</label>
                        <input
                          id="profile-name"
                          className="input"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          autoComplete="name"
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="profile-email">E-posta</label>
                        <input
                          id="profile-email"
                          className={`input ${styles.inputDisabled}`}
                          value={user.email}
                          disabled
                          readOnly
                          autoComplete="email"
                        />
                        <p className={styles.fieldHint}>Değişiklik için müşteri hizmetleri ile iletişime geçebilirsiniz.</p>
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="profile-phone">
                          <Phone size={12} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} />
                          Telefon
                        </label>
                        <input
                          id="profile-phone"
                          className="input"
                          value={phone ?? ""}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="5xx xxx xx xx"
                          autoComplete="tel"
                        />
                      </div>

                      {error ? <p className={styles.alertErr}>{error}</p> : null}
                      {success ? <p className={styles.alertOk}>{success}</p> : null}

                      <div className={styles.formActions}>
                        <button
                          type="submit"
                          className={`btn-primary ${styles.saveBtn}`}
                          disabled={saving || mutation.isPending}
                        >
                          {saving || mutation.isPending ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
