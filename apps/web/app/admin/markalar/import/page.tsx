"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useId, useState } from "react";
import { AdminPageHeader } from "../../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../../src/lib/api-client";
import { useAuthStore } from "../../../../src/stores/auth-store";

type BulkRow = {
  raw: string;
  name: string;
  slug: string;
  normalizedKey: string;
  status: string;
  messageTr: string;
};

type BulkResult = {
  dryRun: boolean;
  rows: BulkRow[];
  importableCount: number;
  createdCount: number;
  skippedCount: number;
  duplicateCount: number;
  genericSkippedCount: number;
  invalidCount: number;
  duplicateInFileCount: number;
  slugSuffixedCount: number;
};

const STATUS_LABEL: Record<string, string> = {
  importable: "İçe aktarılabilir",
  created: "Oluşturuldu",
  skipped_duplicate: "Atlandı (zaten var)",
  skipped_generic: "Atlandı (jenerik)",
  skipped_invalid: "Atlandı (geçersiz)",
  skipped_duplicate_in_file: "Atlandı (dosyada tekrar)",
  skipped_slug_unresolvable: "Atlandı (slug yok)"
};

export default function AdminBulkBrandsImportPage() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputId = useId();
  const [format, setFormat] = useState<"csv" | "lines">("csv");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<BulkResult | null>(null);
  const [importDone, setImportDone] = useState(false);

  const bulkMutation = useMutation({
    mutationFn: (opts: { dryRun: boolean }) =>
      apiFetch<BulkResult>("/admin/brands/bulk", {
        method: "POST",
        accessToken,
        body: { format, text, dryRun: opts.dryRun }
      }),
    onSuccess: (data, vars) => {
      setPreview(data);
      if (!vars.dryRun && data.createdCount > 0) {
        setImportDone(true);
        void queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      }
      if (vars.dryRun) setImportDone(false);
    }
  });

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const s = typeof reader.result === "string" ? reader.result : "";
        setText(s);
        setPreview(null);
        setImportDone(false);
      };
      reader.readAsText(f, "UTF-8");
      e.target.value = "";
    },
    []
  );

  if (!accessToken) return null;

  return (
    <div className="card admin-page">
      <AdminPageHeader
        title="Toplu marka içe aktarma"
        description={
          <>
            <Link href="/admin/markalar" className="text-muted" style={{ fontWeight: 600 }}>
              ← Markalar listesine dön
            </Link>
          </>
        }
      />

      <div
        className="admin-panel"
        style={{
          marginBottom: "1rem",
          padding: "1rem",
          background: "var(--card-bg, #f8fafc)",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          fontSize: "0.9rem",
          lineHeight: 1.55
        }}
      >
        <p style={{ margin: "0 0 0.5rem" }}>
          Bu alan, <strong>canonical markaları</strong> toplu olarak sisteme eklemek içindir.
        </p>
        <p style={{ margin: "0 0 0.5rem" }}>
          Ürünlerde markanın otomatik dolması için önce marka kaydı bulunmalıdır (feed import sıkı eşleşmesi aynı
          kalır).
        </p>
        <p style={{ margin: 0 }}>
          Aynı marka zaten varsa <strong>tekrar eklenmez</strong>. Önce önizleme, sonra içe aktarma önerilir.
        </p>
      </div>

      <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
        Örnek dosyalar:{" "}
        <a href="/samples/sample-brands.csv" download style={{ fontWeight: 600, textDecoration: "underline" }}>
          sample-brands.csv
        </a>
        {" · "}
        <a href="/samples/sample-brands.txt" download style={{ fontWeight: 600, textDecoration: "underline" }}>
          sample-brands.txt
        </a>
        <span className="text-muted"> (Genel Markalar örnekte yoktur.)</span>
      </p>

      <div className="admin-panel" style={{ marginBottom: "1rem" }}>
        <h2 className="admin-panel__title">Veri kaynağı</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "0.75rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="radio"
              name="fmt"
              checked={format === "csv"}
              onChange={() => {
                setFormat("csv");
                setPreview(null);
              }}
            />
            CSV (ilk satır: <code>name,slug</code> — slug boş bırakılabilir)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="radio"
              name="fmt"
              checked={format === "lines"}
              onChange={() => {
                setFormat("lines");
                setPreview(null);
              }}
            />
            Metin — satır başına bir marka adı
          </label>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <input id={fileInputId} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={onFile} />
          <label htmlFor={fileInputId} className="btn-secondary" style={{ cursor: "pointer", display: "inline-block" }}>
            CSV / metin dosyası yükle
          </label>
        </div>

        <label className="text-muted" style={{ fontSize: "0.75rem", display: "block", marginBottom: 4 }}>
          Yapıştırılan metin
        </label>
        <textarea
          className="input"
          rows={12}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null);
            setImportDone(false);
          }}
          placeholder={
            format === "csv"
              ? "name,slug\nPhilips,philips\nBosch,bosch"
              : "Philips\nBosch\nNetwork"
          }
          style={{ width: "100%", fontFamily: "ui-monospace, monospace", fontSize: "0.82rem" }}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
          <button
            type="button"
            className="btn-secondary"
            disabled={bulkMutation.isPending || !text.trim()}
            onClick={() => bulkMutation.mutate({ dryRun: true })}
          >
            Önizleme
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={
              bulkMutation.isPending || !text.trim() || !preview || preview.importableCount === 0
            }
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                !window.confirm(`${preview?.importableCount ?? 0} yeni marka oluşturulacak. Onaylıyor musunuz?`)
              ) {
                return;
              }
              bulkMutation.mutate({ dryRun: false });
            }}
            title={!preview || preview.importableCount === 0 ? "Önce önizleme çalıştırın" : undefined}
          >
            İçe aktar
          </button>
        </div>
        <p className="text-muted" style={{ fontSize: "0.78rem", marginTop: "0.5rem" }}>
          İçe aktar, son önizlemedeki aynı metin ve biçimle sunucuda tekrar işlenir. Metni değiştirdiyseniz önce yeniden
          önizleyin.
        </p>
      </div>

      {bulkMutation.isError && <p className="text-danger">İstek başarısız oldu.</p>}

      {preview && (
        <div className="admin-panel">
          <h2 className="admin-panel__title">Özet</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            <span>
              Mod: <strong>{preview.dryRun ? "önizleme" : "kayıt"}</strong>
            </span>
            <span>
              İçe aktarılabilir: <strong>{preview.importableCount}</strong>
            </span>
            <span>
              Oluşturulan: <strong>{preview.createdCount}</strong>
            </span>
            <span>
              Atlanan (toplam): <strong>{preview.skippedCount}</strong>
            </span>
            <span>
              Zaten vardı: <strong>{preview.duplicateCount}</strong>
            </span>
            <span>
              Jenerik atlandı: <strong>{preview.genericSkippedCount}</strong>
            </span>
            <span>
              Dosyada tekrar: <strong>{preview.duplicateInFileCount}</strong>
            </span>
            <span>
              Slug sonek (-2…): <strong>{preview.slugSuffixedCount}</strong>
            </span>
          </div>

          {importDone && preview.createdCount > 0 && (
            <div
              style={{
                padding: "0.75rem 1rem",
                marginBottom: "0.75rem",
                background: "rgba(34, 197, 94, 0.12)",
                border: "1px solid rgba(34, 197, 94, 0.35)",
                borderRadius: 6,
                fontSize: "0.88rem"
              }}
            >
              <strong>Markalar eklendi.</strong> Şimdi mevcut ürünlere marka atamak için{" "}
              <Link href="/admin/import-review" style={{ fontWeight: 700 }}>
                Import inceleme
              </Link>{" "}
              sayfasında <strong>Backfill önizleme (dry run)</strong> çalıştırabilir, ardından uygulayabilirsiniz.
            </div>
          )}

          <h3 className="admin-panel__title" style={{ fontSize: "0.95rem", marginTop: "0.5rem" }}>
            Satırlar
          </h3>
          <div className="admin-data-table-wrap">
            <table className="admin-data-table" style={{ fontSize: "0.78rem" }}>
              <thead>
                <tr>
                  <th>Ham</th>
                  <th>Ad</th>
                  <th>Normalize anahtar</th>
                  <th>Slug</th>
                  <th>Durum</th>
                  <th>Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ maxWidth: 140, wordBreak: "break-all" }} className="text-muted">
                      {r.raw}
                    </td>
                    <td>{r.name || "—"}</td>
                    <td style={{ maxWidth: 120, wordBreak: "break-all" }} className="text-muted">
                      {r.normalizedKey || "—"}
                    </td>
                    <td>
                      <code>{r.slug || "—"}</code>
                    </td>
                    <td>{STATUS_LABEL[r.status] ?? r.status}</td>
                    <td style={{ maxWidth: 280 }}>{r.messageTr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
