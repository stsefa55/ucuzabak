"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { Header } from "../../src/components/layout/Header";
import { AdminSidebar } from "../../src/components/admin/AdminSidebar";
import { useAuthStore } from "../../src/stores/auth-store";
import "./admin-layout.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();

  if (!user) {
    return (
      <>
        <Header />
        <main className="main">
          <div className="container">
            <div className="admin-gate">
              <p className="text-muted" style={{ marginBottom: "0.75rem" }}>
                Admin alanına erişmek için giriş yapmanız gerekiyor.
              </p>
              <button type="button" className="btn-primary" onClick={() => router.push("/giris")}>
                Giriş yap
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <>
        <Header />
        <main className="main">
          <div className="container">
            <div className="admin-gate">
              <p className="text-danger" style={{ marginBottom: "0.75rem" }}>
                Bu alana erişim yetkiniz yok.
              </p>
              <button type="button" className="btn-secondary" onClick={() => router.push("/")}>
                Anasayfaya dön
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="main">
        <div className="container admin-shell">
          <AdminSidebar />
          <section className="admin-content">{children}</section>
        </div>
      </main>
    </>
  );
}

