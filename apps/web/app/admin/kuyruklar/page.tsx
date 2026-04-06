"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";
import styles from "./page.module.css";

type FailedJob = {
  id: string | undefined;
  name: string | undefined;
  failedReason: string;
  timestamp?: number;
  processedOn?: number | undefined;
};

type QueueSnap = {
  name: string;
  counts: Record<string, number>;
  failedJobs: FailedJob[];
};

type QueueMetricsResponse =
  | { ok: true; email: QueueSnap; feedImport: QueueSnap }
  | { ok: false; error: string; email: null; feedImport: null };

/** BullMQ getJobCounts sırası — tutarlı kart düzeni */
const COUNT_KEYS = ["waiting", "active", "delayed", "completed", "failed", "paused"] as const;

const COUNT_LABELS: Record<(typeof COUNT_KEYS)[number], string> = {
  waiting: "Bekleyen",
  active: "Çalışan",
  delayed: "Ertelenen",
  completed: "Tamamlanan",
  failed: "Başarısız",
  paused: "Duraklatılmış"
};

const STAT_CLASS: Record<(typeof COUNT_KEYS)[number], string> = {
  waiting: styles.statWaiting,
  active: styles.statActive,
  delayed: styles.statDelayed,
  completed: styles.statCompleted,
  failed: styles.statFailed,
  paused: styles.statPaused
};

function QueueCard({ title, snap }: { title: string; snap: QueueSnap }) {
  return (
    <article className={styles.queueCard}>
      <div className={styles.queueCardHead}>
        <h2>
          {title}
          <span className={styles.queueTag}>{snap.name}</span>
        </h2>
      </div>
      <div className={styles.queueCardBody}>
        <div className={styles.statsGrid}>
          {COUNT_KEYS.map((key) => {
            const v = snap.counts[key] ?? 0;
            return (
              <div key={key} className={`${styles.statPill} ${STAT_CLASS[key]}`}>
                <div className={styles.statPillLabel}>{COUNT_LABELS[key]}</div>
                <div className={styles.statPillValue}>{v}</div>
              </div>
            );
          })}
        </div>

        <div>
          <p className={styles.failedSectionTitle}>Son başarısız işler (en fazla 15)</p>
          {snap.failedJobs.length === 0 ? (
            <p className={styles.emptyFailed}>Başarısız iş yok — kuyruk temiz görünüyor.</p>
          ) : (
            <ul className={styles.failedList}>
              {snap.failedJobs.map((j, i) => (
                <li key={`${j.id ?? i}-${j.timestamp ?? i}`} className={styles.failedItem}>
                  <div className={styles.failedItemHead}>
                    <span className={styles.jobName}>{j.name ?? "—"}</span>
                    <span className={styles.jobId}>iş no. {String(j.id ?? "—")}</span>
                  </div>
                  <pre className={styles.failedReason}>{j.failedReason?.trim() || "—"}</pre>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AdminQueuesPage() {
  const { accessToken } = useAuthStore();
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["admin-queue-metrics"],
    queryFn: () => apiFetch<QueueMetricsResponse>("/admin/operations/queue-metrics", { accessToken }),
    enabled: !!accessToken,
    refetchInterval: 30_000
  });

  if (!accessToken) return null;

  const lastRefresh =
    dataUpdatedAt > 0
      ? new Date(dataUpdatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : null;

  return (
    <div className={`card admin-page ${styles.page}`}>
      <div className={styles.topRow}>
        <div className={styles.titleBlock}>
          <h1>Kuyruk görünürlüğü</h1>
          <p>
            BullMQ üzerindeki <strong>e-posta</strong> ve <strong>feed-import</strong> kuyrukları salt okunur
            özetlenir. Redis kapalıysa veya bağlantı yoksa uyarı görürsünüz.
            {lastRefresh ? (
              <>
                {" "}
                <span className={styles.pulseDot} aria-hidden />
                Son veri: {lastRefresh} · yaklaşık 30 sn&apos;de bir yenilenir.
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className={`btn-primary btn-sm ${styles.refreshBtn}`}
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? "Yenileniyor…" : "Şimdi yenile"}
        </button>
      </div>

      <aside className={styles.infoCallout} aria-label="Açıklama">
        <strong>Veritabanını sıfırladım; sayılarda hâlâ eski işler görünüyor — normal mi?</strong>
        <ul className={styles.infoList}>
          <li>
            <strong>Evet.</strong> Tamamlanan / başarısız sayıları ve başarısız iş listesi{" "}
            <strong>Redis</strong> içinde tutulur; PostgreSQL <code>migrate</code> veya seed bunları silmez.
          </li>
          <li>
            Geliştirme ortamında Redis&apos;i komple boşaltmak için (dikkat: tüm kuyruk verisi gider):{" "}
            <code>docker compose exec redis redis-cli FLUSHDB</code> veya Redis araçlarınızla aynı DB index.
          </li>
          <li>
            <code>getaddrinfo ENOTFOUND mailhog</code>: Worker SMTP sunucusuna erişemiyor — Mailhog konteyneri /
            <code>SMTP_HOST</code> ayarını kontrol edin.
          </li>
          <li>
            <code>matchedCount</code> sütunu yok: eksik migrasyon — API dizininde{" "}
            <code>pnpm exec prisma migrate deploy</code> çalıştırın.
          </li>
        </ul>
      </aside>

      {isLoading && <p className={styles.loading}>Kuyruk metrikleri yükleniyor…</p>}
      {error && <p className={styles.errorBanner}>Metrikler alınamadı. Redis ve API erişimini kontrol edin.</p>}

      {data && !data.ok ? <p className={styles.errorBanner}>{data.error}</p> : null}

      {data && data.ok ? (
        <div className={styles.queueGrid}>
          <QueueCard title="E-posta" snap={data.email} />
          <QueueCard title="Feed içe aktarma" snap={data.feedImport} />
        </div>
      ) : null}
    </div>
  );
}
