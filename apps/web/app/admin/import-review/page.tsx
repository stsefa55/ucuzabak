"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

type OpsSummary = {
  importSkipsTotal: number;
  categoryOverridesTotal: number;
  storeProductsFlagged: number;
  storeProductsCreatedNew: number;
  storeProductsLowConfidence: number;
  importSkipsByReason: { reason: string; count: number }[];
  importSkipsByFeedSource: { feedSource: string | null; count: number }[];
};

type SkipRow = {
  id: number;
  reason: string;
  feedSource: string | null;
  categoryText: string | null;
  normalizedCategoryKey: string | null;
  title: string | null;
  brand: string | null;
  externalId: string | null;
  categoryResolutionMethod: string | null;
  createdAt: string;
  store: { id: number; name: string; slug: string };
};

type SkipsResponse = {
  items: SkipRow[];
  total: number;
  page: number;
  pageSize: number;
};

type StoreRow = { id: number; name: string; slug: string };

type BrandDiagItem = {
  feedImportId: number;
  storeId: number;
  store: { id: number; name: string; slug: string };
  finishedAt: string | null;
  status: string;
  matchedBrandCount: number | null;
  unmatchedFeedBrandRowCount: number | null;
  unmatchedFeedBrandsTop: { text: string; count: number }[];
  unmatchedFeedBrandSamples: string[];
};

type BrandDiagResponse = { items: BrandDiagItem[] };

type BackfillBrandResponse = {
  dryRun: boolean;
  limit: number;
  scannedProducts: number;
  assignedCount: number;
  assignments: { productId: number; brandId: number; brandName: string; feedBrandText: string }[];
  skippedNoFeedBrandInSpecs: number;
  skippedNoStrictBrandMatch: number;
  skippedNoMatchSample: { productId: number; feedBrandText: string }[];
};

