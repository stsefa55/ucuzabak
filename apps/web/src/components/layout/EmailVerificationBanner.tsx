"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../stores/auth-store";

export function EmailVerificationBanner() {
  const { user, accessToken } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!user || !accessToken) return null;
  if (user.emailVerified !== false) return null;

  const handleResend = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ message: string }>("/auth/me/resend-verification-email", {
        method: "POST",
        accessToken
      });
      setMsg(res.message);
    } catch {
      setMsg("İstek gönderilemedi. Lütfen bir süre sonra tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="email-verify-banner" role="region" aria-label="E-posta doğrulama uyarısı">
      <div className="container email-verify-banner__inner">
        <div className="email-verify-banner__text">
          <span className="email-verify-banner__icon" aria-hidden>
            <AlertCircle size={22} strokeWidth={2} />
          </span>
          <div>
            <strong className="email-verify-banner__title">E-postanız henüz doğrulanmadı</strong>
            <p className="email-verify-banner__desc">
              Fiyat alarmı oluşturmak veya güncellemek için gelen kutunuzdaki bağlantıyı açmanız gerekir.{" "}
              <Link href="/profil" className="email-verify-banner__link">
                Hesabım
              </Link>{" "}
              sayfasından durumu görebilir veya aşağıdan doğrulama e-postasını yeniden isteyebilirsiniz.
            </p>
            {msg ? <p className="email-verify-banner__feedback">{msg}</p> : null}
          </div>
        </div>
        <div className="email-verify-banner__actions">
          <button type="button" className="btn-secondary email-verify-banner__btn" disabled={busy} onClick={handleResend}>
            {busy ? "Gönderiliyor…" : "Doğrulama e-postasını tekrar gönder"}
          </button>
        </div>
      </div>
    </div>
  );
}
