import { Header } from "../../src/components/layout/Header";
import { LoginForm } from "../../src/components/auth/AuthForms";

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="main auth-page">
        <div className="auth-page__inner">
          <LoginForm />
        </div>
      </main>
    </>
  );
}

