"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

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

type BulkQuota = {
  limitActive: boolean;
  maxPerDay: number | null;
  usedToday: number;
  remaining: number | null;
  testModeDefault: boolean;
  confirmPhraseRequired: boolean;
  marketingOptOutCount?: number;
  bulkEligibleVerifiedCount?: number;
  note?: string;
};

export default function AdminBulkMailPage() {
  const { accessToken } = useAuthStore();
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("<p>Merhaba,</p>\n<p>...</p>");
  const [text, setText] = useState("");
  const [target, setTarget] = useState<"all_active" | "verified_only">("verified_only");
  const [showPreview, setShowPreview] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [testModeSynced, setTestModeSynced] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [result, setResult] = useState<{
    queuedRecipients: number;
    batches: number;
    testMode?: boolean;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const quotaQuery = useQuery({
    queryKey: ["admin-email-bulk-quota"],
    queryFn: () => apiFetch<BulkQuota>("/admin/email/bulk-quota", { accessToken }),
    enabled: !!accessToken
  });

  useEffect(() => {
    if (quotaQuery.data && !testModeSynced) {
      setTestMode(quotaQuery.data.testModeDefault);
      setTestModeSynced(true);
    }
  }, [quotaQuery.data, testModeSynced]);

  const sendMut = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; queuedRecipients: number; batches: number; testMode?: boolean }>(
        "/admin/email/send-bulk",
        {
          method: "POST",
          accessToken,
          body: {
            subject: subject.trim(),
            html,
            text: text.trim() || undefined,
            target,
            confirmSend: true,
            ...(quotaQuery.data?.confirmPhraseRequired || confirmPhrase.trim()
              ? { confirmPhrase: confirmPhrase.trim() || undefined }
              : {}),
            ...(testMode ? { testMode: true } : {})
          }
        }
      ),
    onSuccess: (data: { ok: boolean; queuedRecipients: number; batches: number; testMode?: boolean }) => {
      setResult({
        queuedRecipients: data.queuedRecipients,
        batches: data.batches,
        testMode: data.testMode
      });
      setErr(null);
      void quotaQuery.refetch();
    },
    onError: (e: unknown) => {
      setResult(null);
      setErr(parseErr(e));
    }
  });

  if (!accessToken) return null;

  return (
    <div className="card admin-page" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <AdminPageHeader
        title="Toplu e-posta"
        description={
          <>
            İşler kuyruğa eklenir; gönderim worker üzerinden yapılır. HTML güvenilir kullanıcılara özel olmalıdır.{" "}
            <a href="/admin/eposta-gunlugu" style={{ fontWeight: 600 }}>
              E-posta günlüğü
            </a>{" "}
            üzerinden gönderim ve hataları izleyebilirsiniz.
          </>
        }
      />

      {quotaQuery.data ? (
        <div
          style={{
            fontSize: "0.82rem",
            padding: "0.65rem 0.75rem",
            borderRadius: 8,
            background: "#f8fafc",
            border: "1px solid #e2e8f0"
          }}
        >
          {quotaQuery.data.limitActive ? (
            <div>
              <strong>Günlük kota:</strong> bugün kuyrukta {quotaQuery.data.usedToday} /{" "}
              {quotaQuery.data.maxPerDay} alıcı; kalan tahmini {quotaQuery.data.remaining ?? "—"}.
            </div>
          ) : (
            <div className="text-muted">Günlük üst sınır kapalı veya sınırsız (ortam değişkeni).</div>
          )}
          {typeof quotaQuery.data.marketingOptOutCount === "number" ? (
            <div style={{ marginTop: "0.35rem" }}>
              Pazarlama e-postasından çıkmış aktif kullanıcı:{" "}
              <strong>{quotaQuery.data.marketingOptOutCount}</strong>
              {typeof quotaQuery.data.bulkEligibleVerifiedCount === "number" ? (
                <>
                  {" "}
                  · Doğrulanmış ve toplu mail uygun:{" "}
                  <strong>{quotaQuery.data.bulkEligibleVerifiedCount}</strong>
                </>
              ) : null}
            </div>
          ) : null}
          {quotaQuery.data.note ? (
            <div className="text-muted" style={{ marginTop: "0.35rem", fontSize: "0.78rem" }}>
              {quotaQuery.data.note}
            </div>
          ) : null}
          {quotaQuery.data.testModeDefault ? (
            <div style={{ marginTop: "0.35rem", color: "#92400e" }}>
              Ortamda <strong>test modu</strong> açık: gerçek kullanıcılara gitmez (BULK_EMAIL_TEST_MODE).
            </div>
          ) : null}
          {quotaQuery.data.confirmPhraseRequired ? (
            <div style={{ marginTop: "0.35rem" }}>
              Üretim onayı: <code>BULK_EMAIL_CONFIRM_PHRASE</code> ile aynı metni aşağıya yazın.
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "0.75rem", maxWidth: 640 }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
          <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
          Test modu (yalnızca BULK_EMAIL_TEST_RECIPIENTS veya oturum e-postası)
        </label>
        <div>
          <label className="form-label-admin">Hedef kitle</label>
          <select
            className="form-control"
            value={target}
            onChange={(e) => setTarget(e.target.value as typeof target)}
            disabled={testMode}
          >
            <option value="verified_only">Yalnızca e-postası doğrulanmış aktif kullanıcılar</option>
            <option value="all_active">Tüm aktif kullanıcılar</option>
          </select>
        </div>
        {quotaQuery.data?.confirmPhraseRequired ? (
          <div>
            <label className="form-label-admin">Onay ifadesi</label>
            <input
              className="form-control"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="BULK_EMAIL_CONFIRM_PHRASE ile aynı"
            />
          </div>
        ) : null}
        <div>
          <label className="form-label-admin">Konu</label>
          <input className="form-control" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="form-label-admin">HTML gövde</label>
          <textarea
            className="form-control"
            rows={12}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}
          />
        </div>
        <div>
          <label className="form-label-admin">Düz metin (isteğe bağlı)</label>
          <textarea className="form-control" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" className="btn-secondary btn-sm" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "Önizlemeyi gizle" : "Önizleme"}
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={
            !subject.trim() ||
            !html.trim() ||
            sendMut.isPending ||
            (quotaQuery.data?.confirmPhraseRequired && !confirmPhrase.trim())
          }
          onClick={() => {
            const msg = testMode
              ? "Test modunda yalnızca test alıcılarına kuyruğa eklenecek. Onaylıyor musunuz?"
              : "Toplu e-posta gerçek kullanıcılara kuyruğa eklenecek. İkinci onay: devam edilsin mi?";
            if (!window.confirm(msg)) return;
            setResult(null);
            setErr(null);
            sendMut.mutate();
          }}
        >
          {sendMut.isPending ? "Kuyruğa ekleniyor…" : "Gönder"}
        </button>
      </div>

      {showPreview ? (
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "1rem",
            background: "#fff",
            maxHeight: 360,
            overflow: "auto"
          }}
        >
          <p className="form-label-admin" style={{ marginTop: 0 }}>
            Önizleme
          </p>
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      ) : null}

      {result ? (
        <p style={{ margin: 0, color: "#166534", fontSize: "0.9rem" }}>
          Kuyruğa alındı: {result.queuedRecipients} alıcı, {result.batches} batch
          {result.testMode ? " (test modu)" : ""}.
        </p>
      ) : null}
      {err ? <p className="text-danger" style={{ margin: 0 }}>{err}</p> : null}
    </div>
  );
}
