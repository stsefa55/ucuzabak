"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  errorCount: number;
  errorLog?: string | null;
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
      <tr
        style={{
          borderTop: "1px solid #e5e7eb",
          backgroundColor: fi.errorCount > 0 ? "rgba(254, 226, 226, 0.3)" : undefined
        }}
      >
        <td style={{ padding: "0.5rem" }}>{fi.id}</td>
        <td style={{ padding: "0.5rem" }}>{fi.store?.name ?? "-"}</td>
        <td style={{ padding: "0.5rem" }}>{typeLabel}</td>
        <td style={{ padding: "0.5rem" }}>{statusLabel}</td>
        <td style={{ padding: "0.5rem", textAlign: "right" }}>{fi.processedCount}</td>
        <td style={{ padding: "0.5rem", textAlign: "right" }}>{fi.createdCount}</td>
        <td style={{ padding: "0.5rem", textAlign: "right" }}>{fi.updatedCount}</td>
        <td style={{ padding: "0.5rem", textAlign: "right" }}>
          {fi.errorCount > 0 ? (
            <span style={{ color: "#b91c1c", fontWeight: 600 }}>{fi.errorCount}</span>
          ) : (
            fi.errorCount
          )}
        </td>
        <td style={{ padding: "0.5rem", whiteSpace: "nowrap" }}>
          {fi.startedAt ? new Date(fi.startedAt).toLocaleString("tr-TR") : "-"}
        </td>
        <td style={{ padding: "0.5rem", whiteSpace: "nowrap" }}>
          {fi.finishedAt ? new Date(fi.finishedAt).toLocaleString("tr-TR") : "-"}
        </td>
        <td style={{ padding: "0.5rem" }}>
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
        <tr style={{ borderTop: "none", backgroundColor: "#f9fafb" }}>
          <td colSpan={10} style={{ padding: "0.75rem 1rem", verticalAlign: "top" }}>
            <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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
              {(fi.errorLog != null && fi.errorLog !== "") ? (
                <div>
                  <strong>Hata / özet:</strong>
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

export default function AdminFeedImportsPage() {
  const { accessToken } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<string>("");

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
    <div className="card">
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        Feed importları
      </h2>
      <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
        Mağaza feed’lerinden yapılan import kayıtları. Manuel import için Mağazalar sayfasında ilgili
        mağazanın &quot;Şimdi içeri aktar&quot; butonunu kullanın.
      </p>
      <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: 12 }}>
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
      {isLoading && <p>Yükleniyor...</p>}
      {error && (
        <p className="text-danger">Feed importları yüklenirken bir hata oluştu.</p>
      )}
      {data && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>ID</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Mağaza</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Tip</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Durum</th>
                <th style={{ textAlign: "right", padding: "0.5rem" }}>İşlenen</th>
                <th style={{ textAlign: "right", padding: "0.5rem" }}>Oluşan</th>
                <th style={{ textAlign: "right", padding: "0.5rem" }}>Güncellenen</th>
                <th style={{ textAlign: "right", padding: "0.5rem" }}>Hata</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Başlangıç</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Bitiş</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: "1rem", textAlign: "center" }} className="text-muted">
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
