"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useState } from "react";
import { apiFetch } from "../../lib/api-client";

/** Sunucu ile aynı metin; enumerasyon güvenli başarı yanıtı. */
const FORGOT_PASSWORD_GENERIC_SUCCESS =
  "Eğer bu e-posta adresi sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.";

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

function IconEyeOpen() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

type PasswordFieldWithRevealProps = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  autoFocus?: boolean;
  disabled?: boolean;
};

function PasswordFieldWithReveal({
  id,
  label,
  value,
  onChange,
  autoComplete,
  autoFocus,
  disabled
}: PasswordFieldWithRevealProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-form__field">
      <label htmlFor={id} className="auth-form__label">
        {label}
      </label>
      <div className="auth-form__password-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className="auth-form__input"
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={8}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
        />
        <button
          type="button"
          className="auth-form__password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
          aria-pressed={visible}
          disabled={disabled}
        >
          {visible ? <IconEyeOff /> : <IconEyeOpen />}
        </button>
      </div>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      return apiFetch<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() }
      });
    },
    onSuccess: (data) => {
      setValidationError(null);
      setDone(true);
      setServerMessage(data?.message ?? FORGOT_PASSWORD_GENERIC_SUCCESS);
    },
    onError: (err: unknown) => {
      const status = (err as { status?: number })?.status;
      if (status === 400) {
        setValidationError(parseNestErrorMessage(err));
        setDone(false);
        return;
      }
      if (status === 429) {
        setValidationError("Çok sık deneme yaptınız. Lütfen bir süre sonra tekrar deneyin.");
        setDone(false);
        return;
      }
      setValidationError(null);
      setDone(true);
      setServerMessage(FORGOT_PASSWORD_GENERIC_SUCCESS);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerMessage(null);
    setValidationError(null);
    mutation.mutate();
  };

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <div className="auth-card__icon" aria-hidden>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="auth-card__title">Şifremi unuttum</h1>
        <p className="auth-card__subtitle">
          E-posta adresinizi girin. Talimatlar gönderimden sonra aşağıda gösterilir.
        </p>
      </div>

      {done && serverMessage ? (
        <div className="auth-form">
          <p className="auth-form__success" role="status" style={{ margin: 0, lineHeight: 1.55 }}>
            {serverMessage}
          </p>
          <p className="auth-card__footer" style={{ marginTop: "1.25rem" }}>
            <Link href="/giris" className="auth-card__link">
              Giriş sayfasına dön
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form" aria-busy={mutation.isPending} noValidate>
          <div className="auth-form__field">
            <label htmlFor="forgot-email" className="auth-form__label">
              E-posta
            </label>
            <input
              id="forgot-email"
              type="email"
              className="auth-form__input"
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              disabled={mutation.isPending}
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? "forgot-email-error" : undefined}
            />
          </div>
          {validationError && (
            <p id="forgot-email-error" className="auth-form__error" role="alert">
              {validationError}
            </p>
          )}
          <button type="submit" className="auth-form__submit" disabled={mutation.isPending || !email.trim()}>
            {mutation.isPending ? "Gönderiliyor..." : "Bağlantı gönder"}
          </button>
        </form>
      )}

      {!done && (
        <p className="auth-card__footer">
          <Link href="/giris" className="auth-card__link">
            Giriş sayfasına dön
          </Link>
        </p>
      )}
    </div>
  );
}

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      return apiFetch<{ success: boolean }>("/auth/reset-password", {
        method: "POST",
        body: { token, newPassword: password }
      });
    },
    onSuccess: () => {
      setSuccess(true);
      setError(null);
    },
    onError: (err) => {
      setError(parseNestErrorMessage(err));
    }
  });

  const pending = mutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!STRONG_PASSWORD.test(password)) {
      setError("Şifre en az 8 karakter olmalı; en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    mutation.mutate();
  };

  if (!token) {
    return (
      <div className="auth-card">
        <div className="auth-card__header">
          <h1 className="auth-card__title">Şifre sıfırlama</h1>
          <p className="auth-card__subtitle">Bağlantı geçersiz veya eksik.</p>
        </div>
        <p className="auth-form__error" role="alert">
          Şifre sıfırlama bağlantısı geçerli değil. E-postadaki bağlantıyı kullanın veya yeni bir talepte bulunun.
        </p>
        <p className="auth-card__footer">
          <Link href="/sifremi-unuttum" className="auth-card__link">
            Yeni bağlantı iste
          </Link>
          {" · "}
          <Link href="/giris" className="auth-card__link">
            Giriş
          </Link>
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__icon" aria-hidden>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="auth-card__title">Şifreniz başarıyla güncellendi</h1>
          <p className="auth-card__subtitle">Yeni şifrenizle giriş yapabilirsiniz.</p>
        </div>
        <div style={{ marginTop: "1.25rem" }}>
          <Link href="/giris" className="auth-form__submit" style={{ display: "flex", justifyContent: "center", width: "100%", boxSizing: "border-box" }}>
            Giriş sayfasına git
          </Link>
        </div>
      </div>
    );
  }

  const canSubmit =
    !pending &&
    password.length >= 8 &&
    password === passwordConfirm &&
    STRONG_PASSWORD.test(password);

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <div className="auth-card__icon" aria-hidden>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15v2M6 20h12a2 2 0 0 0 1.8-2.8l-1-2A2 2 0 0 0 18 14h-2.5" />
            <path d="M6 8V6a6 6 0 0 1 12 0v2" />
          </svg>
        </div>
        <h1 className="auth-card__title">Yeni şifre belirle</h1>
        <p className="auth-card__subtitle">Hesabınız için güçlü bir şifre seçin.</p>
      </div>
      <form onSubmit={handleSubmit} className="auth-form" aria-busy={pending} noValidate>
        <PasswordFieldWithReveal
          id="reset-password"
          label="Yeni şifre"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          autoFocus
          disabled={pending}
        />
        <PasswordFieldWithReveal
          id="reset-password-confirm"
          label="Yeni şifre (tekrar)"
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          autoComplete="new-password"
          disabled={pending}
        />
        {passwordConfirm.length > 0 && password !== passwordConfirm && (
          <p className="auth-form__hint auth-form__hint--error">Şifreler eşleşmiyor.</p>
        )}
        <ul className="auth-form__password-rules" aria-live="polite">
          <li className={password.length >= 8 ? "auth-form__password-rule--ok" : ""}>
            {password.length >= 8 ? "✓" : "o"} En az 8 karakter
          </li>
          <li className={/[A-Z]/.test(password) ? "auth-form__password-rule--ok" : ""}>
            {/[A-Z]/.test(password) ? "✓" : "o"} En az bir büyük harf
          </li>
          <li className={/[a-z]/.test(password) ? "auth-form__password-rule--ok" : ""}>
            {/[a-z]/.test(password) ? "✓" : "o"} En az bir küçük harf
          </li>
          <li className={/\d/.test(password) ? "auth-form__password-rule--ok" : ""}>
            {/\d/.test(password) ? "✓" : "o"} En az bir rakam
          </li>
        </ul>
        {error && (
          <p className="auth-form__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="auth-form__submit" disabled={!canSubmit}>
          {pending ? "Kaydediliyor..." : "Şifreyi güncelle"}
        </button>
      </form>
      <p className="auth-card__footer">
        <Link href="/giris" className="auth-card__link">
          Giriş sayfasına dön
        </Link>
      </p>
    </div>
  );
}
