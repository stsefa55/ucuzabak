"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Beklemede",
  RUNNING: "Çalışıyor",
  SUCCESS: "Başarılı",
  PARTIAL: "Kısmi hata",
  FAILED: "Başarısız"
};

const TYPE_LABELS: Record<string, string> = {
  XML: "XML",
  CSV: "CSV",
  JSON_API: "JSON API"
};

interface FeedImportItem {
  id: number;
  storeId: number;
  type: string;
  status: string;
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  matchedCount: number;
  unmatchedCount: number;
  errorCount: number;
  errorLog?: string | null;
  /** Worker: özet, reasonCounts, örnek satır logları */
  importSummaryJson?: unknown;
  sourceRef?: string | null;
  checksum?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  store?: { id: number; name: string; slug: string } | null;
}

interface FeedImportsResponse {
  items: FeedImportItem[];
  total: number;
  page: number;
  pageSize: number;
}

function FeedImportRow({ fi }: { fi: FeedImportItem }) {
  const [showDetail, setShowDetail] = useState(false);
  const statusLabel = STATUS_LABELS[fi.status] ?? fi.status;
  const typeLabel = TYPE_LABELS[fi.type] ?? fi.type;

  return (
    <>
      <tr style={{ backgroundColor: fi.errorCount > 0 ? "rgba(254, 226, 226, 0.25)" : undefined }}>
        <td>{fi.id}</td>
        <td>{fi.store?.name ?? "—"}</td>
        <td>{typeLabel}</td>
        <td>{statusLabel}</td>
        <td style={{ textAlign: "right" }}>{fi.processedCount}</td>
        <td style={{ textAlign: "right" }}>{fi.createdCount}</td>
        <td style={{ textAlign: "right" }}>{fi.updatedCount}</td>
        <td style={{ textAlign: "right" }}>{fi.matchedCount ?? 0}</td>
        <td style={{ textAlign: "right" }}>{fi.unmatchedCount ?? 0}</td>
        <td style={{ textAlign: "right" }}>
          {fi.errorCount > 0 ? (
            <span style={{ color: "#b91c1c", fontWeight: 600 }}>{fi.errorCount}</span>
          ) : (
            fi.errorCount
          )}
        </td>
        <td style={{ whiteSpace: "nowrap" }}>{fi.startedAt ? new Date(fi.startedAt).toLocaleString("tr-TR") : "—"}</td>
        <td style={{ whiteSpace: "nowrap" }}>{fi.finishedAt ? new Date(fi.finishedAt).toLocaleString("tr-TR") : "—"}</td>
        <td>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setShowDetail((d) => !d)}
          >
            {showDetail ? "Detayı gizle" : "Detay"}
          </button>
        </td>
      </tr>
      {showDetail && (
        <tr style={{ backgroundColor: "#f8fafc" }}>
          <td colSpan={13} style={{ padding: "0.75rem 1rem", verticalAlign: "top" }}>
            <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div className="text-muted" style={{ lineHeight: 1.45 }}>
                <strong>Durum / sütunlar:</strong> «Başarılı» yalnızca işin çökmediğini gösterir (PARTIAL = satır
                hatası var). «Oluşturulan» = yeni <em>StoreProduct</em> (mağaza satırı). Vitrin için canonical{" "}
                <em>Product</em> + teklif gerekir — ayrıntı altta <code>importSummaryJson.counts</code>.
              </div>
              {fi.sourceRef != null && fi.sourceRef !== "" && (
                <div>
                  <strong>Kaynak (sourceRef):</strong>{" "}
                  <code style={{ wordBreak: "break-all" }}>{fi.sourceRef}</code>
                </div>
              )}
              {fi.checksum != null && fi.checksum !== "" && (
                <div>
                  <strong>Checksum:</strong> <code>{fi.checksum}</code>
                </div>
              )}
              {fi.importSummaryJson != null && typeof fi.importSummaryJson === "object" ? (
                <div>
                  <strong>İş özeti (importSummaryJson):</strong>
                  <pre
                    style={{
                      marginTop: 4,
                      padding: "0.5rem",
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 4,
                      maxHeight: 360,
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontSize: "0.78rem"
                    }}
                  >
                    {JSON.stringify(fi.importSummaryJson, null, 2)}
                  </pre>
                </div>
              ) : null}
              {(fi.errorLog != null && fi.errorLog !== "") ? (
                <div>
                  <strong>Exception örnekleri (errorLog, kısaltılmış):</strong>
                  <pre
                    style={{
                      marginTop: 4,
                      padding: "0.5rem",
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 4,
                      maxHeight: 200,
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontSize: "0.78rem"
                    }}
                  >
                    {fi.errorLog}
                  </pre>
                </div>
              ) : (
                fi.errorCount > 0 && (
                  <div className="text-muted">Hata kaydı yok (item bazlı hatalar logda olabilir).</div>
                )
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const VALID_STATUS = new Set(["PENDING", "RUNNING", "SUCCESS", "FAILED", "PARTIAL"]);

export default function AdminFeedImportsPage() {
  const { accessToken } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    try {
      const s = new URLSearchParams(window.location.search).get("status")?.trim().toUpperCase() ?? "";
      if (VALID_STATUS.has(s)) setStatusFilter(s);
    } catch {
      /* ignore */
    }
  }, []);

  const queryParams = new URLSearchParams({ page: "1", pageSize: "50" });
  if (statusFilter) queryParams.set("status", statusFilter);

  const { data, isLoading, error } = useQuery<FeedImportsResponse>({
    queryKey: ["admin-feed-imports", statusFilter],
    queryFn: () =>
      apiFetch<FeedImportsResponse>(`/admin/feed-imports?${queryParams.toString()}`, {
        accessToken
      }),
    enabled: !!accessToken
  });

  if (!accessToken) return null;

  return (
    <div className="card admin-page">
      <AdminPageHeader
        title="Feed importları"
        description={
          <>
            Mağaza feed’lerinden yapılan import kayıtları. Manuel dosya / yapıştırma için{" "}
            <a href="/admin/feed-manuel-import" style={{ fontWeight: 600 }}>
              Manuel feed import
            </a>{" "}
            sayfasını kullanın.
          </>
        }
      />
      <div style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <label style={{ fontSize: "0.85rem" }}>
          Durum filtresi:
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ marginLeft: 8, width: "auto", display: "inline-block" }}
          >
            <option value="">Tümü</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {data != null && (
          <span className="text-muted" style={{ fontSize: "0.85rem" }}>
            Toplam {data.total} kayıt
          </span>
        )}
      </div>
      {isLoading && <p className="admin-loading" style={{ padding: "0.5rem 0" }}>Yükleniyor…</p>}
      {error && (
        <p className="text-danger">Feed importları yüklenirken bir hata oluştu.</p>
      )}
      {data && (
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Mağaza</th>
                <th>Tip</th>
                <th>Durum</th>
                <th style={{ textAlign: "right" }}>İşlenen</th>
                <th style={{ textAlign: "right" }}>Oluşan</th>
                <th style={{ textAlign: "right" }}>Güncellenen</th>
                <th style={{ textAlign: "right" }}>Eşleşen</th>
                <th style={{ textAlign: "right" }}>Eşleşmeyen</th>
                <th style={{ textAlign: "right" }}>Hata</th>
                <th>Başlangıç</th>
                <th>Bitiş</th>
                <th aria-label="Detay" />
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: "1rem", textAlign: "center" }} className="text-muted">
                    Kayıt yok.
                  </td>
                </tr>
              ) : (
                data.items.map((fi) => <FeedImportRow key={fi.id} fi={fi} />)
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
