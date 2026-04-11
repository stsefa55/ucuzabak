import { Suspense } from "react";
import { Header } from "../../src/components/layout/Header";
import { EmailChangeConfirmForm } from "../../src/components/auth/EmailChangeConfirmForm";

export const metadata = {
  title: "E-posta değişikliğini onayla | UcuzaBak.com"
};

export default function EmailChangeConfirmPage() {
  return (
    <>
      <Header />
      <main className="main auth-page">
        <div className="auth-page__inner">
          <Suspense
            fallback={
              <div className="auth-card">
                <p className="text-muted" style={{ textAlign: "center" }}>
                  Yükleniyor…
                </p>
              </div>
            }
          >
            <EmailChangeConfirmForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}
