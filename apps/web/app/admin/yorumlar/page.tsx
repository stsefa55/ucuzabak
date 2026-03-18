"use client";

import { useQuery } from "@tanstack/react-query";
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
    <div className="card">
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Ürün yorumları</h2>
      <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
        Şu anda yorumlar sadece okunabilir durumdadır. Moderasyon aksiyonları ileriki fazlarda
        eklenecektir.
      </p>
      {isLoading && <p>Yükleniyor...</p>}
      {error && <p className="text-danger">Yorumlar yüklenirken bir hata oluştu.</p>}
      {data && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>ID</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Ürün</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Kullanıcı</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Puan</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Durum</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Başlık</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Yorum</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: "0.5rem" }}>{r.id}</td>
                <td style={{ padding: "0.5rem" }}>{r.product?.name}</td>
                <td style={{ padding: "0.5rem" }}>{r.user?.email}</td>
                <td style={{ padding: "0.5rem", textAlign: "right" }}>{r.rating}</td>
                <td style={{ padding: "0.5rem" }}>{r.status}</td>
                <td style={{ padding: "0.5rem" }}>{r.title ?? "-"}</td>
                <td style={{ padding: "0.5rem" }}>{r.body}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

