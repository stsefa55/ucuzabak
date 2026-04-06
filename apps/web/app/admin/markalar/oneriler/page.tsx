"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "../../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../../src/lib/api-client";
import { useAuthStore } from "../../../../src/stores/auth-store";

type Classification = "STRONG" | "NORMALIZABLE" | "SUSPICIOUS" | "GENERIC";

type SuggestionItem = {
  mergeKey: string;
  rawBrand: string;
  count: number;
  classification: Classification;
  suggestedCanonical: string;
  suggestedSlug: string;
  normalizedKey: string;
  alreadyCanonical: boolean;
  existingBrandId: number | null;
  existingBrandName: string | null;
};

type SuggestionsResponse = {
  source: string;
  merge: boolean;
  limit: number;
  minCount: number;
  total: number;
  byClass: Record<string, number>;
  items: SuggestionItem[];
};

type BulkResult = {
  skippedAsGeneric: string[];
  bulk: {
    dryRun: boolean;
    createdCount: number;
    importableCount: number;
    skippedCount: number;
    duplicateCount: number;
    rows: { name: string; slug: string; status: string; messageTr: string }[];
  };
};

const CLASS_LABEL: Record<Classification, string> = {
  STRONG: "Güçlü",
  NORMALIZABLE: "Düzeltilebilir",
  SUSPICIOUS: "Şüpheli",
  GENERIC: "Jenerik (ekleme)"
};

const FILTER_ALL = "ALL" as const;

