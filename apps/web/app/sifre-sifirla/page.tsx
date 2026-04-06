import { Suspense } from "react";
import { Header } from "../../src/components/layout/Header";
import { ResetPasswordForm } from "../../src/components/auth/PasswordResetForms";

export const metadata = {
  title: "Şifre sıfırla — UcuzaBak"
};

function ResetPasswordFallback() {
  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <h1 className="auth-card__title">Şifre sıfırlama</h1>
        <p className="auth-card__subtitle">Yükleniyor…</p>
      </div>
    </div>
  );
}

export default function SifreSifirlaPage() {
  return (
    <>
      <Header />
      <main className="main auth-page">
        <div className="auth-page__inner">
          <Suspense fallback={<ResetPasswordFallback />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}
