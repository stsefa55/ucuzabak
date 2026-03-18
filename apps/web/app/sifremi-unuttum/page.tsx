import Link from "next/link";
import { Header } from "../../src/components/layout/Header";

export default function SifremiUnuttumPage() {
  return (
    <>
      <Header />
      <main className="main auth-page">
        <div className="auth-page__inner">
          <div className="auth-card">
            <div className="auth-card__header">
              <div className="auth-card__icon" aria-hidden>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </div>
              <h1 className="auth-card__title">Şifremi unuttum</h1>
              <p className="auth-card__subtitle">
                E-posta adresinizi girin, size şifre sıfırlama bağlantısı göndereceğiz.
              </p>
            </div>
            <p className="text-muted" style={{ fontSize: "0.9rem", textAlign: "center", padding: "0 0.5rem" }}>
              Bu özellik yakında eklenecektir. Şimdilik lütfen yöneticinizle iletişime geçin.
            </p>
            <p className="auth-card__footer">
              <Link href="/giris" className="auth-card__link">Giriş sayfasına dön</Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
