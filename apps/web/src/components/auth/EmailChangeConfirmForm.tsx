"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { apiFetch } from "../../lib/api-client";

type Phase = "loading" | "ok" | "err";

export function EmailChangeConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token || token.length < 20) {
      setPhase("err");
      setMessage("Geçersiz veya eksik bağlantı.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<{ success: boolean; message: string }>("/auth/confirm-email-change", {
          method: "POST",
          body: { token }
        });
        if (cancelled) return;
        setPhase("ok");
        setMessage(res.message);
      } catch (e: unknown) {
        if (cancelled) return;
        setPhase("err");
        const raw = e && typeof e === "object" && "message" in e ? String((e as { message?: string }).message) : "";
        try {
          const j = JSON.parse(raw) as { message?: string | string[] };
          const m = Array.isArray(j.message) ? j.message[0] : j.message;
          setMessage(m || "Onay tamamlanamadı.");
        } catch {
          setMessage(raw && !raw.startsWith("{") ? raw : "Onay tamamlanamadı.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (phase === "loading") {
    return (
      <div className="auth-card">
        <div className="verify-email-result">
          <div className="verify-email-result__icon-wrap verify-email-result__icon-wrap--pending">
            <Loader2 size={36} strokeWidth={2} className="verify-email-result__spinner" aria-hidden />
          </div>
          <h1 className="verify-email-result__title">E-posta değişikliği onaylanıyor</h1>
          <p className="verify-email-result__message">Lütfen bekleyin…</p>
        </div>
      </div>
    );
  }

  if (phase === "ok") {
    return (
      <div className="auth-card">
        <div className="verify-email-result">
          <div className="verify-email-result__icon-wrap" aria-hidden>
            <CheckCircle2 size={40} strokeWidth={1.8} />
          </div>
          <h1 className="verify-email-result__title">Tamamlandı</h1>
          <p className="verify-email-result__message">{message}</p>
          <div className="verify-email-result__actions">
            <Link href="/giris" className="verify-email-result__btn">
              Giriş yap
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
          <XCircle size={40} strokeWidth={1.8} />
        </div>
        <h1 className="verify-email-result__title">Onaylanamadı</h1>
        <p className="verify-email-result__message">{message}</p>
        <div className="verify-email-result__actions">
          <Link href="/profil" className="verify-email-result__btn verify-email-result__btn-secondary">
            Hesabım
          </Link>
          <Link href="/" className="verify-email-result__btn">
            Anasayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
