"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";
import styles from "./page.module.css";

type ServiceCheckRow = {
  id: string;
  label: string;
  status: "ok" | "fail" | "skip";
  latencyMs?: number;
  detail?: string;
  hint?: string;
};

type ServiceChecksResponse = {
  generatedAt: string;
  environment: string;
  emailTestEndpointAvailable: boolean;
  checks: ServiceCheckRow[];
};

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

function statusBadgeClass(s: ServiceCheckRow["status"]): string {
  if (s === "ok") return styles.badgeOk;
  if (s === "fail") return styles.badgeFail;
  return styles.badgeSkip;
}

function statusLabel(s: ServiceCheckRow["status"]): string {
  if (s === "ok") return "Tamam";
  if (s === "fail") return "Sorun";
  return "Atlandı";
}

export default function AdminServiceStatusPage() {
  const { accessToken, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (user?.email) setTestTo((t) => (t.trim() === "" ? user.email : t));
  }, [user?.email]);

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["admin-service-checks"],
    queryFn: () => apiFetch<ServiceChecksResponse>("/admin/operations/service-checks", { accessToken }),
    enabled: !!accessToken,
    refetchInterval: 60_000
  });

  const testEmailMut = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; queuedFor: string }>("/admin/test-email", {
        method: "POST",
        accessToken,
        body: testTo.trim() ? { to: testTo.trim() } : {}
      }),
    onSuccess: (res) => {
      setTestMsg({
        type: "ok",
        text: `İş Redis’teki e-posta kuyruğuna yazıldı (alıcı: ${res.queuedFor}). Bu sayfa mail göndermez; gönderimi ayrı çalışan worker + SMTP yapar. Worker kapalıysa veya SMTP yanlışsa posta gitmez — Kuyruklar sayfasından başarısız işlere bakın.`
      });
      void queryClient.invalidateQueries({ queryKey: ["admin-queue-metrics"] });
    },
    onError: (err) => setTestMsg({ type: "err", text: parseErr(err) })
  });

  if (!accessToken) return null;

  const lastAt =
    dataUpdatedAt > 0
      ? new Date(dataUpdatedAt).toLocaleString("tr-TR", {
          dateStyle: "short",
          timeStyle: "medium"
        })
      : null;

  return (
    <div className={`card admin-page ${styles.page}`}>
      <div className={styles.topRow}>
        <div className={styles.titleBlock}>
          <h1>Servis durumu</h1>
          <p>
            Veritabanı, Redis, SMTP portu (TCP) ve BullMQ kuyrukları için hızlı tanılama. Parola veya e-posta içeriği
            gösterilmez. Kuyruk detayı için{" "}
            <Link href="/admin/kuyruklar" style={{ fontWeight: 600 }}>
              Kuyruklar
            </Link>{" "}
            sayfasını kullanın.
          </p>
          {lastAt ? <div className={styles.meta}>Son kontrol: {lastAt} · ~60 sn otomatik yenileme</div> : null}
        </div>
        <button type="button" className="btn-primary btn-sm" disabled={isFetching} onClick={() => void refetch()}>
          {isFetching ? "Kontrol…" : "Yeniden çalıştır"}
        </button>
      </div>

      {isLoading && <p className={styles.loading}>Kontroller çalışıyor…</p>}
      {error && <p className="text-danger">Servis kontrolleri alınamadı.</p>}

      {data ? (
        <>
          <div className={styles.checkList}>
            {data.checks.map((c) => (
              <div key={c.id} className={styles.checkRow}>
                <span className={statusBadgeClass(c.status)}>{statusLabel(c.status)}</span>
                <div className={styles.checkBody}>
                  <h3>{c.label}</h3>
                  {c.detail ? <p className={styles.checkDetail}>{c.detail}</p> : null}
                  {c.hint ? <p className={styles.checkHint}>{c.hint}</p> : null}
                  {c.latencyMs != null ? <div className={styles.latency}>{c.latencyMs} ms</div> : null}
                </div>
              </div>
            ))}
          </div>

          <p className={styles.meta} style={{ margin: 0 }}>
            Ortam: <strong>{data.environment}</strong> · Sunucu zamanı: {new Date(data.generatedAt).toLocaleString("tr-TR")}
          </p>

          {data.emailTestEndpointAvailable ? (
            <div className={styles.actionCard}>
              <h2>E-posta kuyruğu testi (yalnızca geliştirme)</h2>
              <p style={{ marginBottom: "0.65rem" }}>
                <strong>Buradan doğrudan mail çıkmaz.</strong> API yalnızca Redis / BullMQ içinde{" "}
                <code style={{ fontSize: "0.85em" }}>email</code> kuyruğuna bir iş kaydı ekler. Asıl SMTP gönderimini{" "}
                <strong>ucuzabak-worker</strong> (veya Docker&apos;daki <code>worker</code> servisi) yapar.
              </p>
              <ol
                style={{
                  margin: "0 0 0.85rem",
                  paddingLeft: "1.2rem",
                  fontSize: "0.8125rem",
                  lineHeight: 1.55,
                  color: "#4338ca"
                }}
              >
                <li>Bu düğmeye basınca iş kuyruğa yazılır (başarı mesajı bunu doğrular).</li>
                <li>Worker çalışıyor olmalı; aksi halde iş bekler veya zaman aşımına düşer.</li>
                <li>
                  Worker&apos;ın <code>SMTP_HOST</code> / port ayarları doğru olmalı (ör. Mailhog:{" "}
                  <code>mailhog:1025</code>).
                </li>
              </ol>
              <div className={styles.actionRow}>
                <input
                  className="form-control"
                  type="email"
                  placeholder="Alıcı (boşsa oturum e-postanız, örn. admin@…)"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  autoComplete="email"
                />
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={testEmailMut.isPending}
                  onClick={() => {
                    setTestMsg(null);
                    testEmailMut.mutate();
                  }}
                >
                  {testEmailMut.isPending ? "Kuyruğa yazılıyor…" : "İşi kuyruğa ekle (mail API’den gitmez)"}
                </button>
              </div>
              {testMsg ? (
                <p className={testMsg.type === "ok" ? styles.msgOk : styles.msgErr}>{testMsg.text}</p>
              ) : null}
            </div>
          ) : (
            <p className={styles.prodNote}>
              <strong>Üretim modu:</strong> Admin test e-postası ucu kapalı. SMTP ve worker’ı doğrulamak için
              geliştirme ortamında bu sayfayı kullanın veya kuyruk / e-posta günlüklerini inceleyin.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
