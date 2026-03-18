"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "../../src/components/layout/Header";
import { apiFetch } from "../../src/lib/api-client";
import { useAuthStore } from "../../src/stores/auth-store";

export default function ProfilePage() {
  const router = useRouter();
  const { user, accessToken, setSession } = useAuthStore();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("UNAUTHENTICATED");
      const payload: { name?: string; phone?: string } = {};
      if (name && name !== user?.name) payload.name = name;
      if (phone !== (user?.phone ?? "")) payload.phone = phone || undefined;
      return apiFetch<{ user: any }>("/auth/me", {
        method: "PATCH",
        body: payload,
        accessToken
      });
    },
    onSuccess: (data) => {
      if (accessToken && data.user) {
        setSession(accessToken, data.user);
      }
      setSuccess("Profiliniz güncellendi.");
    },
    onError: (err: any) => {
      setError(err?.message || "Profil güncellenirken bir hata oluştu.");
    },
    onSettled: () => {
      setSaving(false);
    }
  });

  if (!user) {
    router.push("/giris");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    mutation.mutate();
  };

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "1rem" }}>Hesabım</h1>
          <div className="card" style={{ maxWidth: "480px" }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Adınız</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>E-posta</label>
                <input className="input" value={user.email} disabled />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Telefon
                </label>
                <input
                  className="input"
                  value={phone ?? ""}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5xx xxx xx xx"
                />
              </div>
              {error && (
                <p className="text-danger" style={{ fontSize: "0.85rem" }}>
                  {error}
                </p>
              )}
              {success && (
                <p className="text-success" style={{ fontSize: "0.85rem" }}>
                  {success}
                </p>
              )}
              <button type="submit" className="btn-primary" disabled={saving || mutation.isPending}>
                {saving || mutation.isPending ? "Kaydediliyor..." : "Profili kaydet"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}


