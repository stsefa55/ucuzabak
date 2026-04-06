"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

interface AdminReviewsResponse {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminReviewsPage() {
  const { accessToken } = useAuthStore();

  const { data, isLoading, error } = useQuery<AdminReviewsResponse>({
    queryKey: ["admin-reviews"],
    queryFn: () =>
      apiFetch<AdminReviewsResponse>("/admin/reviews?page=1&pageSize=50", {
        accessToken
      }),
    enabled: !!accessToken
  });

  if (!accessToken) return null;

  return (
    <div className="card admin-page">
      <AdminPageHeader
        title="Ürün yorumları"
        description="Şu an yorumlar salt okunur. Moderasyon aksiyonları sonraki fazlarda eklenecek."
      />
      {isLoading && <p className="admin-loading" style={{ padding: "0.5rem 0" }}>Yükleniyor…</p>}
      {error && <p className="text-danger">Yorumlar yüklenirken bir hata oluştu.</p>}
      {data && (
        <div className="admin-data-table-wrap">
          <table className="admin-data-table" style={{ fontSize: "0.8rem" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Ürün</th>
                <th>Kullanıcı</th>
                <th style={{ textAlign: "right" }}>Puan</th>
                <th>Durum</th>
                <th>Başlık</th>
                <th>Yorum</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.product?.name}</td>
                  <td>{r.user?.email}</td>
                  <td style={{ textAlign: "right" }}>{r.rating}</td>
                  <td>{r.status}</td>
                  <td>{r.title ?? "—"}</td>
                  <td>{r.body}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

