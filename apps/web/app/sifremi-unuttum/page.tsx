import { Header } from "../../src/components/layout/Header";
import { ForgotPasswordForm } from "../../src/components/auth/PasswordResetForms";

export const metadata = {
  title: "Şifremi unuttum — UcuzaBak"
};

export default function SifremiUnuttumPage() {
  return (
    <>
      <Header />
      <main className="main auth-page">
        <div className="auth-page__inner">
          <ForgotPasswordForm />
        </div>
      </main>
    </>
  );
}
