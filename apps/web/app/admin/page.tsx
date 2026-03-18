"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../src/lib/api-client";
import { useAuthStore } from "../../src/stores/auth-store";

interface DashboardSummary {
  totalProducts: number;
  totalStores: number;
  totalFeedImports: number;
  pendingUnmatchedReviews: number;
  totalUsers: number;
}

interface AffiliateAnalytics {
  totalClicks: number;
  topStores: { storeId: number; storeName: string; clicks: number }[];
  topProducts: { productId: number; productName: string; clicks: number }[];
  recentClicks: {
    id: number;
    createdAt: string;
    store: { name: string };
    product: { name: string };
    user?: { email: string } | null;
    referer?: string | null;
  }[];
}

export default function AdminDashboardPage() {
  const { accessToken } = useAuthStore();

  const { data: summary, isLoading: summaryLoading, error: summaryError } =
    useQuery<DashboardSummary>({
      queryKey: ["admin-dashboard-summary"],
      queryFn: () =>
        apiFetch<DashboardSummary>("/admin/dashboard/summary", {
          accessToken
        }),
      enabled: !!accessToken
    });

  const {
    data: affiliate,
    isLoading: affiliateLoading,
    error: affiliateError
  } = useQuery<AffiliateAnalytics>({
    queryKey: ["admin-affiliate-analytics"],
    queryFn: () =>
      apiFetch<AffiliateAnalytics>("/admin/analytics/affiliate", {
        accessToken
      }),
    enabled: !!accessToken
  });

  if (!accessToken) {
    // Layout already shows auth warning; bu component sadece içerik render ediyor.
    return null;
  }

  return (
    <>
      {(summaryLoading || affiliateLoading) && <p>Yönetim özeti yükleniyor...</p>}
      {(summaryError || affiliateError) && (
        <p className="text-danger">
          {(summaryError as any)?.status === 403 || (affiliateError as any)?.status === 403
            ? "Bu alana erişim yetkiniz yok. Admin olarak giriş yaptığınızdan emin olun."
            : "Yönetim özeti yüklenirken bir hata oluştu."}
        </p>
      )}

      {summary && (
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "1rem", marginBottom: "1rem" }}
        >
          <div className="card">
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.25rem" }}>
              Toplam ürün
            </h3>
            <p style={{ fontSize: "1.4rem", fontWeight: 700 }}>{summary.totalProducts}</p>
          </div>
          <div className="card">
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.25rem" }}>
              Toplam mağaza
            </h3>
            <p style={{ fontSize: "1.4rem", fontWeight: 700 }}>{summary.totalStores}</p>
          </div>
          <div className="card">
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.25rem" }}>
              Feed importları
            </h3>
            <p style={{ fontSize: "1.4rem", fontWeight: 700 }}>{summary.totalFeedImports}</p>
          </div>
          <div className="card">
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.25rem" }}>
              Bekleyen eşleşme incelemesi
            </h3>
            <p style={{ fontSize: "1.4rem", fontWeight: 700 }}>
              {summary.pendingUnmatchedReviews}
            </p>
          </div>
          <div className="card">
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.25rem" }}>
              Toplam kullanıcı
            </h3>
            <p style={{ fontSize: "1.4rem", fontWeight: 700 }}>{summary.totalUsers}</p>
          </div>
          {affiliate && (
            <div className="card">
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                Toplam affiliate tıklaması
              </h3>
              <p style={{ fontSize: "1.4rem", fontWeight: 700 }}>{affiliate.totalClicks}</p>
            </div>
          )}
        </div>
      )}

      {affiliate && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "1rem" }}>
          <div className="card">
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              En çok tıklanan mağazalar
            </h3>
            {affiliate.topStores.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                Henüz tıklama verisi yok.
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.85rem" }}>
                {affiliate.topStores.map((s) => (
                  <li
                    key={s.storeId}
                    style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0" }}
                  >
                    <span>{s.storeName}</span>
                    <span className="text-muted">{s.clicks} tıklama</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              En çok tıklanan ürünler
            </h3>
            {affiliate.topProducts.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                Henüz tıklama verisi yok.
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.85rem" }}>
                {affiliate.topProducts.map((p) => (
                  <li
                    key={p.productId}
                    style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0" }}
                  >
                    <span>{p.productName}</span>
                    <span className="text-muted">{p.clicks} tıklama</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {affiliate && affiliate.recentClicks.length > 0 && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Son tıklamalar
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Tarih</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Mağaza</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Ürün</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Kullanıcı</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Referer</th>
              </tr>
            </thead>
            <tbody>
              {affiliate.recentClicks.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "0.5rem" }}>
                    {new Date(c.createdAt).toLocaleString("tr-TR")}
                  </td>
                  <td style={{ padding: "0.5rem" }}>{c.store?.name}</td>
                  <td style={{ padding: "0.5rem" }}>{c.product?.name}</td>
                  <td style={{ padding: "0.5rem" }}>{c.user?.email ?? "-"}</td>
                  <td style={{ padding: "0.5rem" }}>{c.referer ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

