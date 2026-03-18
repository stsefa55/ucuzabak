"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../stores/auth-store";

export function LoginForm() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      return apiFetch<{ user: any; accessToken: string }>("/auth/login", {
        method: "POST",
        body: { email, password }
      });
    },
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
      if (data.user?.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    },
    onError: (err: any) => {
      if (err?.status === 401) {
        setError("E-posta veya şifre hatalı.");
      } else {
        setError("Giriş başarısız oldu. Lütfen tekrar deneyin.");
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  };

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <div className="auth-card__icon" aria-hidden>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </div>
        <h1 className="auth-card__title">Giriş yap</h1>
        <p className="auth-card__subtitle">
          Favorilerinizi ve fiyat alarmlarınızı yönetmek için hesabınıza giriş yapın.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-form__field">
          <label htmlFor="email" className="auth-form__label">E-posta</label>
          <input
            id="email"
            type="email"
            className="auth-form__input"
            placeholder="ornek@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="auth-form__field">
          <div className="auth-form__label-row">
            <label htmlFor="password" className="auth-form__label">Şifre</label>
            <Link href="/sifremi-unuttum" className="auth-form__forgot">Şifreni unuttum?</Link>
          </div>
          <input
            id="password"
            type="password"
            className="auth-form__input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <p className="auth-form__error" role="alert">{error}</p>
        )}
        <button type="submit" className="auth-form__submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Giriş yapılıyor..." : "Giriş yap"}
        </button>
      </form>
      <p className="auth-card__footer">
        Hesabınız yok mu? <Link href="/kayit" className="auth-card__link">Kayıt ol</Link>
      </p>
    </div>
  );
}

const REGISTER_STEPS = [
  { key: "email", title: "E-posta", subtitle: "Hesabınıza giriş için kullanacağınız e-posta adresi." },
  { key: "name", title: "Ad ve soyad", subtitle: "Size nasıl hitap edelim?" },
  { key: "birthDate", title: "Doğum tarihi", subtitle: "Doğum tarihinizi seçin." },
  { key: "phone", title: "Telefon", subtitle: "İsteğe bağlı. Size ulaşmak için kullanacağız." },
  { key: "password", title: "Şifre", subtitle: "En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam." }
] as const;

export function RegisterForm() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const formatPhone = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 4) return d;
    if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
    if (d.length <= 9) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      return apiFetch<{ user: any; accessToken: string }>("/auth/register", {
        method: "POST",
        body: {
          email,
          name,
          password,
          phone: phone.replace(/\D/g, "").trim() || undefined,
          birthDate: birthDate || undefined
        }
      });
    },
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
      router.push("/");
    },
    onError: (err: any) => {
      let msg = "Kayıt başarısız oldu.";
      try {
        const body = typeof err?.message === "string" ? JSON.parse(err.message) : null;
        if (body?.message) msg = Array.isArray(body.message) ? body.message[0] : body.message;
      } catch {
        if (err?.message && typeof err.message === "string" && !err.message.startsWith("{"))
          msg = err.message;
      }
      setError(msg);
    }
  });

  const totalSteps = REGISTER_STEPS.length;
  const currentStepInfo = REGISTER_STEPS[step - 1];
  const isLastStep = step === totalSteps;

  const goNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isLastStep) {
      mutation.mutate();
      return;
    }
    if (step === 1) {
      setIsCheckingEmail(true);
      try {
        const res = await apiFetch<{ available: boolean }>(
          `/auth/check-email?email=${encodeURIComponent(email.trim())}`
        );
        if (!res.available) {
          setError("Bu e-posta adresi zaten kayıtlı.");
          return;
        }
        setStep(2);
      } catch {
        setError("E-posta kontrolü yapılamadı. Lütfen tekrar deneyin.");
      } finally {
        setIsCheckingEmail(false);
      }
    } else {
      setStep((s) => Math.min(s + 1, totalSteps));
    }
  };

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      case 2:
        return firstName.trim().length >= 2 && lastName.trim().length >= 2;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return (
          password.length >= 8 &&
          /[a-z]/.test(password) &&
          /[A-Z]/.test(password) &&
          /\d/.test(password) &&
          password === passwordConfirm
        );
      default:
        return false;
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <div className="auth-card__icon" aria-hidden>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h1 className="auth-card__title">Kayıt ol</h1>
        <p className="auth-card__subtitle">{currentStepInfo.subtitle}</p>
        <div className="auth-steps" aria-label="Adım">
          <span className="auth-steps__current">{step}</span>
          <span className="auth-steps__sep">/</span>
          <span className="auth-steps__total">{totalSteps}</span>
        </div>
      </div>
      <form onSubmit={goNext} className="auth-form">
        {step === 1 && (
          <div className="auth-form__field">
            <label htmlFor="register-email" className="auth-form__label">E-posta</label>
            <input
              id="register-email"
              type="email"
              className="auth-form__input"
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
        )}
        {step === 2 && (
          <>
            <div className="auth-form__field">
              <label htmlFor="register-firstName" className="auth-form__label">Ad</label>
              <input
                id="register-firstName"
                type="text"
                className="auth-form__input"
                placeholder="Adınız"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                minLength={2}
                autoFocus
              />
            </div>
            <div className="auth-form__field">
              <label htmlFor="register-lastName" className="auth-form__label">Soyad</label>
              <input
                id="register-lastName"
                type="text"
                className="auth-form__input"
                placeholder="Soyadınız"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                minLength={2}
              />
            </div>
          </>
        )}
        {step === 3 && (
          <div className="auth-form__field auth-form__field--date">
            <label htmlFor="register-birthDate" className="auth-form__label">Doğum tarihi</label>
            <input
              id="register-birthDate"
              type="date"
              className="auth-form__input"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              autoFocus
            />
          </div>
        )}
        {step === 4 && (
          <div className="auth-form__field">
            <label htmlFor="register-phone" className="auth-form__label">Telefon (isteğe bağlı)</label>
            <input
              id="register-phone"
              type="tel"
              className="auth-form__input"
              placeholder="05XX XXX XX XX"
              value={phone}
              onChange={handlePhoneChange}
              inputMode="numeric"
              autoComplete="tel"
              autoFocus
            />
          </div>
        )}
        {step === 5 && (
          <>
            <div className="auth-form__field">
              <label htmlFor="register-password" className="auth-form__label">Şifre</label>
              <input
                id="register-password"
                type="password"
                className="auth-form__input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
              />
            </div>
            <div className="auth-form__field">
              <label htmlFor="register-passwordConfirm" className="auth-form__label">Şifre tekrar</label>
              <input
                id="register-passwordConfirm"
                type="password"
                className="auth-form__input"
                placeholder="••••••••"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={8}
              />
              {passwordConfirm && password !== passwordConfirm && (
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
            </div>
          </>
        )}
        {error && (
          <p className="auth-form__error" role="alert">{error}</p>
        )}
        <div className="auth-form__actions">
          {step > 1 && (
            <button type="button" className="auth-form__back" onClick={goBack} aria-label="Geri">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <button
            type="submit"
            className="auth-form__submit"
            disabled={!canProceed() || mutation.isPending || isCheckingEmail}
          >
            {mutation.isPending
              ? "Kayıt yapılıyor..."
              : isCheckingEmail
                ? "Kontrol ediliyor..."
                : isLastStep
                  ? "Kayıt ol"
                  : "İleri"}
          </button>
        </div>
      </form>
      <p className="auth-card__footer">
        Zaten hesabınız var mı? <Link href="/giris" className="auth-card__link">Giriş yapın</Link>
      </p>
    </div>
  );
}

