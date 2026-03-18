import { Header } from "../../src/components/layout/Header";
import { RegisterForm } from "../../src/components/auth/AuthForms";

export default function RegisterPage() {
  return (
    <>
      <Header />
      <main className="main auth-page">
        <div className="auth-page__inner">
          <RegisterForm />
        </div>
      </main>
    </>
  );
}

