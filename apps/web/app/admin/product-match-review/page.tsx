"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

type StoreRow = { id: number; name: string; slug: string };

type OpsSummary = {
  storeProductsTotal: number;
  storeProductsNoMatch: number;
  storeProductsLowConfidence: number;
  storeProductsAmbiguous: number;
  storeProductsReviewed: number;
  storeProductsManualAssigned: number;
};

type SpListItem = {
  id: number;
  storeId: number;
  productId: number | null;
  title: string;
  ean: string | null;
  modelNumber: string | null;
  matchScore: number;
  matchStatus: string;
  matchDetailsJson: unknown;
  reviewFlag: string;
  createdAt: string;
  store: { name: string; slug: string };
};

type ListResponse = {
  items: SpListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type SpDetail = SpListItem & {
  url: string;
  specsJson: unknown;
  reviewNotes: string | null;
  reviewedAt: string | null;
  reviewedBy: { id: number; email: string; name: string } | null;
  store: { id: number; name: string; slug: string };
  product: { id: number; name: string; slug: string } | null;
};

type ProductSearchRow = { id: number; name: string; slug: string };

type ReviewFlag = "NONE" | "FLAGGED" | "REVIEWED" | "IGNORED" | "";
type MatchStatus = "UNMATCHED" | "AUTO_MATCHED" | "MANUAL_MATCHED" | "REJECTED" | "";

type Filters = {
  source: string;
  storeId: string;
  matchStatus: MatchStatus;
  reviewFlag: ReviewFlag;
  categoryMethod: string;
  matchReason: string;
  confidenceMin: string;
  confidenceMax: string;
  dateFrom: string;
  dateTo: string;
  q: string;
  problemOnly: boolean;
  lowConfidenceOnly: boolean;
  manualAssignedOnly: boolean;
};

function asObj(x: unknown): Record<string, unknown> | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  return x as Record<string, unknown>;
}

