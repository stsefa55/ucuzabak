"use client";

import {
  AUTO_CATEGORY_MATCH_THRESHOLD,
  CATEGORY_SUGGESTION_OK,
  CATEGORY_SUGGESTION_STRONG,
  bestCanonicalCategoryBySimilarity,
  lastCategorySegmentForSimilarity,
  scoreQueryAgainstCanonical
} from "@ucuzabak/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

type AdminCategory = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
};

type OverrideRow = {
  id: number;
  source: string;
  matchScope: "FULL" | "LAST_SEGMENT";
  normalizedKey: string;
  categoryId: number;
  confidence: number;
  isManual: boolean;
  rawSourceText: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string; slug: string; parentId: number | null };
};

type ListResponse = {
  items: OverrideRow[];
  total: number;
  page: number;
  pageSize: number;
};

type UnmappableRow = {
  source: string;
  normalizedKey: string;
  sampleRawText: string | null;
  count: number;
  lastImpactCount: number;
  latestAt: string;
  hasFullOverride: boolean;
  hasLastSegmentOverride: boolean;
};

type UnmappableResponse = {
  items: UnmappableRow[];
  total: number;
  page: number;
  pageSize: number;
};

const DEFAULT_SOURCE = "trendyol";

function buildCategoryPathMap(categories: AdminCategory[]): Map<number, string> {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const out = new Map<number, string>();
  const visiting = new Set<number>();

  const labelOf = (id: number): string => {
    if (out.has(id)) return out.get(id)!;
    if (visiting.has(id)) {
      const fallback = byId.get(id)?.name ?? String(id);
      out.set(id, fallback);
      return fallback;
    }
    visiting.add(id);
    const cur = byId.get(id);
    if (!cur) {
      visiting.delete(id);
      return String(id);
    }
    const parentLabel = cur.parentId ? labelOf(cur.parentId) : "";
    const label = parentLabel ? `${parentLabel} › ${cur.name}` : cur.name;
    out.set(id, label);
    visiting.delete(id);
    return label;
  };

  for (const c of categories) labelOf(c.id);
  return out;
}

function incomingLabel(row: UnmappableRow): string {
  return row.sampleRawText?.trim() || row.normalizedKey;
}

function displayIncomingFromOverride(row: OverrideRow): string {
  return row.rawSourceText?.trim() || row.normalizedKey;
}

function parseApiError(err: unknown): string {
  const e = err as { message?: string };
  const raw = typeof e?.message === "string" ? e.message : "";
  try {
    const j = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(j.message)) return String(j.message[0] ?? "İşlem başarısız.");
    if (typeof j.message === "string") return j.message;
  } catch {
    if (raw && !raw.startsWith("{")) return raw.slice(0, 280);
  }
  return "İşlem başarısız.";
}

function suggestionBadgeColors(score: number): { background: string; color: string } {
  if (score > CATEGORY_SUGGESTION_STRONG) return { background: "#dcfce7", color: "#166534" };
  if (score >= CATEGORY_SUGGESTION_OK) return { background: "#fef9c3", color: "#854d0e" };
  return { background: "#fee2e2", color: "#991b1b" };
}

type Suggestion = { id: number; score: number; path: string; name: string };

function computeSuggestion(incoming: string, categories: AdminCategory[], pathMap: Map<number, string>): Suggestion | null {
  const best = bestCanonicalCategoryBySimilarity(incoming, categories);
  if (!best || best.score <= 0) return null;
  const c = categories.find((x) => x.id === best.id);
  if (!c) return null;
  return {
    id: best.id,
    score: best.score,
    path: pathMap.get(c.id) ?? c.name,
    name: c.name
  };
}