export default function AdminImportReviewPage() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [storeId, setStoreId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [feedSource, setFeedSource] = useState("");
  const [q, setQ] = useState("");

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
    () => ["admin-import-skips", page, storeId, reason, feedSource, q],
    [page, storeId, reason, feedSource, q]
  );

  const brandDiagQuery = useQuery<BrandDiagResponse>({
    queryKey: ["admin-feed-import-brand-diagnostics"],
    queryFn: () =>
      apiFetch<BrandDiagResponse>("/admin/operations/feed-import-brand-diagnostics?limit=8", {
        accessToken
      }),
    enabled: !!accessToken
  });

  const [backfillNote, setBackfillNote] = useState<string | null>(null);

  const backfillMutation = useMutation({
    mutationFn: (opts: { dryRun: boolean; limit?: number }) =>
      apiFetch<BackfillBrandResponse>("/admin/operations/products-backfill-brand-from-specs", {
        method: "POST",
        accessToken,
        body: { dryRun: opts.dryRun, limit: opts.limit ?? 300 }
      }),
    onSuccess: (data) => {
      setBackfillNote(JSON.stringify(data, null, 2));
      void queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    }
  });

  const skipsQuery = useQuery<SkipsResponse>({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams();
      p.set("page", String(page));
      p.set("pageSize", "40");
      if (storeId) p.set("storeId", storeId);
      if (reason.trim()) p.set("reason", reason.trim());
      if (feedSource.trim()) p.set("feedSource", feedSource.trim());
      if (q.trim()) p.set("q", q.trim());
      return apiFetch<SkipsResponse>(`/admin/operations/import-skips?${p.toString()}`, { accessToken });
    },
    enabled: !!accessToken
  });

  if (!accessToken) return null;

  return (
    <div className="card admin-page" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <AdminPageHeader
        title="Import inceleme"
        description={
          <>
            Atlanan satırlar (çözülemeyen kategori vb.) ve özet sayılar. Override eklemek için{" "}
            <Link href="/admin/category-overrides">kategori override</Link> sayfasını kullanın.
          </>
        }
      />

      {summary && (
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}
        >
          <div className="card">
            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
              Atlanan satır (toplam)
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{summary.importSkipsTotal}</div>
          </div>
          <div className="card">
            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
              Kategori override
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{summary.categoryOverridesTotal}</div>
          </div>
          <div className="card">
            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
              Mağaza satırı (işaretli)
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{summary.storeProductsFlagged}</div>
          </div>
          <div className="card">
            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
              created_new (canonical yeni)
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{summary.storeProductsCreatedNew}</div>
          </div>
          <div className="card">
            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
              Düşük güven (&lt;55)
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{summary.storeProductsLowConfidence}</div>
          </div>
        </div>
      )}

      <div className="admin-panel">
        <h2 className="admin-panel__title">Feed → canonical marka özeti</h2>
        <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem", lineHeight: 1.5 }}>
          Import sırasında <strong>yalnızca mevcut Brand satırı</strong> ile tam/normalize eşleşme yapılır; eşleşme yoksa{" "}
          <code>brandId</code> boş kalır (slug yine feed markası + başlıktan üretilebilir). Eksik markalar için{" "}
          <Link href="/admin/markalar" style={{ fontWeight: 600 }}>
            Markalar
          </Link>{" "}
          sayfasından tek tek canonical marka oluşturun; ardından aşağıdaki backfill ile mevcut ürünlere sıkı eşleşme
          uygulanabilir. «Genel Markalar» gibi jenerik ifadeler raporda sayılmaz.
        </p>
        {brandDiagQuery.isLoading && <p className="text-muted">Marka özeti yükleniyor…</p>}
        {brandDiagQuery.error && <p className="text-danger">Marka özeti alınamadı.</p>}
        {brandDiagQuery.data && brandDiagQuery.data.items.length === 0 && (
          <p className="text-muted">Tamamlanmış import kaydı yok.</p>
        )}
        {brandDiagQuery.data && brandDiagQuery.data.items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {brandDiagQuery.data.items.map((row) => (
              <div
                key={row.feedImportId}
                className="card"
                style={{ padding: "0.65rem 0.85rem", fontSize: "0.82rem" }}
              >
                <div style={{ fontWeight: 600 }}>
                  Import #{row.feedImportId} · {row.store?.name ?? row.storeId}{" "}
                  <span className="text-muted">
                    {row.finishedAt ? new Date(row.finishedAt).toLocaleString("tr-TR") : ""}
                  </span>
                </div>
                <div style={{ marginTop: "0.35rem", display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                  <span>
                    Eşleşen marka (satır):{" "}
                    <strong>{row.matchedBrandCount != null ? row.matchedBrandCount : "—"}</strong>
                  </span>
                  <span>
                    Eşleşmeyen (satır):{" "}
                    <strong>{row.unmatchedFeedBrandRowCount != null ? row.unmatchedFeedBrandRowCount : "—"}</strong>
                  </span>
                </div>
                {row.unmatchedFeedBrandSamples.length > 0 && (
                  <div style={{ marginTop: "0.35rem" }}>
                    <span className="text-muted">Örnek eşleşmeyen metinler: </span>
                    {row.unmatchedFeedBrandSamples.slice(0, 8).map((t, i) => (
                      <code key={`${i}-${t}`} style={{ marginRight: 6 }}>
                        {t}
                      </code>
                    ))}
                  </div>
                )}
                {row.unmatchedFeedBrandsTop.length > 0 && (
                  <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem" }}>
                    {row.unmatchedFeedBrandsTop.slice(0, 6).map((x) => (
                      <li key={x.text}>
                        <strong>{x.text}</strong> — {x.count}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={backfillMutation.isPending || !accessToken}
            onClick={() => backfillMutation.mutate({ dryRun: true, limit: 300 })}
          >
            Backfill önizleme (dry run)
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={backfillMutation.isPending || !accessToken}
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                !window.confirm(
                  "brandId boş ürünlerde specs içindeki marka ile sıkı eşleşme varsa brandId yazılacak. Devam?"
                )
              ) {
                return;
              }
              backfillMutation.mutate({ dryRun: false, limit: 300 });
            }}
          >
            Backfill uygula (yaz)
          </button>
          <span className="text-muted" style={{ fontSize: "0.78rem" }}>
            İlk çalıştırma önizleme; limit 300. Markaları önce oluşturun.
          </span>
        </div>
        {backfillMutation.isError && <p className="text-danger" style={{ marginTop: "0.5rem" }}>Backfill isteği başarısız.</p>}
        {backfillNote && (
          <pre
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 4,
              maxHeight: 280,
              overflow: "auto",
              fontSize: "0.75rem"
            }}
          >
            {backfillNote}
          </pre>
        )}
      </div>

      <div className="admin-panel">
        <h2 className="admin-panel__title">Atlanan import satırları</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <select
            className="input"
            style={{ minWidth: "160px" }}
            value={storeId}
            onChange={(e) => {
              setPage(1);
              setStoreId(e.target.value);
            }}
          >
            <option value="">Tüm mağazalar</option>
            {(stores ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="reason (örn. category_unmappable)"
            value={reason}
            onChange={(e) => {
              setPage(1);
              setReason(e.target.value);
            }}
            style={{ minWidth: "200px" }}
          />
          <input
            className="input"
            placeholder="feedSource"
            value={feedSource}
            onChange={(e) => {
              setPage(1);
              setFeedSource(e.target.value);
            }}
            style={{ minWidth: "120px" }}
          />
          <input
            className="input"
            placeholder="Ara (başlık, kategori, externalId…)"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            style={{ minWidth: "220px" }}
          />
        </div>

        {skipsQuery.isLoading && <p className="text-muted">Yükleniyor…</p>}
        {skipsQuery.error && <p className="text-danger">Liste yüklenemedi.</p>}

        {skipsQuery.data && (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.4rem" }}>Tarih</th>
                  <th style={{ textAlign: "left", padding: "0.4rem" }}>Mağaza</th>
                  <th style={{ textAlign: "left", padding: "0.4rem" }}>Reason</th>
                  <th style={{ textAlign: "left", padding: "0.4rem" }}>Kategori metni</th>
                  <th style={{ textAlign: "left", padding: "0.4rem" }}>normalizedKey</th>
                  <th style={{ textAlign: "left", padding: "0.4rem" }}>Yöntem</th>
                  <th style={{ textAlign: "left", padding: "0.4rem" }}>Başlık</th>
                </tr>
              </thead>
              <tbody>
                {skipsQuery.data.items.map((row) => (
                  <tr key={row.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "0.4rem", whiteSpace: "nowrap" }}>
                      {new Date(row.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td style={{ padding: "0.4rem" }}>{row.store.name}</td>
                    <td style={{ padding: "0.4rem" }}>{row.reason}</td>
                    <td style={{ padding: "0.4rem", maxWidth: "220px" }} className="text-muted">
                      {row.categoryText ?? "—"}
                      {row.normalizedCategoryKey ? (
                        <div style={{ marginTop: "0.25rem" }}>
                          <Link
                            href={`/admin/category-overrides?q=${encodeURIComponent(row.normalizedCategoryKey)}&source=${encodeURIComponent(row.feedSource ?? "")}`}
                            style={{ fontSize: "0.72rem" }}
                          >
                            Override ekranında aç
                          </Link>
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: "0.4rem", maxWidth: "180px", wordBreak: "break-all" }}>
                      {row.normalizedCategoryKey ?? "—"}
                    </td>
                    <td style={{ padding: "0.4rem" }}>{row.categoryResolutionMethod ?? "—"}</td>
                    <td style={{ padding: "0.4rem", maxWidth: "260px" }}>
                      <div style={{ fontWeight: 500 }}>{row.title ?? "—"}</div>
                      <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                        {row.externalId ?? ""}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem" }}>
              <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                Toplam {skipsQuery.data.total} kayıt
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
                  disabled={page * skipsQuery.data.pageSize >= skipsQuery.data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sonraki
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
