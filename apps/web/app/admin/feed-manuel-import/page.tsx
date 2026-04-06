"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
import { apiFetch, getApiBaseUrl } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

type StoreRow = { id: number; name: string; slug: string; status: string };

type FeedType = "XML" | "CSV" | "JSON_API";

type FeedImportRow = {
  id: number;
  storeId: number;
  type: string;
  status: string;
  totalItems?: number | null;
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  matchedCount: number;
  unmatchedCount: number;
  errorCount: number;
  errorLog: string | null;
  sourceRef: string | null;
  createdAt: string;
  store?: { name: string; slug: string };
};

function feedImportStageLabel(row: FeedImportRow): { title: string; detail: string } {
  switch (row.status) {
    case "PENDING":
      return {
        title: "Kuyrukta",
        detail: "Worker işi alınca dosya okunup işlenecek."
      };
    case "RUNNING": {
      const total = row.totalItems;
      if (total == null) {
        return {
          title: "Hazırlanıyor",
          detail: "Dosya okunuyor, içerik ayrıştırılıyor ve kategori/marka verileri yükleniyor."
        };
      }
      if (total === 0) {
        return {
          title: "İşleniyor",
          detail: "Feed’de işlenecek satır yok veya boş sonuç."
        };
      }
      return {
        title: "Satırlar işleniyor",
        detail: `Her satır için kategori, eşleştirme ve teklif güncellemesi yapılıyor (${row.processedCount} / ${total}).`
      };
    }
    case "SUCCESS":
      return { title: "Bitti", detail: "Tüm satırlar işlendi." };
    case "PARTIAL":
      return { title: "Bitti (kısmi hata)", detail: "Bazı satırlarda hata oluştu; özet ve günlük aşağıda." };
    case "FAILED":
      return { title: "Başarısız", detail: "İşlem tamamlanamadı; günlüğe bakın." };
    default:
      return { title: row.status, detail: "" };
  }
}

function parseErr(err: unknown): string {
  const e = err as { message?: string };
  const raw = typeof e?.message === "string" ? e.message : "";
  try {
    const j = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(j.message)) return String(j.message[0] ?? "Hata");
    if (typeof j.message === "string") return j.message;
  } catch {
    if (raw && !raw.startsWith("{")) return raw.slice(0, 500);
  }
  return "İşlem başarısız.";
}

