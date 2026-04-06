"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

const STATUS_TR: Record<string, string> = {
  PENDING: "Beklemede",
  RUNNING: "Çalışıyor",
  SUCCESS: "Başarılı",
  PARTIAL: "Kısmi",
  FAILED: "Başarısız"
};

type ImportSummary = {
  pendingUnmatchedReviews: number;
  unmatchedStoreProducts: number;
  importSkippedRowsLast7Days: number;
  feedImportsByStatusLast30Days: Record<string, number>;
  recentFailedOrPartialImports: Array<{
    id: number;
    status: string;
    errorCount: number;
    errorLog?: string | null;
    createdAt: string;
    store?: { name: string; slug: string } | null;
  }>;
  recentFeedImports: Array<{
    id: number;
    storeId: number;
    status: string;
    processedCount: number;
    createdCount: number;
    updatedCount: number;
    matchedCount: number;
    unmatchedCount: number;
    errorCount: number;
    errorLogPreview: string | null;
    createdAt: string;
    store: { id: number; name: string; slug: string } | null;
  }>;
};

export default function AdminImportOperationsPage() {
  const { accessToken } = useAuthStore();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-import-summary"],
    queryFn: () => apiFetch<ImportSummary>("/admin/operations/import-summary", { accessToken }),
    enabled: !!accessToken
  });

  if (!accessToken) return null;

  return (
    <div className="card admin-page" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <AdminPageHeader
        title="Import operasyonları"
        description="Feed geçmişi, hatalar ve eşleşme kuyruklarına hızlı erişim. Detay listeleri ilgili menü sayfalarında."
      />

      {isLoading && <p className="text-muted">Özet yükleniyor…</p>}
      {error && <p className="text-danger">Özet alınamadı.</p>}

      {data && (
        <>
          <div
            className="grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "0.75rem"
            }}
          >
            <div style={{ padding: "0.75rem", borderRadius: 8, background: "#fef3c7", border: "1px solid #fde68a" }}>
              <div style={{ fontSize: "0.75rem", color: "#92400e" }}>Bekleyen eşleşme incelemesi</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>{data.pendingUnmatchedReviews}</div>
            </div>
            <div style={{ padding: "0.75rem", borderRadius: 8, background: "#fee2e2", border: "1px solid #fecaca" }}>
              <div style={{ fontSize: "0.75rem", color: "#991b1b" }}>Eşleşmemiş mağaza ürünü</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>{data.unmatchedStoreProducts}</div>
            </div>
            <div style={{ padding: "0.75rem", borderRadius: 8, background: "#e0e7ff", border: "1px solid #c7d2fe" }}>
              <div style={{ fontSize: "0.75rem", color: "#3730a3" }}>Atlanan import satırı (7 gün)</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>{data.importSkippedRowsLast7Days}</div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Son 30 gün — feed import durumları
            </h3>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.85rem" }}>
              {Object.entries(data.feedImportsByStatusLast30Days).map(([k, v]) => (
                <li key={k}>
                  {STATUS_TR[k] ?? k}: <strong>{v}</strong>
                </li>
              ))}
              {Object.keys(data.feedImportsByStatusLast30Days).length === 0 ? (
                <li className="text-muted">Bu pencerede kayıt yok.</li>
              ) : null}
            </ul>
          </div>

          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Son 30 gün — feed import geçmişi (özet)
            </h3>
            {data.recentFeedImports.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                Kayıt yok.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                      <th style={{ padding: "0.4rem" }}>ID</th>
                      <th style={{ padding: "0.4rem" }}>Mağaza</th>
                      <th style={{ padding: "0.4rem" }}>Durum</th>
                      <th style={{ padding: "0.4rem" }}>İşlendi</th>
                      <th style={{ padding: "0.4rem" }}>Oluşturuldu</th>
                      <th style={{ padding: "0.4rem" }}>Güncellendi</th>
                      <th style={{ padding: "0.4rem" }}>Eşleşen</th>
                      <th style={{ padding: "0.4rem" }}>Eşleşmeyen</th>
                      <th style={{ padding: "0.4rem" }}>Hata</th>
                      <th style={{ padding: "0.4rem" }}>Hata özeti</th>
                      <th style={{ padding: "0.4rem" }}>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentFeedImports.map((r) => (
                      <tr key={r.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.4rem" }}>{r.id}</td>
                        <td style={{ padding: "0.4rem" }}>{r.store?.name ?? "-"}</td>
                        <td style={{ padding: "0.4rem" }}>{STATUS_TR[r.status] ?? r.status}</td>
                        <td style={{ padding: "0.4rem" }}>{r.processedCount}</td>
                        <td style={{ padding: "0.4rem" }}>{r.createdCount}</td>
                        <td style={{ padding: "0.4rem" }}>{r.updatedCount}</td>
                        <td style={{ padding: "0.4rem" }}>{r.matchedCount ?? 0}</td>
                        <td style={{ padding: "0.4rem" }}>{r.unmatchedCount ?? 0}</td>
                        <td style={{ padding: "0.4rem" }}>{r.errorCount}</td>
                        <td
                          style={{
                            padding: "0.4rem",
                            maxWidth: "280px",
                            wordBreak: "break-word",
                            fontSize: "0.72rem",
                            color: "#64748b"
                          }}
                        >
                          {r.errorLogPreview ?? "—"}
                        </td>
                        <td style={{ padding: "0.4rem", whiteSpace: "nowrap" }}>
                          {new Date(r.createdAt).toLocaleString("tr-TR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-muted" style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
              Hata günlüğü önizlemesi sorunlu satırlar için aşağıdaki tabloda.
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Son başarısız / kısmi importlar
            </h3>
            {data.recentFailedOrPartialImports.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                Kayıt yok.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                      <th style={{ padding: "0.4rem" }}>ID</th>
                      <th style={{ padding: "0.4rem" }}>Mağaza</th>
                      <th style={{ padding: "0.4rem" }}>Durum</th>
                      <th style={{ padding: "0.4rem" }}>Hata sayısı</th>
                      <th style={{ padding: "0.4rem" }}>Günlük (özet)</th>
                      <th style={{ padding: "0.4rem" }}>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentFailedOrPartialImports.map((r) => (
                      <tr key={r.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.4rem" }}>{r.id}</td>
                        <td style={{ padding: "0.4rem" }}>{r.store?.name ?? "-"}</td>
                        <td style={{ padding: "0.4rem" }}>{STATUS_TR[r.status] ?? r.status}</td>
                        <td style={{ padding: "0.4rem" }}>{r.errorCount}</td>
                        <td
                          style={{
                            padding: "0.4rem",
                            maxWidth: "320px",
                            wordBreak: "break-word",
                            fontSize: "0.72rem",
                            color: "#64748b"
                          }}
                        >
                          {r.errorLog ? r.errorLog.slice(0, 400) : "—"}
                        </td>
                        <td style={{ padding: "0.4rem", whiteSpace: "nowrap" }}>
                          {new Date(r.createdAt).toLocaleString("tr-TR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Link href="/admin/feed-imports" className="btn-secondary btn-sm">
              Tüm feed importları
            </Link>
            <Link href="/admin/feed-imports?status=FAILED" className="btn-secondary btn-sm">
              Başarısız importlar (liste)
            </Link>
            <Link href="/admin/import-review" className="btn-secondary btn-sm">
              Import inceleme
            </Link>
            <Link href="/admin/eslesmemis" className="btn-secondary btn-sm">
              Eşleşmemiş ürünler
            </Link>
            <Link href="/admin/product-match-review" className="btn-secondary btn-sm">
              Ürün eşleşme incelemesi
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