export default function AdminFeedBrandSuggestionsPage() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<typeof FILTER_ALL | Classification>(FILTER_ALL);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [lastApprove, setLastApprove] = useState<BulkResult | null>(null);

  const { data, isLoading, error, refetch } = useQuery<SuggestionsResponse>({
    queryKey: ["feed-brand-suggestions"],
    queryFn: () =>
      apiFetch<SuggestionsResponse>("/admin/operations/feed-brand-suggestions?limit=2000&minCount=1", {
        accessToken
      }),
    enabled: !!accessToken
  });

  useEffect(() => {
    if (!data?.items) return;
    setEdits((prev) => {
      const next = { ...prev };
      for (const it of data.items) {
        if (next[it.mergeKey] === undefined) {
          next[it.mergeKey] = it.suggestedCanonical;
        }
      }
      return next;
    });
  }, [data?.items]);

  const visibleItems = useMemo(() => {
    if (!data?.items) return [];
    if (filter === FILTER_ALL) return data.items;
    return data.items.filter((i) => i.classification === filter);
  }, [data?.items, filter]);

  const toggle = useCallback((mergeKey: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(mergeKey)) n.delete(mergeKey);
      else n.add(mergeKey);
      return n;
    });
  }, []);

  const selectByClass = useCallback(
    (c: Classification) => {
      if (!data?.items) return;
      setSelected((prev) => {
        const n = new Set(prev);
        for (const it of data.items) {
          if (it.classification === c && !it.alreadyCanonical) n.add(it.mergeKey);
        }
        return n;
      });
    },
    [data?.items]
  );

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const selectedPayload = useMemo(() => {
    const items: { canonicalName: string }[] = [];
    if (!data?.items) return items;
    const byKey = new Map(data.items.map((i) => [i.mergeKey, i]));
    for (const k of selected) {
      const row = byKey.get(k);
      if (!row || row.alreadyCanonical) continue;
      const name = (edits[k] ?? row.suggestedCanonical).trim();
      if (name.length >= 2) items.push({ canonicalName: name });
    }
    return items;
  }, [data?.items, selected, edits]);

  const approveMutation = useMutation({
    mutationFn: (dryRun: boolean) =>
      apiFetch<BulkResult>("/admin/operations/feed-brand-suggestions/approve", {
        method: "POST",
        accessToken,
        body: { items: selectedPayload, dryRun }
      }),
    onSuccess: (res, dryRun) => {
      setLastApprove(res);
      if (!dryRun && res.bulk.createdCount > 0) {
        void queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      }
    }
  });

  if (!accessToken) return null;

  return (
    <div className="card admin-page">
      <AdminPageHeader
        title="Marka önerileri ve toplu onay"
        description={
          <>
            <Link href="/admin/markalar" style={{ fontWeight: 600 }}>
              ← Markalar
            </Link>
            {" · "}
            Feed’deki ham marka metinleri (mağaza satırı specs) frekansla listelenir; sistem sınıflandırır. Yalnızca
            seçtikleriniz veritabanına yazılır.
          </>
        }
      />

      <div
        className="admin-panel"
        style={{ marginBottom: "1rem", fontSize: "0.88rem", lineHeight: 1.5 }}
      >
        <p style={{ margin: "0 0 0.5rem" }}>
          <strong>Toplu kabul:</strong> STRONG / NORMALIZABLE satırları işaretleyin; gerekirse «Önerilen canonical»
          sütununu düzenleyin. <strong>Jenerik</strong> satırları eklemeyin (atlanır). <strong>Şüpheli</strong> için
          metni düzelttikten sonra işaretleyebilirsiniz.
        </p>
        <p style={{ margin: 0 }} className="text-muted">
          Önce <strong>Önizleme (dry run)</strong>, sonra <strong>Kaydet</strong>. Mevcut canonical markalar satırda
          işaretli; tekrar eklenmez.
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem", alignItems: "center" }}>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void refetch()} disabled={isLoading}>
          Listeyi yenile
        </button>
        <span className="text-muted" style={{ fontSize: "0.8rem" }}>Filtre:</span>
        {([FILTER_ALL, "STRONG", "NORMALIZABLE", "SUSPICIOUS", "GENERIC"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
            onClick={() => setFilter(f)}
          >
            {f === FILTER_ALL ? "Tümü" : CLASS_LABEL[f as Classification]}
            {f !== FILTER_ALL && data?.byClass?.[f] != null ? ` (${data.byClass[f]})` : ""}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <button type="button" className="btn-secondary btn-sm" onClick={() => selectByClass("STRONG")}>
          STRONG olanları seç (yeni)
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => selectByClass("NORMALIZABLE")}>
          NORMALIZABLE seç (yeni)
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={clearSelection}>
          Seçimi temizle
        </button>
        <span className="text-muted" style={{ fontSize: "0.78rem" }}>
          Seçili: {selected.size} · Gönderilecek: {selectedPayload.length}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          type="button"
          className="btn-secondary"
          disabled={approveMutation.isPending || selectedPayload.length === 0}
          onClick={() => approveMutation.mutate(true)}
        >
          Önizleme (dry run)
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={approveMutation.isPending || selectedPayload.length === 0}
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              !window.confirm(`${selectedPayload.length} marka kaydı oluşturulacak (veya mükerrer atlanacak). Onaylıyor musunuz?`)
            ) {
              return;
            }
            approveMutation.mutate(false);
          }}
        >
          Kaydet
        </button>
        <Link href="/admin/import-review" className="btn-secondary" style={{ display: "inline-flex", alignItems: "center" }}>
          Import inceleme (backfill)
        </Link>
      </div>

      {isLoading && <p className="text-muted">Yükleniyor…</p>}
      {error && <p className="text-danger">Liste alınamadı.</p>}

      {data && (
        <p className="text-muted" style={{ fontSize: "0.82rem", marginBottom: "0.5rem" }}>
          Kaynak: {data.source} · Toplam satır: {data.total} · Birleştirme: {data.merge ? "açık" : "kapalı"}
        </p>
      )}

      {lastApprove && (
        <div
          className="admin-panel"
          style={{ marginBottom: "1rem", fontSize: "0.82rem" }}
        >
          <h3 className="admin-panel__title">Son işlem</h3>
          {lastApprove.skippedAsGeneric.length > 0 && (
            <p className="text-danger">
              Jenerik sayıldığı için atlanan: {lastApprove.skippedAsGeneric.slice(0, 8).join(", ")}
              {lastApprove.skippedAsGeneric.length > 8 ? "…" : ""}
            </p>
          )}
          <p>
            Oluşturulan: <strong>{lastApprove.bulk.createdCount}</strong> · İçe aktarılabilir (önizleme):{" "}
            <strong>{lastApprove.bulk.importableCount}</strong> · Mükerrer/atlanan:{" "}
            <strong>{lastApprove.bulk.skippedCount}</strong>
          </p>
          {lastApprove.bulk.dryRun && lastApprove.bulk.importableCount > 0 && (
            <p className="text-muted">Bu bir önizlemeydi; kaydetmek için «Kaydet» kullanın.</p>
          )}
          {!lastApprove.bulk.dryRun && lastApprove.bulk.createdCount > 0 && (
            <p style={{ marginTop: "0.35rem" }}>
              <strong>Markalar eklendi.</strong> Mevcut ürünlere atamak için{" "}
              <Link href="/admin/import-review" style={{ fontWeight: 700 }}>
                Import inceleme → backfill
              </Link>{" "}
              çalıştırın.
            </p>
          )}
        </div>
      )}

      {data && visibleItems.length > 0 && (
        <div className="admin-data-table-wrap">
          <table className="admin-data-table" style={{ fontSize: "0.78rem" }}>
            <thead>
              <tr>
                <th style={{ width: 36 }} />
                <th>Ham marka</th>
                <th>Önerilen canonical</th>
                <th>Slug</th>
                <th style={{ textAlign: "right" }}>Adet</th>
                <th>Durum</th>
                <th>DB</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((it) => {
                const checked = selected.has(it.mergeKey);
                const disabled = it.alreadyCanonical;
                return (
                  <tr key={it.mergeKey} style={{ opacity: disabled ? 0.55 : 1 }}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={!disabled && checked}
                        onChange={() => toggle(it.mergeKey)}
                        aria-label={`Seç: ${it.rawBrand}`}
                      />
                    </td>
                    <td style={{ maxWidth: 200, wordBreak: "break-word" }}>{it.rawBrand}</td>
                    <td style={{ minWidth: 160 }}>
                      <input
                        className="input"
                        style={{ fontSize: "0.78rem", padding: "0.25rem 0.4rem" }}
                        value={edits[it.mergeKey] ?? it.suggestedCanonical}
                        disabled={disabled}
                        onChange={(e) =>
                          setEdits((prev) => ({ ...prev, [it.mergeKey]: e.target.value }))
                        }
                      />
                    </td>
                    <td>
                      <code>{it.suggestedSlug}</code>
                    </td>
                    <td style={{ textAlign: "right" }}>{it.count}</td>
                    <td>
                      <span
                        title={it.normalizedKey}
                        style={{
                          fontWeight: 600,
                          color:
                            it.classification === "GENERIC"
                              ? "#b91c1c"
                              : it.classification === "SUSPICIOUS"
                                ? "#b45309"
                                : it.classification === "NORMALIZABLE"
                                  ? "#1d4ed8"
                                  : "#15803d"
                        }}
                      >
                        {it.classification}
                      </span>
                      <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                        {CLASS_LABEL[it.classification]}
                      </div>
                    </td>
                    <td>
                      {it.alreadyCanonical ? (
                        <span className="text-muted">Var ({it.existingBrandName})</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && visibleItems.length === 0 && <p className="text-muted">Bu filtrede satır yok.</p>}
    </div>
  );
}
