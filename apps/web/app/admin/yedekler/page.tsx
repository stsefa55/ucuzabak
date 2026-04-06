"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
import { apiFetch, getApiBaseUrl } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

type BackupRow = { id: string; sizeBytes: number; createdAt: string };

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function parseErr(err: unknown): string {
  const e = err as { message?: string };
  const raw = typeof e?.message === "string" ? e.message : "";
  try {
    const j = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(j.message)) return String(j.message[0] ?? "Hata");
    if (typeof j.message === "string") return j.message;
  } catch {
    if (raw && !raw.startsWith("{")) return raw;
  }
  return "İşlem başarısız.";
}

export default function AdminBackupsPage() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState("");
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-backups"],
    queryFn: async () => {
      const res = await apiFetch<{ backups: BackupRow[] }>("/admin/backups", { accessToken });
      return res.backups;
    },
    enabled: !!accessToken
  });

  const createMut = useMutation({
    mutationFn: () => apiFetch("/admin/backups/create", { method: "POST", accessToken }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-backups"] });
      setBanner({ type: "ok", text: "Yedek oluşturuldu." });
      setTimeout(() => setBanner(null), 5000);
    },
    onError: (e) => setBanner({ type: "err", text: parseErr(e) })
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/backups/${encodeURIComponent(id)}`, { method: "DELETE", accessToken }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-backups"] });
      setBanner({ type: "ok", text: "Yedek silindi." });
      setTimeout(() => setBanner(null), 4000);
    },
    onError: (e) => setBanner({ type: "err", text: parseErr(e) })
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean; preRestoreSnapshotId?: string }>("/admin/backups/restore", {
        method: "POST",
        accessToken,
        body: { id, confirm: "RESTORE_DATABASE" }
      }),
    onSuccess: (res) => {
      setRestoreId(null);
      setConfirmRestore("");
      const snap = res?.preRestoreSnapshotId;
      setBanner({
        type: "ok",
        text: snap
          ? `Geri yükleme tamamlandı. Önce otomatik snapshot: ${snap}`
          : "Geri yükleme tamamlandı."
      });
      void qc.invalidateQueries({ queryKey: ["admin-backups"] });
      void qc.invalidateQueries({ queryKey: ["admin-backup-restore-logs"] });
      setTimeout(() => setBanner(null), 8000);
    },
    onError: (e) => setBanner({ type: "err", text: parseErr(e) })
  });

  const restoreLogsQuery = useQuery({
    queryKey: ["admin-backup-restore-logs"],
    queryFn: () =>
      apiFetch<{
        items: Array<{
          id: number;
          targetBackupFile: string;
          preRestoreSnapshotFile: string | null;
          success: boolean;
          errorText: string | null;
          createdAt: string;
        }>;
        total: number;
      }>("/admin/backups/restore-logs?page=1&pageSize=15", { accessToken }),
    enabled: !!accessToken
  });

  if (!accessToken) return null;

  async function handleDownload(id: string) {
    setDownloadingId(id);
    setBanner(null);
    try {
      const url = `${getApiBaseUrl()}/admin/backups/${encodeURIComponent(id)}/download`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "include"
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = id;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      setBanner({ type: "ok", text: `İndirildi: ${id}` });
      setTimeout(() => setBanner(null), 4000);
    } catch (e: unknown) {
      setBanner({ type: "err", text: parseErr(e) });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="card admin-page" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <AdminPageHeader
        title="Veritabanı yedekleri"
        description={
          <>
            Sunucuda <code>pg_dump</code> / <code>psql</code> kurulu olmalıdır. Geri yükleme mevcut veritabanını{" "}
            <strong>değiştirir</strong>; üretimde dikkatli kullanın. Her geri yüklemeden önce otomatik yeni bir{" "}
            <code>pg_dump</code> alınır ve kayıt <code>BackupRestoreLog</code> tablosuna yazılır.
          </>
        }
      />

      {banner ? (
        <div
          className={`admin-alert ${banner.type === "ok" ? "admin-alert--success" : "admin-alert--danger"}`}
          style={{ marginBottom: 0 }}
        >
          {banner.text}
        </div>
      ) : null}

      <div>
        <button
          type="button"
          className="btn-primary"
          disabled={createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          {createMut.isPending ? "Yedekleniyor…" : "Şimdi yedek al"}
        </button>
      </div>

      {isLoading && <p className="text-muted">Liste yükleniyor…</p>}
      {error && <p className="text-danger">Yedek listesi alınamadı.</p>}

      {data && data.length === 0 ? (
        <p className="home-section__empty" style={{ margin: 0 }}>
          Henüz yedek yok. Yukarıdaki düğmeyle oluşturabilirsiniz.
        </p>
      ) : null}

      {data && data.length > 0 ? (
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Dosya</th>
                <th>Tarih</th>
                <th>Boyut</th>
                <th style={{ textAlign: "right" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{b.id}</td>
                  <td>{new Date(b.createdAt).toLocaleString("tr-TR")}</td>
                  <td>{formatBytes(b.sizeBytes)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      style={{ marginRight: 8 }}
                      disabled={downloadingId === b.id}
                      onClick={() => void handleDownload(b.id)}
                    >
                      {downloadingId === b.id ? "…" : "İndir"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      style={{ marginRight: 8 }}
                      onClick={() => {
                        setRestoreId(b.id);
                        setConfirmRestore("");
                      }}
                    >
                      Geri yükle
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      style={{ color: "#b91c1c" }}
                      disabled={deleteMut.isPending}
                      onClick={() => {
                        if (window.confirm(`“${b.id}” silinsin mi?`)) deleteMut.mutate(b.id);
                      }}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {restoreId ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 80,
            padding: 16
          }}
        >
          <div className="card admin-page" style={{ maxWidth: 420, width: "100%" }}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Geri yükleme onayı</h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 0.75rem" }}>
              <code>{restoreId}</code> dosyası veritabanına uygulanacak. Bu işlem geri alınamaz.
            </p>
            <label className="form-label-admin">Onay metni</label>
            <input
              className="form-control"
              placeholder="RESTORE_DATABASE"
              value={confirmRestore}
              onChange={(e) => setConfirmRestore(e.target.value)}
              style={{ marginBottom: "0.75rem" }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setRestoreId(null)}>
                Vazgeç
              </button>
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={confirmRestore !== "RESTORE_DATABASE" || restoreMut.isPending}
                onClick={() => restoreMut.mutate(restoreId)}
              >
                {restoreMut.isPending ? "Uygulanıyor…" : "Geri yükle"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="admin-panel" style={{ marginBottom: 0, marginTop: "0.25rem" }}>
        <h2 className="admin-panel__title">Son geri yükleme kayıtları</h2>
        {restoreLogsQuery.isLoading && <p className="text-muted">Yükleniyor…</p>}
        {restoreLogsQuery.data && restoreLogsQuery.data.items.length === 0 ? (
          <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
            Henüz kayıt yok.
          </p>
        ) : null}
        {restoreLogsQuery.data && restoreLogsQuery.data.items.length > 0 ? (
          <div className="admin-data-table-wrap">
            <table className="admin-data-table" style={{ fontSize: "0.78rem" }}>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Hedef dosya</th>
                  <th>Önce snapshot</th>
                  <th>Sonuç</th>
                </tr>
              </thead>
              <tbody>
                {restoreLogsQuery.data.items.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleString("tr-TR")}</td>
                    <td style={{ fontFamily: "monospace" }}>{r.targetBackupFile}</td>
                    <td style={{ fontFamily: "monospace" }}>{r.preRestoreSnapshotFile ?? "—"}</td>
                    <td>
                      {r.success ? (
                        <span style={{ color: "#166534" }}>OK</span>
                      ) : (
                        <span style={{ color: "#b91c1c" }} title={r.errorText ?? ""}>
                          Hata
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
