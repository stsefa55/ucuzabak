"use client";

import Link from "next/link";
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

interface SearchTrendItem {
  query: string;
  count: number;
  updatedAt: string;
}

interface AffiliateAnalytics {
  totalClicks: number;
  topStores: { storeId: number; storeName: string; clicks: number }[];
  topProducts: { productId: number; productName: string; clicks: number }[];
  topCategoriesByClicks: {
    categoryId: number;
    categoryName: string;
    categorySlug: string;
    clicks: number;
  }[];
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

  const { data: searchTrends, isLoading: searchLoading } = useQuery<{ items: SearchTrendItem[] }>({
    queryKey: ["admin-search-trends"],
    queryFn: () =>
      apiFetch<{ items: SearchTrendItem[] }>("/admin/analytics/search-trends?limit=12", {
        accessToken
      }),
    enabled: !!accessToken
  });

  if (!accessToken) {
    return null;
  }

  return (
    <>
      {(summaryLoading || affiliateLoading || searchLoading) && (
        <p className="admin-loading">Yönetim özeti yükleniyor…</p>
      )}
      {(summaryError || affiliateError) && (
        <div className="admin-alert admin-alert--danger">
          {(summaryError as { status?: number })?.status === 403 ||
          (affiliateError as { status?: number })?.status === 403
            ? "Bu alana erişim yetkiniz yok. Admin olarak giriş yaptığınızdan emin olun."
            : "Yönetim özeti yüklenirken bir hata oluştu."}
        </div>
      )}

      <div className="admin-dash__hero">
        <h1>Genel bakış</h1>
        <p>Özet metrikler, arama trendleri ve affiliate tıklamaları.</p>
      </div>

      <div className="admin-dash__quick">
        <span>Gözlemlenebilirlik</span>
        <Link href="/admin/kuyruklar">BullMQ kuyrukları</Link>
        <span aria-hidden>·</span>
        <Link href="/admin/servis-durumu">Servis / SMTP</Link>
        <span aria-hidden>·</span>
        <Link href="/admin/eslestirme-audit">Eşleştirme audit</Link>
        <span aria-hidden>·</span>
        <Link href="/admin/yedekler">Yedekler</Link>
      </div>

      {summary && (
        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <p className="admin-stat-card__label">Toplam ürün</p>
            <p className="admin-stat-card__value">{summary.totalProducts}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-card__label">Toplam mağaza</p>
            <p className="admin-stat-card__value">{summary.totalStores}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-card__label">Feed importları</p>
            <p className="admin-stat-card__value">{summary.totalFeedImports}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-card__label">Bekleyen eşleşme incelemesi</p>
            <p className="admin-stat-card__value">{summary.pendingUnmatchedReviews}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-card__label">Toplam kullanıcı</p>
            <p className="admin-stat-card__value">{summary.totalUsers}</p>
          </div>
          {affiliate && (
            <div className="admin-stat-card">
              <p className="admin-stat-card__label">Affiliate tıklaması</p>
              <p className="admin-stat-card__value">{affiliate.totalClicks}</p>
            </div>
          )}
        </div>
      )}

      {searchTrends && searchTrends.items.length > 0 && (
        <div className="admin-panel">
          <h2 className="admin-panel__title">Arama trendleri</h2>
          <ul className="admin-list-plain">
            {searchTrends.items.map((t) => (
              <li key={t.query}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t.query}</span>
                <span className="text-muted" style={{ flexShrink: 0 }}>
                  {t.count} arama
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {affiliate && (
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1rem"
          }}
        >
          <div className="admin-panel" style={{ marginBottom: 0 }}>
            <h2 className="admin-panel__title">En çok tıklanan mağazalar</h2>
            {affiliate.topStores.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                Henüz tıklama verisi yok.
              </p>
            ) : (
              <ul className="admin-list-plain">
                {affiliate.topStores.map((s) => (
                  <li key={s.storeId}>
                    <span>{s.storeName}</span>
                    <span className="text-muted">{s.clicks} tıklama</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="admin-panel" style={{ marginBottom: 0 }}>
            <h2 className="admin-panel__title">En çok tıklanan ürünler</h2>
            {affiliate.topProducts.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                Henüz tıklama verisi yok.
              </p>
            ) : (
              <ul className="admin-list-plain">
                {affiliate.topProducts.map((p) => (
                  <li key={p.productId}>
                    <span>{p.productName}</span>
                    <span className="text-muted">{p.clicks} tıklama</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="admin-panel" style={{ marginBottom: 0 }}>
            <h2 className="admin-panel__title">Kategori dağılımı (tıklama)</h2>
            {!affiliate.topCategoriesByClicks || affiliate.topCategoriesByClicks.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                Kategorili ürün tıklaması yok.
              </p>
            ) : (
              <ul className="admin-list-plain">
                {affiliate.topCategoriesByClicks.map((c) => (
                  <li key={c.categoryId}>
                    <span>{c.categoryName || c.categorySlug || `#${c.categoryId}`}</span>
                    <span className="text-muted" style={{ flexShrink: 0 }}>
                      {c.clicks} tıklama
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {affiliate && affiliate.recentClicks.length > 0 && (
        <div className="admin-panel" style={{ marginTop: "1rem" }}>
          <h2 className="admin-panel__title">Son tıklamalar</h2>
          <div className="admin-data-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Mağaza</th>
                  <th>Ürün</th>
                  <th>Kullanıcı</th>
                  <th>Referer</th>
                </tr>
              </thead>
              <tbody>
                {affiliate.recentClicks.map((c) => (
                  <tr key={c.id}>
                    <td>{new Date(c.createdAt).toLocaleString("tr-TR")}</td>
                    <td>{c.store?.name}</td>
                    <td>{c.product?.name}</td>
                    <td>{c.user?.email ?? "—"}</td>
                    <td>{c.referer ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
