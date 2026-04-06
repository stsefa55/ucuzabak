"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

interface AdminListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminProductsPage() {
  const { accessToken } = useAuthStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const { data, isLoading, error } = useQuery<AdminListResponse<any>>({
    queryKey: ["admin-products", search, status],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "50");
      if (search.trim()) params.set("q", search.trim());
      if (status !== "ALL") params.set("status", status);

      return apiFetch<AdminListResponse<any>>(`/admin/products?${params.toString()}`, {
        accessToken
      });
    },
    enabled: !!accessToken
  });

  if (!accessToken) return null;

  return (
    <div className="card admin-page">
      <AdminPageHeader
        title="Ürünler"
        description="Katalog ürünlerini arayın ve duruma göre filtreleyin."
        actions={
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
            <input
              className="form-control"
              placeholder="Ad veya slug ile ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 180 }}
            />
            <select
              className="form-control"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              style={{ width: 140 }}
            >
              <option value="ALL">Tüm durumlar</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Pasif</option>
            </select>
          </div>
        }
      />

      {isLoading && <p className="admin-loading" style={{ padding: "1rem 0" }}>Yükleniyor…</p>}
      {error && <p className="text-danger">Ürünler yüklenirken bir hata oluştu.</p>}
      {data && (
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ad</th>
                <th>Slug</th>
                <th>Marka</th>
                <th>Kategori</th>
                <th>Durum</th>
                <th>Oluşturulma</th>
                <th style={{ textAlign: "right" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>{p.slug}</td>
                  <td>{p.brand?.name ?? "—"}</td>
                  <td>{p.category?.name ?? "—"}</td>
                  <td>{p.status === "ACTIVE" ? "Aktif" : "Pasif"}</td>
                  <td>{p.createdAt ? new Date(p.createdAt).toLocaleDateString("tr-TR") : "—"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <Link
                    href={`/admin/urunler/${p.id}`}
                    className="btn-ghost btn-sm"
                    style={{ marginRight: 6 }}
                  >
                    Düzenle
                  </Link>
                  <a
                    href={`/urun/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost btn-sm"
                  >
                    Storefront’ta gör
                  </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

