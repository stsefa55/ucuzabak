"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
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
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
          gap: "0.75rem"
        }}
      >
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Ürünler</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            className="form-control"
            placeholder="Ad veya slug ile ara..."
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
      </div>

      {isLoading && <p>Yükleniyor...</p>}
      {error && <p className="text-danger">Ürünler yüklenirken bir hata oluştu.</p>}
      {data && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>ID</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Ad</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Slug</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Marka</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Kategori</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Durum</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Oluşturulma</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: "0.5rem" }}>{p.id}</td>
                <td style={{ padding: "0.5rem" }}>{p.name}</td>
                <td style={{ padding: "0.5rem" }}>{p.slug}</td>
                <td style={{ padding: "0.5rem" }}>{p.brand?.name ?? "-"}</td>
                <td style={{ padding: "0.5rem" }}>{p.category?.name ?? "-"}</td>
                <td style={{ padding: "0.5rem" }}>{p.status === "ACTIVE" ? "Aktif" : "Pasif"}</td>
                <td style={{ padding: "0.5rem" }}>
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString("tr-TR") : "-"}
                </td>
                <td style={{ padding: "0.5rem", textAlign: "right" }}>
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
      )}
    </div>
  );
}