function badgeStyle(kind: "danger" | "warn" | "muted" | "ok") {
  if (kind === "danger") return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" };
  if (kind === "warn") return { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" };
  if (kind === "ok") return { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" };
}

function Chip({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-secondary"
      style={{
        borderRadius: "999px",
        padding: "0.35rem 0.6rem",
        background: active ? "#eff6ff" : undefined,
        color: active ? "#1d4ed8" : undefined
      }}
    >
      {label}
    </button>
  );
}

function SummaryCard({
  title,
  value,
  hint,
  onClick
}: {
  title: string;
  value: number | string;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="card"
      onClick={onClick}
      style={{
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        border: "1px solid #e5e7eb",
        padding: "0.85rem"
      }}
    >
      <div className="text-muted" style={{ fontSize: "0.78rem", marginBottom: "0.25rem" }}>
        {title}
      </div>
      <div style={{ fontSize: "1.35rem", fontWeight: 750, lineHeight: 1.1 }}>{value}</div>
      {hint && (
        <div className="text-muted" style={{ fontSize: "0.72rem", marginTop: "0.25rem" }}>
          {hint}
        </div>
      )}
    </button>
  );
}

export default function AdminProductMatchReviewPage() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [drawerId, setDrawerId] = useState<number | null>(null);

  const [filters, setFilters] = useState<Filters>({
    source: "",
    storeId: "",
    matchStatus: "",
    reviewFlag: "",
    categoryMethod: "",
    matchReason: "",
    confidenceMin: "",
    confidenceMax: "",
    dateFrom: "",
    dateTo: "",
    q: "",
    problemOnly: true, // varsayılan: sadece problemli + reviewed değil
    lowConfidenceOnly: false,
    manualAssignedOnly: false
  });

  const [productSearchQ, setProductSearchQ] = useState("");
  const [assignProductId, setAssignProductId] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newBrandId, setNewBrandId] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  const { data: summary } = useQuery<OpsSummary>({
    queryKey: ["admin-ops-summary"],
    queryFn: () => apiFetch<OpsSummary>("/admin/operations/summary", { accessToken }),
    enabled: !!accessToken
  });

  const { data: stores } = useQuery<StoreRow[]>({
    queryKey: ["admin-stores"],
    queryFn: () => apiFetch<StoreRow[]>("/admin/stores", { accessToken }),
    enabled: !!accessToken
  });

  const queryKey = useMemo(
    () => ["admin-ops-store-products", page, filters],
    [page, filters]
  );

  const listQuery = useQuery<ListResponse>({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams();
      p.set("page", String(page));
      p.set("pageSize", "30");

      if (filters.storeId) p.set("storeId", filters.storeId);
      if (filters.source.trim()) p.set("feedSource", filters.source.trim());
      if (filters.matchStatus) p.set("matchStatus", filters.matchStatus);
      if (filters.reviewFlag) p.set("reviewFlag", filters.reviewFlag);
      if (filters.categoryMethod.trim()) p.set("categoryResolutionMethod", filters.categoryMethod.trim());
      if (filters.matchReason.trim()) p.set("productMatchReason", filters.matchReason.trim());
      if (filters.confidenceMin.trim()) p.set("confidenceMin", filters.confidenceMin.trim());
      if (filters.confidenceMax.trim()) p.set("confidenceMax", filters.confidenceMax.trim());
      if (filters.dateFrom.trim()) p.set("createdFrom", filters.dateFrom.trim());
      if (filters.dateTo.trim()) p.set("createdTo", filters.dateTo.trim());
      if (filters.q.trim()) p.set("q", filters.q.trim());

      if (filters.problemOnly) p.set("problemOnly", "true");
      if (filters.lowConfidenceOnly) p.set("lowConfidenceOnly", "true");
      if (filters.manualAssignedOnly) p.set("manualAssignedOnly", "true");

      return apiFetch<ListResponse>(`/admin/operations/store-products?${p.toString()}`, { accessToken });
    },
    enabled: !!accessToken
  });

  const detailQuery = useQuery<SpDetail>({
    queryKey: ["admin-ops-store-product", drawerId],
    queryFn: () => apiFetch<SpDetail>(`/admin/operations/store-products/${drawerId}`, { accessToken }),
    enabled: !!accessToken && drawerId != null
  });

  const productSearch = useQuery<{ items: ProductSearchRow[] }>({
    queryKey: ["admin-products-search", productSearchQ],
    queryFn: () =>
      apiFetch<{ items: ProductSearchRow[] }>(
        `/admin/products?page=1&pageSize=10&q=${encodeURIComponent(productSearchQ.trim())}`,
        { accessToken }
      ),
    enabled: !!accessToken && productSearchQ.trim().length >= 2
  });

  const saveNoteMut = useMutation({
    mutationFn: () =>
      apiFetch<SpDetail>(`/admin/operations/store-products/${drawerId}/review`, {
        method: "PATCH",
        accessToken,
        body: { reviewNotes: noteDraft || null }
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ops-store-products"] });
      qc.invalidateQueries({ queryKey: ["admin-ops-store-product", drawerId] });
    }
  });

  const markReviewedMut = useMutation({
    mutationFn: () =>
      apiFetch<SpDetail>(`/admin/operations/store-products/${drawerId}/review`, {
        method: "PATCH",
        accessToken,
        body: { reviewNotes: noteDraft || null, markReviewed: true }
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ops-store-products"] });
      qc.invalidateQueries({ queryKey: ["admin-ops-store-product", drawerId] });
      qc.invalidateQueries({ queryKey: ["admin-ops-summary"] });
    }
  });

  const assignMut = useMutation({
    mutationFn: () =>
      apiFetch<SpDetail>(`/admin/operations/store-products/${drawerId}/assign-product`, {
        method: "POST",
        accessToken,
        body: { productId: Number(assignProductId) }
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ops-store-products"] });
      qc.invalidateQueries({ queryKey: ["admin-ops-store-product", drawerId] });
      qc.invalidateQueries({ queryKey: ["admin-ops-summary"] });
      setAssignProductId("");
    }
  });

  const createCanonicalMut = useMutation({
    mutationFn: () =>
      apiFetch<SpDetail>(`/admin/operations/store-products/${drawerId}/create-canonical-product`, {
        method: "POST",
        accessToken,
        body: {
          ...(newCategoryId.trim() && Number.isFinite(Number(newCategoryId))
            ? { categoryId: Number(newCategoryId) }
            : {}),
          ...(newBrandId.trim() && Number.isFinite(Number(newBrandId)) ? { brandId: Number(newBrandId) } : {})
        }
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ops-store-products"] });
      qc.invalidateQueries({ queryKey: ["admin-ops-store-product", drawerId] });
      qc.invalidateQueries({ queryKey: ["admin-ops-summary"] });
      setNewCategoryId("");
      setNewBrandId("");
    }
  });

  if (!accessToken) return null;

  function openDrawer(id: number) {
    setDrawerId(id);
    setAssignProductId("");
    setProductSearchQ("");
    setNoteDraft("");
  }

  function closeDrawer() {
    setDrawerId(null);
  }

  const items = listQuery.data?.items ?? [];

  return (
    <div className="card admin-page" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <AdminPageHeader
        title="Ürün eşleşme review"
        description={
          <>
            Amaç: 80k satırı gezmek değil; <strong>işlem yapılması gereken</strong> kayıtları bulup çözmek. Varsayılan
            görünüm “sadece sorunlu + incelenmemiş”.
          </>
        }
      />

      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "0.75rem" }}
      >
        <SummaryCard
          title="Toplam"
          value={summary?.storeProductsTotal ?? "—"}
          hint="Tüm StoreProduct"
          onClick={() => setFilters((f) => ({ ...f, problemOnly: false, lowConfidenceOnly: false, manualAssignedOnly: false }))}
        />
        <SummaryCard
          title="No Match"
          value={summary?.storeProductsNoMatch ?? "—"}
          hint="productMatch.reason = no_match"
          onClick={() =>
            setFilters((f) => ({ ...f, problemOnly: false, matchReason: "no_match", page: undefined } as any))
          }
        />
        <SummaryCard
          title="Low Confidence"
          value={summary?.storeProductsLowConfidence ?? "—"}
          hint="<55 (created_new hariç)"
          onClick={() => setFilters((f) => ({ ...f, problemOnly: false, lowConfidenceOnly: true }))}
        />
        <SummaryCard
          title="Ambiguous"
          value={summary?.storeProductsAmbiguous ?? "—"}
          hint="matchStatus = UNMATCHED"
          onClick={() => setFilters((f) => ({ ...f, problemOnly: false, matchStatus: "UNMATCHED" }))}
        />
        <SummaryCard
          title="Reviewed"
          value={summary?.storeProductsReviewed ?? "—"}
          onClick={() => setFilters((f) => ({ ...f, problemOnly: false, reviewFlag: "REVIEWED" }))}
        />
        <SummaryCard
          title="Manual Assigned"
          value={summary?.storeProductsManualAssigned ?? "—"}
          hint="MANUAL_MATCHED / manual_override"
          onClick={() => setFilters((f) => ({ ...f, problemOnly: false, manualAssignedOnly: true }))}
        />
      </div>

      <div className="admin-panel">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <Chip
            label="Sadece sorunlu"
            active={filters.problemOnly}
            onClick={() => {
              setPage(1);
              setFilters((f) => ({ ...f, problemOnly: !f.problemOnly }));
            }}
          />
          <Chip
            label="No Match"
            active={filters.matchReason === "no_match"}
            onClick={() => {
              setPage(1);
              setFilters((f) => ({ ...f, problemOnly: false, matchReason: f.matchReason === "no_match" ? "" : "no_match" }));
            }}
          />
          <Chip
            label="Düşük güven"
            active={filters.lowConfidenceOnly}
            onClick={() => {
              setPage(1);
              setFilters((f) => ({ ...f, problemOnly: false, lowConfidenceOnly: !f.lowConfidenceOnly }));
            }}
          />
          <Chip
            label="İncelenmemiş"
            active={filters.reviewFlag === "NONE"}
            onClick={() => {
              setPage(1);
              setFilters((f) => ({ ...f, problemOnly: false, reviewFlag: f.reviewFlag === "NONE" ? "" : "NONE" }));
            }}
          />
          <Chip
            label="Manuel atama gerekenler"
            active={filters.matchStatus === "UNMATCHED"}
            onClick={() => {
              setPage(1);
              setFilters((f) => ({ ...f, problemOnly: false, matchStatus: f.matchStatus === "UNMATCHED" ? "" : "UNMATCHED" }));
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: "0.5rem",
            alignItems: "end"
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem" }}>
            Source
            <input
              className="input"
              placeholder="feedSource (örn. trendyol)"
              value={filters.source}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, source: e.target.value }));
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem" }}>
            Mağaza
            <select
              className="input"
              value={filters.storeId}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, storeId: e.target.value }));
              }}
            >
              <option value="">Tümü</option>
              {(stores ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem" }}>
            Status
            <select
              className="input"
              value={filters.matchStatus}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, matchStatus: e.target.value as MatchStatus }));
              }}
            >
              <option value="">Tümü</option>
              <option value="UNMATCHED">UNMATCHED</option>
              <option value="AUTO_MATCHED">AUTO_MATCHED</option>
              <option value="MANUAL_MATCHED">MANUAL_MATCHED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem" }}>
            Review status
            <select
              className="input"
              value={filters.reviewFlag}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, reviewFlag: e.target.value as ReviewFlag }));
              }}
            >
              <option value="">Tümü</option>
              <option value="NONE">NONE</option>
              <option value="FLAGGED">FLAGGED</option>
              <option value="REVIEWED">REVIEWED</option>
              <option value="IGNORED">IGNORED</option>
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem" }}>
            Category method
            <input
              className="input"
              placeholder="(örn. override_full)"
              value={filters.categoryMethod}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, categoryMethod: e.target.value }));
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem" }}>
            Match reason
            <select
              className="input"
              value={filters.matchReason}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, matchReason: e.target.value }));
              }}
            >
              <option value="">Tümü</option>
              <option value="no_match">no_match</option>
              <option value="created_new">created_new</option>
              <option value="ean_exact">ean_exact</option>
              <option value="brand_model_exact">brand_model_exact</option>
              <option value="title_exact">title_exact</option>
              <option value="title_single_candidate">title_single_candidate</option>
              <option value="spec_overlap">spec_overlap</option>
              <option value="manual_override">manual_override</option>
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem" }}>
            Confidence min
            <input
              className="input"
              placeholder="0"
              value={filters.confidenceMin}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, confidenceMin: e.target.value }));
              }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem" }}>
            Confidence max
            <input
              className="input"
              placeholder="100"
              value={filters.confidenceMax}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, confidenceMax: e.target.value }));
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem" }}>
            Date from
            <input
              className="input"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, dateFrom: e.target.value }));
              }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem" }}>
            Date to
            <input
              className="input"
              type="date"
              value={filters.dateTo}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, dateTo: e.target.value }));
              }}
            />
          </label>

          <label
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              fontSize: "0.8rem"
            }}
          >
            Text search (title / ean / model / categoryText)
            <input
              className="input"
              placeholder="Ara…"
              value={filters.q}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, q: e.target.value }));
              }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setPage(1);
              setFilters((f) => ({
                ...f,
                source: "",
                storeId: "",
                matchStatus: "",
                reviewFlag: "",
                categoryMethod: "",
                matchReason: "",
                confidenceMin: "",
                confidenceMax: "",
                dateFrom: "",
                dateTo: "",
                q: "",
                lowConfidenceOnly: false,
                manualAssignedOnly: false,
                problemOnly: true
              }));
            }}
          >
            Reset → Varsayılan (sorunlu)
          </button>
        </div>
      </div>

      <div className="admin-panel">
        {listQuery.isLoading && <p className="text-muted">Yükleniyor…</p>}
        {listQuery.error && <p className="text-danger">Liste yüklenemedi.</p>}

        {listQuery.data && (
          <>
            <div className="admin-data-table-wrap">
            <table className="admin-data-table" style={{ fontSize: "0.8rem" }}>
              <thead>
                <tr>
                  <th>Ürün adı</th>
                  <th>Kaynak</th>
                  <th>Mağaza</th>
                  <th>Category text</th>
                  <th>Category method</th>
                  <th>Match reason</th>
                  <th style={{ textAlign: "right" }}>Confidence</th>
                  <th>Review</th>
                  <th style={{ textAlign: "right" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const md = asObj(row.matchDetailsJson);
                  const source = String(md?.feedSource ?? "").trim() || "—";
                  const categoryText = String(md?.categoryText ?? "").trim() || "—";
                  const catRes = asObj(md?.categoryResolution);
                  const catMethod = String(catRes?.method ?? "").trim() || "—";
                  const pm = asObj(md?.productMatch);
                  const reason = String(pm?.reason ?? "").trim() || "—";
                  const confRaw = pm?.confidence;
                  const confidence = typeof confRaw === "number" ? confRaw : Number(confRaw);

                  const isNoMatch = reason === "no_match" || row.matchStatus === "UNMATCHED";
                  const isLow = Number.isFinite(confidence) && confidence < 55 && reason !== "created_new";
                  const isReviewed = row.reviewFlag === "REVIEWED";

                  const badgeKind = isReviewed ? "ok" : isNoMatch ? "danger" : isLow ? "warn" : "muted";

                  return (
                    <tr
                      key={row.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => openDrawer(row.id)}
                      title="Detay için tıkla"
                    >
                      <td style={{ maxWidth: "320px" }}>
                        <div style={{ fontWeight: 600 }}>{row.title}</div>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                          EAN {row.ean ?? "—"} · Model {row.modelNumber ?? "—"}
                        </div>
                      </td>
                      <td>{source}</td>
                      <td>{row.store.name}</td>
                      <td style={{ maxWidth: "240px" }} className="text-muted">
                        {categoryText}
                      </td>
                      <td>{catMethod}</td>
                      <td>{reason}</td>
                      <td style={{ textAlign: "right" }}>{Number.isFinite(confidence) ? confidence : "—"}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            ...badgeStyle(badgeKind as any)
                          }}
                        >
                          {row.reviewFlag}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(row.id);
                          }}
                        >
                          İncele
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem" }}>
              <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                Sayfa {listQuery.data.page} · Toplam {listQuery.data.total}
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Önceki
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={page * listQuery.data.pageSize >= listQuery.data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sonraki
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {drawerId != null && (
        <>
          <button
            type="button"
            aria-label="Drawer kapat"
            onClick={closeDrawer}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 40,
              background: "rgba(0,0,0,0.35)",
              border: "none"
            }}
          />
          <aside
            className="card"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              height: "100vh",
              width: "520px",
              maxWidth: "92vw",
              zIndex: 50,
              overflow: "auto",
              borderLeft: "1px solid #e5e7eb",
              borderRadius: 0,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                  StoreProduct
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 700 }}>#{drawerId}</div>
              </div>
              <button type="button" className="btn-secondary" onClick={closeDrawer}>
                Kapat
              </button>
            </div>

            {detailQuery.isLoading && <p className="text-muted">Yükleniyor…</p>}
            {detailQuery.error && <p className="text-danger">Detay yüklenemedi.</p>}

            {detailQuery.data && (
              (() => {
                const md = asObj(detailQuery.data.matchDetailsJson) ?? {};
                const pm = asObj(md.productMatch) ?? {};
                const cr = asObj(md.categoryResolution) ?? {};
                const categoryText = String(md.categoryText ?? "").trim() || "—";
                const source = String(md.feedSource ?? "").trim() || "—";
                const reason = String(pm.reason ?? "").trim() || "—";
                const confidence = typeof pm.confidence === "number" ? pm.confidence : Number(pm.confidence);
                const details = pm.details ?? null;

                const catOverrideLink = `/admin/category-overrides`;

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                    <div style={{ fontSize: "0.9rem" }}>
                      <div><strong>Başlık:</strong> {detailQuery.data.title}</div>
                      <div><strong>Kaynak:</strong> {source}</div>
                      <div><strong>Mağaza:</strong> {detailQuery.data.store.name}</div>
                      <div><strong>EAN:</strong> {detailQuery.data.ean ?? "—"}</div>
                      <div><strong>Model:</strong> {detailQuery.data.modelNumber ?? "—"}</div>
                      <div style={{ wordBreak: "break-word" }}><strong>URL:</strong>{" "}
                        <a href={detailQuery.data.url} target="_blank" rel="noreferrer">{detailQuery.data.url}</a>
                      </div>
                      <div><strong>Category text:</strong> <span className="text-muted">{categoryText}</span></div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                          categoryResolution
                        </div>
                        <pre style={{ fontSize: "0.72rem", background: "#f8fafc", padding: "0.5rem", borderRadius: "0.35rem", overflow: "auto", maxHeight: "160px" }}>
                          {JSON.stringify(cr, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                          productMatch
                        </div>
                        <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                          Reason: <strong>{reason}</strong>
                          <br />
                          Confidence: <strong>{Number.isFinite(confidence) ? confidence : "—"}</strong>
                        </div>
                        <pre style={{ fontSize: "0.72rem", background: "#f8fafc", padding: "0.5rem", borderRadius: "0.35rem", overflow: "auto", maxHeight: "160px" }}>
                          {JSON.stringify(details ?? {}, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>Aksiyonlar</div>

                      <div style={{ marginBottom: "0.5rem" }}>
                        <Link href={catOverrideLink} className="dropdown-item" style={{ display: "inline-block" }}>
                          Kategori override ekranına git
                        </Link>
                      </div>

                      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "0.75rem" }}>
                        <div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>Canonical product assign</div>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                          <input
                            className="input"
                            placeholder="Ürün ID"
                            value={assignProductId}
                            onChange={(e) => setAssignProductId(e.target.value)}
                            style={{ width: "120px" }}
                          />
                          <input
                            className="input"
                            placeholder="Ürün ara (min 2 harf)"
                            value={productSearchQ}
                            onChange={(e) => setProductSearchQ(e.target.value)}
                            style={{ minWidth: "200px" }}
                          />
                        </div>
                        {productSearch.data?.items?.length ? (
                          <ul style={{ fontSize: "0.8rem", margin: "0 0 0.5rem 0", paddingLeft: "1.1rem" }}>
                            {productSearch.data.items.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  style={{ background: "none", border: "none", padding: 0, color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}
                                  onClick={() => setAssignProductId(String(p.id))}
                                >
                                  #{p.id} {p.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={assignMut.isPending || !assignProductId || !Number.isFinite(Number(assignProductId))}
                          onClick={() => assignMut.mutate()}
                        >
                          Assign
                        </button>
                        {assignMut.isError && (
                          <p className="text-danger" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                            Atama başarısız.
                          </p>
                        )}
                      </div>

                      {!detailQuery.data.productId ? (
                        <div
                          style={{ borderTop: "1px solid #e5e7eb", paddingTop: "0.75rem" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>
                            Yeni canonical ürün oluştur
                          </div>
                          <p className="text-muted" style={{ fontSize: "0.78rem", margin: "0 0 0.5rem" }}>
                            Başlık / görsel / EAN / model bu satırdan kopyalanır; slug başlıktan üretilir (çakışmada
                            sonek eklenir). İsteğe bağlı kategori ve marka ID.
                          </p>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                            <input
                              className="input"
                              placeholder="categoryId (opsiyonel)"
                              value={newCategoryId}
                              onChange={(e) => setNewCategoryId(e.target.value)}
                              style={{ width: "160px" }}
                            />
                            <input
                              className="input"
                              placeholder="brandId (opsiyonel)"
                              value={newBrandId}
                              onChange={(e) => setNewBrandId(e.target.value)}
                              style={{ width: "160px" }}
                            />
                          </div>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={createCanonicalMut.isPending}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  "Bu mağaza satırından yeni bir Product oluşturulup teklifler bağlanacak. Onaylıyor musunuz?"
                                )
                              ) {
                                return;
                              }
                              createCanonicalMut.mutate();
                            }}
                          >
                            {createCanonicalMut.isPending ? "Oluşturuluyor…" : "Yeni ürün oluştur ve bağla"}
                          </button>
                          {createCanonicalMut.isError && (
                            <p className="text-danger" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                              İşlem başarısız (zaten bağlı veya geçersiz ID).
                            </p>
                          )}
                        </div>
                      ) : null}

                      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "0.75rem" }}>
                        <div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>Review note</div>
                        <textarea
                          className="input"
                          style={{ width: "100%", minHeight: "84px" }}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder={detailQuery.data.reviewNotes ?? "Not yaz…"}
                        />
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={saveNoteMut.isPending}
                            onClick={() => saveNoteMut.mutate()}
                          >
                            Notu kaydet
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={markReviewedMut.isPending}
                            onClick={() => markReviewedMut.mutate()}
                          >
                            Reviewed işaretle
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </aside>
        </>
      )}
    </div>
  );
}
