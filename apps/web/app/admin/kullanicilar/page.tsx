"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  marketingEmailOptIn?: boolean;
  marketingEmailOptOutAt?: string | null;
};

interface AdminUsersResponse {
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminUsersPage() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<AdminUsersResponse>({
    queryKey: ["admin-users"],
    queryFn: () =>
      apiFetch<AdminUsersResponse>("/admin/users?page=1&pageSize=50", {
        accessToken
      }),
    enabled: !!accessToken
  });

  const prefMut = useMutation({
    mutationFn: async ({ id, marketingEmailOptIn }: { id: number; marketingEmailOptIn: boolean }) => {
      await apiFetch(`/admin/users/${id}/email-preferences`, {
        method: "PATCH",
        accessToken,
        body: { marketingEmailOptIn }
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-users"] })
  });

  if (!accessToken) return null;

  return (
    <div className="card admin-page">
      <AdminPageHeader
        title="Kullanıcılar"
        description='“Toplu mail” sütunu yalnızca pazarlama / toplu e-posta içindir; şifre sıfırlama ve doğrulama e-postaları etkilenmez.'
      />
      {isLoading && <p className="admin-loading" style={{ padding: "0.5rem 0" }}>Yükleniyor…</p>}
      {error && <p className="text-danger">Kullanıcılar yüklenirken bir hata oluştu.</p>}
      {data && (
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>İsim</th>
                <th>E-posta</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Toplu mail</th>
                <th>Son giriş</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => {
                const optIn = u.marketingEmailOptIn !== false;
                return (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.status}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span style={{ marginRight: 8 }}>{optIn ? "Açık" : "Kapalı"}</span>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        disabled={prefMut.isPending}
                        onClick={() => prefMut.mutate({ id: u.id, marketingEmailOptIn: !optIn })}
                      >
                        {optIn ? "Kapat" : "Aç"}
                      </button>
                    </td>
                    <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("tr-TR") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
