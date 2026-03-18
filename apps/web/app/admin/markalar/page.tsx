"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

export default function AdminBrandsPage() {
  const { accessToken } = useAuthStore();

  const { data, isLoading, error } = useQuery<any[]>({
    queryKey: ["admin-brands"],
    queryFn: () => apiFetch<any[]>("/admin/brands", { accessToken }),
    enabled: !!accessToken
  });

  if (!accessToken) return null;

  return (
    <div className="card">
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Markalar</h2>
      {isLoading && <p>Yükleniyor...</p>}
      {error && <p className="text-danger">Markalar yüklenirken bir hata oluştu.</p>}
      {data && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>ID</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Marka</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Slug</th>
            </tr>
          </thead>
          <tbody>
            {data.map((b) => (
              <tr key={b.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: "0.5rem" }}>{b.id}</td>
                <td style={{ padding: "0.5rem" }}>{b.name}</td>
                <td style={{ padding: "0.5rem" }}>{b.slug}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

