"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { apiFetch } from "../../lib/api-client";
import { useAuthStore, type UserInfo } from "../../stores/auth-store";

function parseNestErrorMessage(err: unknown): string {
  const e = err as { message?: string; status?: number };
  const raw = typeof e?.message === "string" ? e.message : "";
  try {
    const body = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(body.message)) return String(body.message[0] ?? "İşlem başarısız.");
    if (typeof body.message === "string") return body.message;
  } catch {
    if (raw && !raw.startsWith("{")) return raw;
  }
  return "İşlem başarısız oldu. Lütfen tekrar deneyin.";
}

type VerifyResponse = { success: true; message: string };

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");
  const attempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("err");
      setMessage("Doğrulama bağlantısı eksik veya geçersiz.");
      return;
    }
    if (attempted.current) return;
    attempted.current = true;
    setStatus("loading");

    void (async () => {
      try {
        const res = await apiFetch<VerifyResponse>("/auth/verify-email", {
          method: "POST",
          body: { token }
        });
        setStatus("ok");
        setMessage(res.message);
        const { accessToken, setSession } = useAuthStore.getState();
        if (accessToken) {
          try {
            const me = await apiFetch<{ user: Record<string, unknown> }>("/auth/me", { accessToken });
            if (me.user) setSession(accessToken, me.user as unknown as UserInfo);
          } catch {
            // oturum güncellenemese bile doğrulama başarılı
          }
        }
      } catch (err: unknown) {
        setStatus("err");
        setMessage(parseNestErrorMessage(err));
      }
    })();
  }, [token]);

  if (status === "loading" || status === "idle") {
    return (
      <div className="auth-card">
        <div className="verify-email-result">
          <div className="verify-email-result__icon-wrap verify-email-result__icon-wrap--pending">
            <Loader2 size={36} strokeWidth={2} className="verify-email-result__spinner" aria-hidden />
          </div>
          <h1 className="verify-email-result__title">E-postanız doğrulanıyor</h1>
          <p className="verify-email-result__message">
            Bağlantınız güvenli şekilde kontrol ediliyor. Lütfen bu sayfayı kapatmayın.
          </p>
        </div>
      </div>
    );
  }

  if (status === "ok") {
    return (
      <div className="auth-card">
        <div className="verify-email-result">
          <div className="verify-email-result__icon-wrap" aria-hidden>
            <CheckCircle2 size={40} strokeWidth={2} />
          </div>
          <h1 className="verify-email-result__title">E-postanız doğrulandı</h1>
          <p className="verify-email-result__message">
            {message || "Artık fiyat alarmlarını kullanabilir ve hesap özelliklerinize tam erişebilirsiniz."}
          </p>
          <div className="verify-email-result__actions">
            <Link href="/" className="verify-email-result__btn">
              Ana sayfaya dön
            </Link>
            <Link href="/profil" className="verify-email-result__btn verify-email-result__btn-secondary">
              Hesabıma git
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="verify-email-result">
        <div className="verify-email-result__icon-wrap verify-email-result__icon-wrap--error" aria-hidden>
          <XCircle size={40} strokeWidth={2} />
        </div>
        <h1 className="verify-email-result__title">Doğrulama tamamlanamadı</h1>
        <p className="verify-email-result__message">{message}</p>
        <div className="verify-email-result__actions">
          <Link href="/" className="verify-email-result__btn">
            Ana sayfaya dön
          </Link>
          {token ? (
            <Link href="/giris" className="verify-email-result__btn verify-email-result__btn-secondary">
              Giriş yap
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
