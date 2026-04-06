"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

type BrandRow = { id: number; name: string; slug: string };

export default function AdminBrandsPage() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<BrandRow[]>({
    queryKey: ["admin-brands"],
    queryFn: () => apiFetch<BrandRow[]>("/admin/brands", { accessToken }),
    enabled: !!accessToken
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<BrandRow>("/admin/brands", {
        method: "POST",
        accessToken,
        body: {
          name: name.trim(),
          ...(slug.trim() ? { slug: slug.trim() } : {})
        }
      }),
    onSuccess: () => {
      setName("");
      setSlug("");
      setCreateError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    },
    onError: (e: Error & { status?: number }) => {
      setCreateError(e.message || "Oluşturulamadı");
    }
  });

  if (!accessToken) return null;

  return (
    <div className="card admin-page">
      <AdminPageHeader
        title="Markalar"
        description={
          <>
            Canonical markalar. Feed ile <strong>sıkı eşleşme</strong> için adın feed’deki metne uygun olması gerekir
            (örn. «Philips»). Son importta eşleşmeyen metinler için{" "}
            <Link href="/admin/import-review" style={{ fontWeight: 600 }}>
              Import inceleme
            </Link>{" "}
            sayfasına bakın. Toplu eklemek için{" "}
            <Link href="/admin/markalar/import" style={{ fontWeight: 600 }}>
              Toplu marka içe aktarma
            </Link>
            .
          </>
        }
      />

      <p style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Link href="/admin/markalar/import" className="btn-secondary" style={{ display: "inline-block" }}>
          Toplu marka içe aktar (CSV / metin)
        </Link>
        <Link href="/admin/markalar/oneriler" className="btn-secondary" style={{ display: "inline-block" }}>
          Marka önerileri (feed + onay)
        </Link>
      </p>

      <div className="admin-panel" style={{ marginBottom: "1.25rem" }}>
        <h2 className="admin-panel__title">Tekil marka ekle</h2>
        <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "0.65rem" }}>
          Hızlı tek kayıt. Jenerik ifadeleri marka olarak eklemeyin.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: "200px" }}>
            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
              Marka adı
            </span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="örn. Philips"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: "160px" }}>
            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
              Slug (isteğe bağlı)
            </span>
            <input
              className="input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="philips"
            />
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={createMutation.isPending || name.trim().length < 2}
            onClick={() => {
              setCreateError(null);
              createMutation.mutate();
            }}
          >
            Oluştur
          </button>
        </div>
        {createError && <p className="text-danger" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>{createError}</p>}
        {createMutation.isSuccess && (
          <p className="text-muted" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            Kayıt eklendi. Mevcut ürünler için Import inceleme → backfill kullanın.
          </p>
        )}
      </div>

      {isLoading && <p className="admin-loading" style={{ padding: "0.5rem 0" }}>Yükleniyor…</p>}
      {error && <p className="text-danger">Markalar yüklenirken bir hata oluştu.</p>}
      {data && (
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Marka</th>
                <th>Slug</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.name}</td>
                  <td>{b.slug}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
