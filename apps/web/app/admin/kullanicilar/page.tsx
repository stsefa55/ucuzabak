"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

interface AdminUsersResponse {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminUsersPage() {
  const { accessToken } = useAuthStore();

  const { data, isLoading, error } = useQuery<AdminUsersResponse>({
    queryKey: ["admin-users"],
    queryFn: () =>
      apiFetch<AdminUsersResponse>("/admin/users?page=1&pageSize=50", {
        accessToken
      }),
    enabled: !!accessToken
  });

  if (!accessToken) return null;

  return (
    <div className="card">
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Kullanıcılar</h2>
      {isLoading && <p>Yükleniyor...</p>}
      {error && <p className="text-danger">Kullanıcılar yüklenirken bir hata oluştu.</p>}
      {data && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>ID</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>İsim</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>E-posta</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Rol</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Durum</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Son giriş</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: "0.5rem" }}>{u.id}</td>
                <td style={{ padding: "0.5rem" }}>{u.name}</td>
                <td style={{ padding: "0.5rem" }}>{u.email}</td>
                <td style={{ padding: "0.5rem" }}>{u.role}</td>
                <td style={{ padding: "0.5rem" }}>{u.status}</td>
                <td style={{ padding: "0.5rem" }}>
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("tr-TR") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

