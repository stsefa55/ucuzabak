"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

type LogItem = {
  id: number;
  jobName: string;
  toEmail: string;
  subject: string;
  status: string;
  errorText?: string | null;
  bullJobId?: string | null;
  createdAt: string;
  canRetry: boolean;
};

type LogsResponse = { items: LogItem[]; total: number; page: number; pageSize: number };

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

export default function AdminEmailLogPage() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [jobName, setJobName] = useState("");
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const qs = new URLSearchParams({ page: String(page), pageSize: "30" });
  if (status === "SENT" || status === "FAILED") qs.set("status", status);
  if (jobName.trim()) qs.set("jobName", jobName.trim());

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-email-logs", page, status, jobName],
    queryFn: () => apiFetch<LogsResponse>(`/admin/email/logs?${qs.toString()}`, { accessToken }),
    enabled: !!accessToken
  });

  const retryMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/admin/email/logs/${id}/retry`, { method: "POST", accessToken }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-email-logs"] });
      setBanner({ type: "ok", text: "İş yeniden kuyruğa eklendi." });
      setTimeout(() => setBanner(null), 4000);
    },
    onError: (e: unknown) => setBanner({ type: "err", text: parseErr(e) })
  });

  if (!accessToken) return null;

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="card admin-page" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <AdminPageHeader
        title="E-posta günlüğü"
        description="Worker her gönderimi kaydeder. Başarısız kayıtlar için (veri varsa) yeniden kuyruğa alma."
        actions={
          <Link href="/admin/mail" className="btn-secondary btn-sm">
            Toplu e-posta
          </Link>
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
        <label style={{ fontSize: "0.85rem" }}>
          Durum
          <select
            className="form-control"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            style={{ marginLeft: 6, width: "auto", display: "inline-block" }}
          >
            <option value="">Tümü</option>
            <option value="SENT">Gönderildi</option>
            <option value="FAILED">Başarısız</option>
          </select>
        </label>
        <label style={{ fontSize: "0.85rem" }}>
          İş adı
          <input
            className="form-control"
            placeholder="örn. price_alert"
            value={jobName}
            onChange={(e) => {
              setPage(1);
              setJobName(e.target.value);
            }}
            style={{ marginLeft: 6, minWidth: 160 }}
          />
        </label>
      </div>

      {isLoading && <p className="text-muted">Yükleniyor…</p>}
      {error && <p className="text-danger">Liste alınamadı. `prisma migrate` ile EmailDeliveryLog tablosu oluşturulmuş olmalı.</p>}

      {data && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "0.4rem" }}>ID</th>
                  <th style={{ padding: "0.4rem" }}>Zaman</th>
                  <th style={{ padding: "0.4rem" }}>İş</th>
                  <th style={{ padding: "0.4rem" }}>Alıcı</th>
                  <th style={{ padding: "0.4rem" }}>Konu</th>
                  <th style={{ padding: "0.4rem" }}>Durum</th>
                  <th style={{ padding: "0.4rem" }}>Hata</th>
                  <th style={{ padding: "0.4rem" }}></th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-muted" style={{ padding: "1rem", textAlign: "center" }}>
                      Kayıt yok.
                    </td>
                  </tr>
                ) : (
                  data.items.map((row) => (
                    <tr key={row.id} style={{ borderTop: "1px solid #f1f5f9", verticalAlign: "top" }}>
                      <td style={{ padding: "0.4rem" }}>{row.id}</td>
                      <td style={{ padding: "0.4rem", whiteSpace: "nowrap" }}>
                        {new Date(row.createdAt).toLocaleString("tr-TR")}
                      </td>
                      <td style={{ padding: "0.4rem", fontFamily: "monospace" }}>{row.jobName}</td>
                      <td style={{ padding: "0.4rem" }}>{row.toEmail}</td>
                      <td style={{ padding: "0.4rem", maxWidth: 200 }}>{row.subject}</td>
                      <td style={{ padding: "0.4rem" }}>
                        {row.status === "FAILED" ? (
                          <span style={{ color: "#b91c1c", fontWeight: 600 }}>Başarısız</span>
                        ) : (
                          <span style={{ color: "#15803d" }}>Gönderildi</span>
                        )}
                      </td>
                      <td style={{ padding: "0.4rem", maxWidth: 220, wordBreak: "break-word" }}>
                        {row.errorText ?? "—"}
                      </td>
                      <td style={{ padding: "0.4rem", whiteSpace: "nowrap" }}>
                        {row.canRetry ? (
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            disabled={retryMut.isPending}
                            onClick={() => {
                              if (window.confirm("Bu kayıt için işi yeniden kuyruğa eklemek istiyor musunuz?")) {
                                setBanner(null);
                                retryMut.mutate(row.id);
                              }
                            }}
                          >
                            Yeniden dene
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.85rem" }}>
            <button type="button" className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Önceki
            </button>
            <span className="text-muted">
              Sayfa {page} / {totalPages} (toplam {data.total})
            </span>
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sonraki
            </button>
          </div>
        </>
      )}
    </div>
  );
}
