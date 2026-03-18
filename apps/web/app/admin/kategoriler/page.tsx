"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

export default function AdminCategoriesPage() {
  const { accessToken } = useAuthStore();

  const { data, isLoading, error } = useQuery<any[]>({
    queryKey: ["admin-categories"],
    queryFn: () => apiFetch<any[]>("/admin/categories", { accessToken }),
    enabled: !!accessToken
  });

  if (!accessToken) return null;

  return (
    <div className="card">
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Kategoriler</h2>
      {isLoading && <p>Yükleniyor...</p>}
      {error && <p className="text-danger">Kategoriler yüklenirken bir hata oluştu.</p>}
      {data && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>ID</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Kategori</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Slug</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Üst kategori</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: "0.5rem" }}>{c.id}</td>
                <td style={{ padding: "0.5rem" }}>{c.name}</td>
                <td style={{ padding: "0.5rem" }}>{c.slug}</td>
                <td style={{ padding: "0.5rem" }}>{c.parentId ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