function CategoryPicker(props: {
  categories: AdminCategory[];
  pathMap: Map<number, string>;
  incomingText: string;
  value: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
}) {
  const { categories, pathMap, incomingText, value, onChange, disabled } = props;
  const [q, setQ] = useState("");
  const segment = useMemo(() => lastCategorySegmentForSimilarity(incomingText), [incomingText]);

  const scored = useMemo(() => {
    const list = categories.map((c) => {
      const path = pathMap.get(c.id) ?? c.name;
      return {
        c,
        path,
        score: scoreQueryAgainstCanonical(segment, c.name, c.slug)
      };
    });
    list.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path, "tr"));
    return list;
  }, [categories, pathMap, segment]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return scored;
    return scored.filter(
      ({ c, path }) =>
        path.toLowerCase().includes(qq) ||
        c.name.toLowerCase().includes(qq) ||
        c.slug.toLowerCase().includes(qq)
    );
  }, [scored, q]);

  const topSuggestions = useMemo(() => scored.filter((s) => s.score >= 0.12).slice(0, 4), [scored]);

  const selectSize = Math.min(12, Math.max(5, Math.min(filtered.length, 12)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {topSuggestions.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.35rem" }}>
          <span className="text-muted" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
            Öneri kısayolları:
          </span>
          {topSuggestions.map(({ c, path }) => (
            <button
              key={c.id}
              type="button"
              className="btn-secondary btn-sm"
              disabled={disabled}
              onClick={() => onChange(String(c.id))}
            >
              {(path.split("›").pop() ?? path).trim()}
            </button>
          ))}
        </div>
      ) : null}
      <input
        className="form-control"
        placeholder="Kategori ara (yazdıkça liste daralır)…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={disabled}
        style={{ fontSize: "0.85rem" }}
      />
      <select
        className="form-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        size={selectSize}
        style={{ height: "auto", fontSize: "0.82rem" }}
      >
        <option value="">Kategori seçin…</option>
        {filtered.slice(0, 100).map(({ c, path }) => (
          <option key={c.id} value={c.id}>
            {path}
          </option>
        ))}
      </select>
      {filtered.length > 100 ? (
        <span className="text-muted" style={{ fontSize: "0.7rem" }}>
          Çok sonuç: aramayı daraltın (ilk 100 gösteriliyor).
        </span>
      ) : null}
    </div>
  );
}

