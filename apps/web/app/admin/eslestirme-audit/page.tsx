"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

type AuditItem = {
  id: number;
  action: string;
  storeProductId: number;
  actorUserId: number;
  previousProductId: number | null;
  newProductId: number | null;
  metadataJson: unknown;
  createdAt: string;
  actor: { id: number; email: string; name: string };
  storeProduct: {
    id: number;
    title: string;
    storeId: number;
    store: { name: string; slug: string };
  };
};

type AuditResponse = {
  items: AuditItem[];
  total: number;
  page: number;
  pageSize: number;
};

const ACTION_TR: Record<string, string> = {
  MANUAL_ASSIGN_PRODUCT: "Manuel atama",
  CREATE_CANONICAL_PRODUCT: "Yeni canonical oluşturma"
};

export default function AdminMatchAuditPage() {
  const { accessToken } = useAuthStore();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [storeProductId, setStoreProductId] = useState("");
  const [actorUserId, setActorUserId] = useState("");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("pageSize", "25");
    if (action) p.set("action", action);
    if (storeProductId.trim()) p.set("storeProductId", storeProductId.trim());
    if (actorUserId.trim()) p.set("actorUserId", actorUserId.trim());
    return p.toString();
  }, [page, action, storeProductId, actorUserId]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-match-audit", qs],
    queryFn: () => apiFetch<AuditResponse>(`/admin/operations/match-audit?${qs}`, { accessToken }),
    enabled: !!accessToken
  });

  if (!accessToken) return null;

  return (
    <div className="card admin-page" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <AdminPageHeader
        title="Eşleştirme denetim kayıtları"
        description="Manuel canonical atama ve mağaza satırından yeni ürün oluşturma; kim, ne zaman, eski/yeni ürün bağlantısı ve özet metadata."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "0.5rem",
          alignItems: "end"
        }}
      >
        <label style={{ fontSize: "0.8rem" }}>
          İşlem
          <select
            className="form-control"
            style={{ marginTop: 4 }}
            value={action}
            onChange={(e) => {
              setPage(1);
              setAction(e.target.value);
            }}
          >
            <option value="">Tümü</option>
            <option value="MANUAL_ASSIGN_PRODUCT">Manuel atama</option>
            <option value="CREATE_CANONICAL_PRODUCT">Yeni canonical</option>
          </select>
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          StoreProduct ID
          <input
            className="form-control"
            style={{ marginTop: 4 }}
            value={storeProductId}
            onChange={(e) => {
              setPage(1);
              setStoreProductId(e.target.value);
            }}
          />
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          Admin kullanıcı ID
          <input
            className="form-control"
            style={{ marginTop: 4 }}
            value={actorUserId}
            onChange={(e) => {
              setPage(1);
              setActorUserId(e.target.value);
            }}
          />
        </label>
      </div>

      {isLoading && <p className="text-muted">Yükleniyor…</p>}
      {error && <p className="text-danger">Kayıtlar alınamadı.</p>}

      {data && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "0.4rem" }}>Tarih</th>
                  <th style={{ padding: "0.4rem" }}>İşlem</th>
                  <th style={{ padding: "0.4rem" }}>Kim</th>
                  <th style={{ padding: "0.4rem" }}>SP</th>
                  <th style={{ padding: "0.4rem" }}>Eski → Yeni ürün</th>
                  <th style={{ padding: "0.4rem" }}>Mağaza / başlık</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.4rem", whiteSpace: "nowrap" }}>
                      {new Date(r.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td style={{ padding: "0.4rem" }}>{ACTION_TR[r.action] ?? r.action}</td>
                    <td style={{ padding: "0.4rem" }}>
                      #{r.actorUserId}
                      <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                        {r.actor.email}
                      </div>
                    </td>
                    <td style={{ padding: "0.4rem" }}>{r.storeProductId}</td>
                    <td style={{ padding: "0.4rem", fontFamily: "monospace" }}>
                      {r.previousProductId ?? "—"} → {r.newProductId ?? "—"}
                    </td>
                    <td style={{ padding: "0.4rem", maxWidth: "280px" }}>
                      <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                        {r.storeProduct.store.name}
                      </div>
                      <div style={{ wordBreak: "break-word" }}>{r.storeProduct.title}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details style={{ fontSize: "0.78rem" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Metadata (ham JSON, ilk kayıt)</summary>
            {data.items[0] ? (
              <pre
                style={{
                  marginTop: "0.5rem",
                  padding: "0.5rem",
                  background: "#f8fafc",
                  borderRadius: 6,
                  overflow: "auto",
                  maxHeight: 240
                }}
              >
                {JSON.stringify(data.items[0].metadataJson, null, 2)}
              </pre>
            ) : (
              <p className="text-muted">Kayıt yok.</p>
            )}
          </details>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="text-muted" style={{ fontSize: "0.85rem" }}>
              Sayfa {data.page} · Toplam {data.total}
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Önceki
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Sonraki
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