export default function AdminManualFeedImportPage() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  const [storeId, setStoreId] = useState<string>("");
  const [feedType, setFeedType] = useState<FeedType>("XML");
  const [pasteContent, setPasteContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [lastImportId, setLastImportId] = useState<number | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [pasteErr, setPasteErr] = useState<string | null>(null);

  const storesQuery = useQuery({
    queryKey: ["admin-stores-list"],
    queryFn: () => apiFetch<StoreRow[]>("/admin/stores", { accessToken }),
    enabled: !!accessToken
  });

  const statusQuery = useQuery({
    queryKey: ["admin-feed-import", lastImportId],
    queryFn: () => apiFetch<FeedImportRow>(`/admin/feed-imports/${lastImportId}`, { accessToken }),
    enabled: !!accessToken && lastImportId != null,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "PENDING" || s === "RUNNING" ? 2000 : false;
    }
  });

  useEffect(() => {
    if (storesQuery.data?.length && !storeId) {
      setStoreId(String(storesQuery.data[0].id));
    }
  }, [storesQuery.data, storeId]);

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!accessToken || !storeId || !file) throw new Error("Mağaza ve dosya gerekli.");
      const url = `${getApiBaseUrl()}/admin/stores/${storeId}/manual-feed-import/upload`;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("feedType", feedType);
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
        credentials: "include"
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      return JSON.parse(text) as { id: number; status: string };
    },
    onSuccess: (data) => {
      setLastImportId(data.id);
      setUploadErr(null);
      void qc.invalidateQueries({ queryKey: ["admin-feed-imports"] });
    },
    onError: (e: unknown) => setUploadErr(parseErr(e))
  });

  const pasteMut = useMutation({
    mutationFn: () =>
      apiFetch<{ id: number; status: string }>(
        `/admin/stores/${storeId}/manual-feed-import/paste`,
        {
          method: "POST",
          accessToken,
          body: { feedType, content: pasteContent }
        }
      ),
    onSuccess: (data) => {
      setLastImportId(data.id);
      setPasteErr(null);
      void qc.invalidateQueries({ queryKey: ["admin-feed-imports"] });
    },
    onError: (e: unknown) => setPasteErr(parseErr(e))
  });

  if (!accessToken) return null;

  const st = statusQuery.data?.status;
  const row = statusQuery.data;
  const stage = row ? feedImportStageLabel(row) : null;
  const progressPct =
    row?.status === "RUNNING" &&
    row.totalItems != null &&
    row.totalItems > 0
      ? Math.min(100, Math.round((row.processedCount / row.totalItems) * 100))
      : null;

  return (
    <div className="card admin-page" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <AdminPageHeader
        title="Manuel feed import"
        description={
          <>
            <p style={{ margin: "0 0 0.5rem" }}>
              Sunucuya dosya yükleyin veya ham XML / JSON / CSV yapıştırın. İşlem worker kuyruğunda çalışır. Docker
              kullanıyorsanız <code>feed_imports</code> volume&apos;unun API ve worker&apos;da ortak olduğundan emin olun.
            </p>
            <p style={{ margin: 0, fontSize: "0.82rem" }}>
              <Link href="/admin/magazalar" style={{ fontWeight: 600 }}>
                Mağaza oluştur / düzenle
              </Link>
              {" · "}
              <Link href="/admin/feed-imports" style={{ fontWeight: 600 }}>
                Tüm import geçmişi
              </Link>
            </p>
          </>
        }
      />

      <div style={{ display: "grid", gap: "0.75rem", maxWidth: 560 }}>
        <label className="form-label-admin">Mağaza</label>
        <select
          className="form-control"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          disabled={!storesQuery.data?.length}
        >
          {(storesQuery.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.slug})
            </option>
          ))}
        </select>

        <label className="form-label-admin">Feed tipi (işleyici)</label>
        <select
          className="form-control"
          value={feedType}
          onChange={(e) => setFeedType(e.target.value as FeedType)}
        >
          <option value="XML">XML (Trendyol uyumlu ağaç)</option>
          <option value="JSON_API">JSON (esnek alan adları; dizi veya items/products)</option>
          <option value="CSV">CSV (Hepsiburada uyumlu)</option>
        </select>

        <div className="admin-panel" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
          <h3 className="admin-panel__title" style={{ fontSize: "0.9rem" }}>
            Örnek dosyalar
          </h3>
          <p className="text-muted" style={{ fontSize: "0.78rem", margin: "0 0 0.65rem", lineHeight: 1.5 }}>
            Seçtiğiniz feed tipine uygun minimal şablon; alan adları worker&apos;daki parser ile uyumludur. İndirip düzenleyerek
            yükleyebilir veya içeriği yapıştır alanına kopyalayabilirsiniz.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
            <a
              href="/samples/manual-feed/ornek-trendyol.xml"
              download="ornek-trendyol.xml"
              className="btn-secondary btn-sm"
            >
              XML örneği (.xml)
            </a>
            <a
              href="/samples/manual-feed/ornek-json-api.json"
              download="ornek-json-api.json"
              className="btn-secondary btn-sm"
            >
              JSON örneği (.json)
            </a>
            <a
              href="/samples/manual-feed/ornek-hepsiburada.csv"
              download="ornek-hepsiburada.csv"
              className="btn-secondary btn-sm"
            >
              CSV örneği (.csv)
            </a>
          </div>
          <ul className="text-muted" style={{ fontSize: "0.72rem", margin: "0.55rem 0 0", paddingLeft: "1.1rem", lineHeight: 1.45 }}>
            <li>
              <strong>XML:</strong> <code>products/product</code>; alanlar: id, title, brand, category, price, stock, url vb.
            </li>
            <li>
              <strong>JSON:</strong> kök dizi veya <code>items</code> / <code>products</code>; fiyat: price, salePrice, currentPrice…
            </li>
            <li>
              <strong>CSV:</strong> ilk satır başlık; sütunlar: id, title, brand, category, price, stock, url…
            </li>
          </ul>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>Dosya yükle</h3>
        <input type="file" accept=".xml,.json,.csv,.txt,text/xml,application/json,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            className="btn-primary"
            disabled={!storeId || !file || uploadMut.isPending}
            onClick={() => uploadMut.mutate()}
          >
            {uploadMut.isPending ? "Kuyruğa ekleniyor…" : "Yükle ve import başlat"}
          </button>
        </div>
        {uploadErr ? <p className="text-danger" style={{ fontSize: "0.85rem" }}>{uploadErr}</p> : null}
      </div>

      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>Ham içerik yapıştır</h3>
        <textarea
          className="form-control"
          rows={12}
          placeholder="XML, JSON veya CSV metni…"
          value={pasteContent}
          onChange={(e) => setPasteContent(e.target.value)}
          style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.78rem" }}
        />
        <div style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            className="btn-secondary"
            disabled={!storeId || !pasteContent.trim() || pasteMut.isPending}
            onClick={() => pasteMut.mutate()}
          >
            {pasteMut.isPending ? "Gönderiliyor…" : "Yapıştırılan içerikle import başlat"}
          </button>
        </div>
        {pasteErr ? <p className="text-danger" style={{ fontSize: "0.85rem" }}>{pasteErr}</p> : null}
      </div>

      {lastImportId != null ? (
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Son iş #{lastImportId} özeti
          </h3>
          {statusQuery.isLoading && <p className="text-muted">Durum yükleniyor…</p>}
          {statusQuery.data && stage && (
            <>
              <div
                className="admin-panel"
                style={{ marginBottom: "0.75rem", padding: "0.65rem 0.85rem" }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.25rem" }}>
                  Aşama: {stage.title}
                </div>
                {stage.detail ? (
                  <p className="text-muted" style={{ fontSize: "0.78rem", margin: 0, lineHeight: 1.45 }}>
                    {stage.detail}
                  </p>
                ) : null}
                {progressPct != null ? (
                  <div style={{ marginTop: "0.55rem" }}>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: "#e5e7eb",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: `${progressPct}%`,
                          height: "100%",
                          background: "var(--accent, #2563eb)",
                          transition: "width 0.35s ease"
                        }}
                      />
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.72rem", marginTop: "0.35rem" }}>
                      İlerleme: %{progressPct} — işlenen satır: {row!.processedCount}
                      {row!.totalItems != null ? ` / ${row!.totalItems}` : ""}
                    </div>
                  </div>
                ) : null}
              </div>
              <p className="text-muted" style={{ fontSize: "0.76rem", margin: "0 0 0.65rem", lineHeight: 1.45 }}>
                Ürünler ve mağaza teklifleri satır satır veritabanına yazılır; import bitmeden önce{" "}
                <Link href="/admin/urunler" style={{ fontWeight: 600 }}>
                  Admin → Ürünler
                </Link>{" "}
                veya vitrinde (önbellek varsa kısa gecikmeyle) yeni kayıtları görebilirsiniz. Özet sayılar iş bittikten
                sonra da kesinleşir.
              </p>
              <ul style={{ fontSize: "0.85rem", margin: 0, paddingLeft: "1.1rem" }}>
                <li>
                  Durum: <strong>{statusQuery.data.status}</strong>
                </li>
                <li>İşlenen satır: {statusQuery.data.processedCount}</li>
                {statusQuery.data.totalItems != null ? (
                  <li>Toplam satır (parse): {statusQuery.data.totalItems}</li>
                ) : null}
                <li>Oluşturulan (satır): {statusQuery.data.createdCount}</li>
                <li>Güncellenen: {statusQuery.data.updatedCount}</li>
                <li>Eşleşen (canonical ürüne bağlı): {statusQuery.data.matchedCount ?? 0}</li>
                <li>Eşleşmeyen (ürün ID yok): {statusQuery.data.unmatchedCount ?? 0}</li>
                <li>Hata sayısı: {statusQuery.data.errorCount}</li>
              </ul>
            </>
          )}
          {st === "SUCCESS" || st === "PARTIAL" || st === "FAILED" ? (
            <div style={{ marginTop: "0.75rem" }}>
              <div className="text-muted" style={{ fontSize: "0.78rem", marginBottom: "0.25rem" }}>
                Eşleşmemiş satırlar için mağaza ürün listesi ve operasyon ekranlarını kullanın; teklif sayısı ürün
                detayında görünür.
              </div>
              {statusQuery.data?.errorLog ? (
                <pre
                  style={{
                    fontSize: "0.72rem",
                    background: "#fef2f2",
                    padding: "0.5rem",
                    borderRadius: 6,
                    maxHeight: 200,
                    overflow: "auto"
                  }}
                >
                  {statusQuery.data.errorLog.slice(0, 4000)}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