export default function AdminCategoryOverridesPage() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  const searchParams = useSearchParams();

  const initialSource = searchParams.get("source") ?? "";
  const initialQ = searchParams.get("q") ?? "";

  const [overridePage, setOverridePage] = useState(1);
  const [overrideSourceFilter, setOverrideSourceFilter] = useState(initialSource);
  const [overrideQ, setOverrideQ] = useState(initialQ);

  const [unmappablePage, setUnmappablePage] = useState(1);
  const [unmappableSourceFilter, setUnmappableSourceFilter] = useState(initialSource);
  const [unmappableQ, setUnmappableQ] = useState(initialQ);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualSource, setManualSource] = useState(initialSource.trim() || DEFAULT_SOURCE);
  const [manualIncoming, setManualIncoming] = useState("");
  const [manualCategoryId, setManualCategoryId] = useState("");

  const [rowCategoryId, setRowCategoryId] = useState<Record<string, string>>({});
  /** Kullanıcı tam seçici görmek istediğinde true */
  const [rowPickerOpen, setRowPickerOpen] = useState<Record<string, boolean>>({});

  const [editing, setEditing] = useState<OverrideRow | null>(null);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editPickerOpen, setEditPickerOpen] = useState(true);

  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const { data: categories } = useQuery<AdminCategory[]>({
    queryKey: ["admin-categories"],
    queryFn: () => apiFetch<AdminCategory[]>("/admin/categories", { accessToken }),
    enabled: !!accessToken
  });

  const categoryPathMap = useMemo(
    () => buildCategoryPathMap(categories ?? []),
    [categories]
  );

  const listQuery = useQuery<ListResponse>({
    queryKey: ["admin-category-overrides", overridePage, overrideSourceFilter, overrideQ],
    queryFn: () => {
      const p = new URLSearchParams();
      p.set("page", String(overridePage));
      p.set("pageSize", "50");
      if (overrideSourceFilter.trim()) p.set("source", overrideSourceFilter.trim());
      if (overrideQ.trim()) p.set("q", overrideQ.trim());
      return apiFetch<ListResponse>(`/admin/category-overrides?${p.toString()}`, { accessToken });
    },
    enabled: !!accessToken
  });

  const unmappableQuery = useQuery<UnmappableResponse>({
    queryKey: ["admin-category-unmappable", unmappablePage, unmappableSourceFilter, unmappableQ],
    queryFn: () => {
      const p = new URLSearchParams();
      p.set("page", String(unmappablePage));
      p.set("pageSize", "40");
      if (unmappableSourceFilter.trim()) p.set("source", unmappableSourceFilter.trim());
      if (unmappableQ.trim()) p.set("q", unmappableQ.trim());
      return apiFetch<UnmappableResponse>(`/admin/category-overrides/unmappable?${p.toString()}`, {
        accessToken
      });
    },
    enabled: !!accessToken
  });

  const showFeedbackOk = (text: string) => {
    setFeedback({ type: "ok", text });
    window.setTimeout(() => setFeedback((f) => (f?.text === text ? null : f)), 4500);
  };

  const createFromUnmappableMut = useMutation({
    mutationFn: ({ row, categoryId }: { row: UnmappableRow; categoryId: number }) =>
      apiFetch<OverrideRow>("/admin/category-overrides", {
        method: "POST",
        accessToken,
        body: {
          source: (row.source || DEFAULT_SOURCE).trim(),
          matchScope: "FULL",
          normalizedKey: row.normalizedKey,
          categoryId,
          confidence: 1,
          rawSourceText: row.sampleRawText?.trim() || undefined
        }
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-category-overrides"] });
      qc.invalidateQueries({ queryKey: ["admin-category-unmappable"] });
      qc.invalidateQueries({ queryKey: ["admin-ops-summary"] });
      const k = `${vars.row.source}:${vars.row.normalizedKey}`;
      setRowCategoryId((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
      setRowPickerOpen((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
      showFeedbackOk("Kategori başarıyla eşleştirildi");
    },
    onError: (e) => setFeedback({ type: "err", text: parseApiError(e) })
  });

  const createManualMut = useMutation({
    mutationFn: () =>
      apiFetch<OverrideRow>("/admin/category-overrides", {
        method: "POST",
        accessToken,
        body: {
          source: manualSource.trim() || DEFAULT_SOURCE,
          matchScope: "FULL",
          categoryId: Number(manualCategoryId),
          confidence: 1,
          rawSourceText: manualIncoming.trim()
        }
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-category-overrides"] });
      qc.invalidateQueries({ queryKey: ["admin-category-unmappable"] });
      qc.invalidateQueries({ queryKey: ["admin-ops-summary"] });
      setManualIncoming("");
      setManualCategoryId("");
      showFeedbackOk("Kategori başarıyla eşleştirildi");
    },
    onError: (e) => setFeedback({ type: "err", text: parseApiError(e) })
  });

  const patchMut = useMutation({
    mutationFn: (categoryIdOverride?: number) => {
      if (!editing) throw new Error("no edit");
      const cid = categoryIdOverride ?? Number(editCategoryId);
      if (!Number.isFinite(cid) || cid <= 0) throw new Error("Geçersiz kategori.");
      return apiFetch<OverrideRow>(`/admin/category-overrides/${editing.id}`, {
        method: "PATCH",
        accessToken,
        body: {
          matchScope: "FULL",
          categoryId: cid,
          confidence: 1
        }
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-category-overrides"] });
      qc.invalidateQueries({ queryKey: ["admin-category-unmappable"] });
      qc.invalidateQueries({ queryKey: ["admin-ops-summary"] });
      setEditing(null);
      showFeedbackOk("Kategori başarıyla eşleştirildi");
    },
    onError: (e) => setFeedback({ type: "err", text: parseApiError(e) })
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ ok: boolean }>(`/admin/category-overrides/${id}`, {
        method: "DELETE",
        accessToken
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-category-overrides"] });
      qc.invalidateQueries({ queryKey: ["admin-category-unmappable"] });
      qc.invalidateQueries({ queryKey: ["admin-ops-summary"] });
      showFeedbackOk("Eşleştirme kaldırıldı");
    },
    onError: (e) => setFeedback({ type: "err", text: parseApiError(e) })
  });

  if (!accessToken) return null;

  const cats = categories ?? [];

  function rowKey(row: UnmappableRow) {
    return `${row.source}:${row.normalizedKey}`;
  }

  function getRowSelectedCategoryId(row: UnmappableRow, suggestion: Suggestion | null): string {
    const k = rowKey(row);
    if (rowCategoryId[k] !== undefined) return rowCategoryId[k];
    if (suggestion && suggestion.score >= AUTO_CATEGORY_MATCH_THRESHOLD) {
      return String(suggestion.id);
    }
    if (suggestion && suggestion.score >= 0.2) return String(suggestion.id);
    return "";
  }

  function setRowSelected(row: UnmappableRow, id: string) {
    setRowCategoryId((prev) => ({ ...prev, [rowKey(row)]: id }));
  }

  function isPickerOpenForRow(row: UnmappableRow, suggestion: Suggestion | null): boolean {
    const k = rowKey(row);
    if (rowPickerOpen[k] !== undefined) return rowPickerOpen[k]!;
    if (suggestion && suggestion.score >= CATEGORY_SUGGESTION_OK) return false;
    return true;
  }

  function startEdit(row: OverrideRow) {
    setEditing(row);
    setEditCategoryId(String(row.categoryId));
    setEditPickerOpen(true);
  }

  function cancelEdit() {
    setEditing(null);
    setEditCategoryId("");
  }

  const editSuggestion = editing
    ? computeSuggestion(displayIncomingFromOverride(editing), cats, categoryPathMap)
    : null;

  return (
    <div className="card admin-page" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <AdminPageHeader
        title="Kategori eşleştirme"
        description="Gelen kategori adlarını sitenizdeki kategorilere bağlayın. Aşağıda önce bekleyenler, sonra kayıtlı kurallar listelenir."
      />

      <div
        className="admin-panel"
        style={{
          background: "linear-gradient(180deg, #f0f9ff 0%, #fff 100%)",
          border: "1px solid #bae6fd"
        }}
      >
        <h2 className="admin-panel__title" style={{ marginBottom: "0.5rem" }}>
          Kategori Eşleştirme
        </h2>
        <p style={{ fontSize: "0.9rem", lineHeight: 1.55, margin: "0 0 0.75rem", color: "#0c4a6e" }}>
          Mağazalardan gelen kategori adları sisteminizdeki kategorilerle birebir aynı olmayabilir. Bu ekranda gelen
          kategoriyi doğru kategoriye bağlayabilirsiniz.
        </p>
        <div
          style={{
            fontSize: "0.85rem",
            padding: "0.65rem 0.85rem",
            borderRadius: 8,
            background: "#fff",
            border: "1px solid #e0f2fe",
            lineHeight: 1.5
          }}
        >
          <strong>Örnek:</strong> <em>Cep Telefonları</em> → <em>Cep Telefonu</em>
        </div>
      </div>

      {feedback ? (
        <div
          role="status"
          className={feedback.type === "ok" ? "admin-alert admin-alert--success" : "admin-alert admin-alert--danger"}
          style={{ margin: 0 }}
        >
          {feedback.text}
        </div>
      ) : null}

      {editing ? (
        <div className="admin-panel" style={{ border: "2px solid var(--accent, #2563eb)" }}>
          <h2 className="admin-panel__title">Eşleştirmeyi düzenle</h2>
          <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            Gelen: <strong>{displayIncomingFromOverride(editing)}</strong>
            <span style={{ marginLeft: "0.5rem" }}>
              Mağaza: <strong>{editing.source}</strong>
            </span>
          </p>
          {editSuggestion ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                flexWrap: "wrap",
                marginBottom: "0.65rem",
                padding: "0.35rem 0.55rem",
                borderRadius: 8,
                fontSize: "0.82rem",
                ...suggestionBadgeColors(editSuggestion.score)
              }}
            >
              Öneri: {displayIncomingFromOverride(editing)} → {editSuggestion.path} (%
              {Math.round(editSuggestion.score * 100)})
            </div>
          ) : null}
          {editPickerOpen ? (
            <CategoryPicker
              categories={cats}
              pathMap={categoryPathMap}
              incomingText={displayIncomingFromOverride(editing)}
              value={editCategoryId}
              onChange={setEditCategoryId}
              disabled={patchMut.isPending}
            />
          ) : (
            <p className="text-muted" style={{ fontSize: "0.82rem" }}>
              Seçili kategori: <strong>{categoryPathMap.get(Number(editCategoryId)) ?? "—"}</strong>
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button
              type="button"
              className="btn-primary"
              disabled={patchMut.isPending || !editCategoryId}
              onClick={() => patchMut.mutate(undefined)}
            >
              {patchMut.isPending ? "Kaydediliyor…" : "Kaydet"}
            </button>
            {editSuggestion ? (
              <button
                type="button"
                className="btn-secondary"
                disabled={patchMut.isPending}
                onClick={() => {
                  setEditCategoryId(String(editSuggestion.id));
                  patchMut.mutate(editSuggestion.id);
                }}
              >
                Öneriyi kabul et
              </button>
            ) : null}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditPickerOpen((v) => !v)}
              disabled={patchMut.isPending}
            >
              {editPickerOpen ? "Listeyi gizle" : "Başka kategori seç"}
            </button>
            <button type="button" className="btn-secondary" onClick={cancelEdit} disabled={patchMut.isPending}>
              Vazgeç
            </button>
          </div>
        </div>
      ) : null}

      <div className="admin-panel">
        <h2 className="admin-panel__title">Çözülemeyen kategoriler</h2>
        <p className="text-muted" style={{ fontSize: "0.82rem", marginBottom: "0.75rem", lineHeight: 1.45 }}>
          Mağazadan gelen kategori burada listelenir. Yeşil/sarı kutu sistem önerisidir; beğeniyorsanız{" "}
          <strong>Öneriyi kabul et</strong>, değilse <strong>Başka kategori seç</strong> ile listeyi açıp arayın.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          <input
            className="form-control"
            placeholder="Mağaza (örn. trendyol)"
            value={unmappableSourceFilter}
            onChange={(e) => {
              setUnmappablePage(1);
              setUnmappableSourceFilter(e.target.value);
            }}
            style={{ minWidth: "160px", maxWidth: 200 }}
          />
          <input
            className="form-control"
            placeholder="Gelen kategori ara…"
            value={unmappableQ}
            onChange={(e) => {
              setUnmappablePage(1);
              setUnmappableQ(e.target.value);
            }}
            style={{ minWidth: "220px", flex: 1 }}
          />
        </div>
        {unmappableQuery.isLoading && <p className="text-muted">Yükleniyor…</p>}
        {unmappableQuery.data && unmappableQuery.data.items.length === 0 ? (
          <p style={{ fontSize: "0.95rem", margin: 0, color: "#374151" }}>
            Şu anda eşleştirme bekleyen kategori yok.
            {(unmappableSourceFilter.trim() || unmappableQ.trim()) && (
              <span className="text-muted" style={{ display: "block", marginTop: 6, fontSize: "0.82rem" }}>
                Filtre uyguladıysanız sonuç çıkmıyor olabilir; filtreleri temizleyip tekrar deneyin.
              </span>
            )}
          </p>
        ) : null}
        {unmappableQuery.data && unmappableQuery.data.items.length > 0 ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {unmappableQuery.data.items.map((row) => {
                const incoming = incomingLabel(row);
                const suggestion = computeSuggestion(incoming, cats, categoryPathMap);
                const sel = getRowSelectedCategoryId(row, suggestion);
                const pickerOpen = isPickerOpenForRow(row, suggestion);
                const busy =
                  createFromUnmappableMut.isPending &&
                  createFromUnmappableMut.variables?.row.normalizedKey === row.normalizedKey &&
                  createFromUnmappableMut.variables?.row.source === row.source;
                const badge = suggestion ? suggestionBadgeColors(suggestion.score) : null;

                return (
                  <div
                    key={rowKey(row)}
                    style={{
                      padding: "0.9rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      background: "#fafafa"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.65rem",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: pickerOpen ? "0.65rem" : 0
                      }}
                    >
                      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.92rem", lineHeight: 1.35 }}>{incoming}</div>
                        <div className="text-muted" style={{ fontSize: "0.72rem", marginTop: "0.35rem" }}>
                          Mağaza: <strong>{row.source || "—"}</strong> · Etkilenen ürün: {row.count}
                          {row.latestAt
                            ? ` · Son: ${new Date(row.latestAt).toLocaleDateString("tr-TR")}`
                            : null}
                        </div>
                      </div>
                      {suggestion && badge ? (
                        <div
                          style={{
                            padding: "0.35rem 0.65rem",
                            borderRadius: 8,
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            maxWidth: "100%",
                            ...badge
                          }}
                        >
                          {incoming} → {suggestion.path} (%{Math.round(suggestion.score * 100)})
                        </div>
                      ) : (
                        <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                          Öneri bulunamadı — aşağıdan seçin.
                        </span>
                      )}
                    </div>

                    {pickerOpen ? (
                      <CategoryPicker
                        categories={cats}
                        pathMap={categoryPathMap}
                        incomingText={incoming}
                        value={sel}
                        onChange={(id) => setRowSelected(row, id)}
                        disabled={busy}
                      />
                    ) : (
                      <p className="text-muted" style={{ fontSize: "0.82rem", margin: "0 0 0.5rem" }}>
                        Seçili:{" "}
                        <strong>
                          {sel ? categoryPathMap.get(Number(sel)) ?? cats.find((c) => c.id === Number(sel))?.name : "—"}
                        </strong>
                      </p>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.65rem" }}>
                      {row.hasFullOverride ? (
                        <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                          Bu metin için kural zaten kayıtlı — aşağıdaki listeden düzenleyin.
                        </span>
                      ) : (
                        <>
                          {suggestion ? (
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={busy}
                              onClick={() =>
                                createFromUnmappableMut.mutate({
                                  row,
                                  categoryId: suggestion.id
                                })
                              }
                            >
                              {busy ? "Kaydediliyor…" : "Öneriyi kabul et"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={busy || !sel}
                            onClick={() =>
                              createFromUnmappableMut.mutate({
                                row,
                                categoryId: Number(sel)
                              })
                            }
                          >
                            {busy ? "Kaydediliyor…" : "Kaydet"}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={busy}
                            onClick={() =>
                              setRowPickerOpen((prev) => ({
                                ...prev,
                                [rowKey(row)]: !pickerOpen
                              }))
                            }
                          >
                            {pickerOpen ? "Listeyi gizle" : "Başka kategori seç"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.85rem" }}>
              <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                Toplam {unmappableQuery.data.total} kayıt
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={unmappablePage <= 1}
                  onClick={() => setUnmappablePage((p) => Math.max(1, p - 1))}
                >
                  Önceki
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={
                    unmappablePage * unmappableQuery.data.pageSize >= unmappableQuery.data.total
                  }
                  onClick={() => setUnmappablePage((p) => p + 1)}
                >
                  Sonraki
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="admin-panel">
        <h2 className="admin-panel__title">Kayıtlı eşleştirmeler</h2>
        <p className="text-muted" style={{ fontSize: "0.82rem", marginBottom: "0.75rem" }}>
          Manuel kurallar ve geçmiş kayıtlar. Düzenle veya sil.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          <input
            className="form-control"
            placeholder="Mağaza"
            value={overrideSourceFilter}
            onChange={(e) => {
              setOverridePage(1);
              setOverrideSourceFilter(e.target.value);
            }}
            style={{ minWidth: "140px" }}
          />
          <input
            className="form-control"
            placeholder="Gelen metin veya kategori ara…"
            value={overrideQ}
            onChange={(e) => {
              setOverridePage(1);
              setOverrideQ(e.target.value);
            }}
            style={{ minWidth: "220px", flex: 1 }}
          />
        </div>

        {listQuery.isLoading && <p className="text-muted">Yükleniyor…</p>}
        {listQuery.data && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {listQuery.data.items.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(100px, 0.35fr) minmax(120px, 1fr) minmax(100px, 0.8fr) auto",
                    gap: "0.65rem",
                    alignItems: "center",
                    padding: "0.65rem 0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: "0.85rem"
                  }}
                >
                  <div className="text-muted">{row.source}</div>
                  <div style={{ fontWeight: 500 }}>{displayIncomingFromOverride(row)}</div>
                  <div>{categoryPathMap.get(row.categoryId) ?? row.category.name}</div>
                  <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => startEdit(row)}>
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        if (confirm("Bu eşleştirmeyi silmek istediğinize emin misiniz?")) {
                          deleteMut.mutate(row.id);
                        }
                      }}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.85rem" }}>
              <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                Toplam {listQuery.data.total}
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={overridePage <= 1}
                  onClick={() => setOverridePage((p) => Math.max(1, p - 1))}
                >
                  Önceki
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={overridePage * listQuery.data.pageSize >= listQuery.data.total}
                  onClick={() => setOverridePage((p) => p + 1)}
                >
                  Sonraki
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <details
        className="admin-panel"
        open={manualOpen}
        onToggle={(e) => setManualOpen((e.target as HTMLDetailsElement).open)}
        style={{ padding: "0.75rem 1rem" }}
      >
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
          Listede yoksa manuel eşleştirme ekle
        </summary>
        <p className="text-muted" style={{ fontSize: "0.82rem", margin: "0.65rem 0", lineHeight: 1.45 }}>
          Feed’de gördüğünüz metni yazın; sistem iç anahtarı kendisi üretir. Mağaza alanı genelde <code>trendyol</code> gibi
          kısa addır.
        </p>
        <div style={{ display: "grid", gap: "0.65rem", maxWidth: 520, marginTop: "0.5rem" }}>
          <label className="form-label-admin">Mağaza kaynağı</label>
          <input
            className="form-control"
            value={manualSource}
            onChange={(e) => setManualSource(e.target.value)}
            placeholder="örn. trendyol"
          />
          <label className="form-label-admin">Gelen kategori (feed’de yazan metin)</label>
          <input
            className="form-control"
            value={manualIncoming}
            onChange={(e) => setManualIncoming(e.target.value)}
            placeholder="örn. Cep Telefonları"
          />
          <label className="form-label-admin">Sitenizdeki kategori</label>
          <CategoryPicker
            categories={cats}
            pathMap={categoryPathMap}
            incomingText={manualIncoming}
            value={manualCategoryId}
            onChange={setManualCategoryId}
            disabled={createManualMut.isPending}
          />
          <button
            type="button"
            className="btn-primary"
            style={{ justifySelf: "start" }}
            disabled={createManualMut.isPending || !manualIncoming.trim() || !manualCategoryId}
            onClick={() => createManualMut.mutate()}
          >
            {createManualMut.isPending ? "Kaydediliyor…" : "Eşleştirmeyi kaydet"}
          </button>
        </div>
      </details>
    </div>
  );
}
