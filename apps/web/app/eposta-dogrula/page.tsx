import { Suspense } from "react";
import { Header } from "../../src/components/layout/Header";
import { VerifyEmailForm } from "../../src/components/auth/VerifyEmailForm";

export const metadata = {
  title: "E-posta doğrula — UcuzaBak"
};

function VerifyEmailFallback() {
  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <h1 className="auth-card__title">E-posta doğrulama</h1>
        <p className="auth-card__subtitle">Yükleniyor…</p>
      </div>
    </div>
  );
}

export default function EpostaDogrulaPage() {
  return (
    <>
      <Header />
      <main className="main auth-page">
        <div className="auth-page__inner">
          <Suspense fallback={<VerifyEmailFallback />}>
            <VerifyEmailForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}
