"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";
import styles from "./page.module.css";

interface Store {
  id: number;
  name: string;
  slug: string;
  status: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  feedUrl?: string | null;
  feedIsActive?: boolean | null;
  feedImportIntervalLabel?: string | null;
}

type FeedIntervalPreset = "1h" | "24h";

function parseLabelToPreset(label: string | null | undefined): FeedIntervalPreset {
  const raw = (label || "").trim().toLowerCase();
  if (!raw) return "1h";
  if (raw === "1h" || raw === "hourly" || raw.includes("saatlik")) return "1h";
  if (
    raw === "24h" ||
    raw === "1d" ||
    raw === "daily" ||
    raw.includes("günlük") ||
    raw.includes("gunluk")
  ) {
    return "24h";
  }
  if (raw.includes("gün") || raw.includes("gun ")) return "24h";
  if (raw.includes("saat")) return "1h";
  return "1h";
}

function parseErr(err: unknown): string {
  const e = err as { message?: string };
  const raw = typeof e?.message === "string" ? e.message : "";
  try {
    const j = JSON.parse(raw) as { message?: string | string[]; error?: string };
    if (Array.isArray(j.message)) return String(j.message[0] ?? "Doğrulama hatası");
    if (typeof j.message === "string") return j.message;
  } catch {
    if (raw && !raw.startsWith("{")) return raw;
  }
  return "İşlem başarısız.";
}

export default function AdminStoresPage() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newStore, setNewStore] = useState({ name: "", slug: "", websiteUrl: "", logoUrl: "", status: "ACTIVE" });
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const { data, isLoading, error } = useQuery<Store[]>({
    queryKey: ["admin-stores"],
    queryFn: () => apiFetch<Store[]>("/admin/stores", { accessToken }),
    enabled: !!accessToken
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<Store>("/admin/stores", {
        method: "POST",
        accessToken,
        body: {
          name: newStore.name.trim(),
          slug: newStore.slug.trim(),
          websiteUrl: newStore.websiteUrl.trim() || undefined,
          logoUrl: newStore.logoUrl.trim() || undefined,
          status: newStore.status as "ACTIVE" | "INACTIVE"
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      setCreating(false);
      setNewStore({ name: "", slug: "", websiteUrl: "", logoUrl: "", status: "ACTIVE" });
      setMsg({ type: "ok", text: "Mağaza oluşturuldu." });
      setTimeout(() => setMsg(null), 4000);
    },
    onError: (err) => setMsg({ type: "err", text: parseErr(err) })
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/stores/${id}`, { method: "DELETE", accessToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      setMsg({ type: "ok", text: "Mağaza silindi." });
      setTimeout(() => setMsg(null), 4000);
    },
    onError: (err) => setMsg({ type: "err", text: parseErr(err) })
  });

  if (!accessToken) return null;

  return (
    <div className={`card admin-page ${styles.page}`}>
      <div className={styles.topBar}>
        <div className={styles.titleBlock}>
          <h1>Mağazalar</h1>
          <p>
            Feed URL, otomatik içe aktarma sıklığı (işçi sunucu mağaza bazında son tamamlanan importa göre planlar) ve
            manuel tetikleme.
          </p>
        </div>
        <button type="button" className="btn-primary btn-sm" onClick={() => setCreating((v) => !v)}>
          {creating ? "Formu kapat" : "Yeni mağaza"}
        </button>
      </div>

      {msg ? (
        <p className={msg.type === "ok" ? styles.alertOk : styles.alertErr}>{msg.text}</p>
      ) : null}

      {creating ? (
        <div className={styles.createPanel}>
          <h3 className={styles.createPanelTitle}>Yeni mağaza</h3>
          <div className={styles.fieldGroup}>
            <label className="form-label-admin">Ad</label>
            <input
              className="form-control"
              value={newStore.name}
              onChange={(e) => setNewStore((s) => ({ ...s, name: e.target.value }))}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className="form-label-admin">Slug</label>
            <input
              className="form-control"
              value={newStore.slug}
              onChange={(e) => setNewStore((s) => ({ ...s, slug: e.target.value }))}
              autoComplete="off"
            />
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Küçük harf, rakam ve tire; benzersiz olmalı.
            </span>
          </div>
          <div className={styles.fieldGroup}>
            <label className="form-label-admin">Web sitesi</label>
            <input
              className="form-control"
              value={newStore.websiteUrl}
              onChange={(e) => setNewStore((s) => ({ ...s, websiteUrl: e.target.value }))}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className="form-label-admin">Logo URL</label>
            <input
              className="form-control"
              value={newStore.logoUrl}
              onChange={(e) => setNewStore((s) => ({ ...s, logoUrl: e.target.value }))}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className="form-label-admin">Durum</label>
            <select
              className="form-control"
              value={newStore.status}
              onChange={(e) => setNewStore((s) => ({ ...s, status: e.target.value }))}
            >
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Pasif</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="button"
              className="btn-primary"
              disabled={!newStore.name.trim() || !newStore.slug.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "Kaydediliyor…" : "Oluştur"}
            </button>
          </div>
        </div>
      ) : null}

      {isLoading && <p className={styles.loadingState}>Yükleniyor…</p>}
      {error && <p className="text-danger">Mağazalar yüklenemedi.</p>}
      {data && data.length === 0 && !isLoading && (
        <p className={styles.emptyState}>Henüz mağaza yok. «Yeni mağaza» ile ekleyebilirsiniz.</p>
      )}
      {data && data.length > 0 && (
        <div className={styles.storeGrid}>
          {data.map((s) => (
            <StoreManageCard key={s.id} store={s} accessToken={accessToken!} onDelete={() => deleteMut.mutate(s.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function StoreManageCard({
  store,
  accessToken,
  onDelete
}: {
  store: Store;
  accessToken: string;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [feedUrl, setFeedUrl] = useState(store.feedUrl ?? "");
  const [feedIsActive, setFeedIsActive] = useState(store.feedIsActive ?? true);
  const [intervalPreset, setIntervalPreset] = useState<FeedIntervalPreset>(() =>
    parseLabelToPreset(store.feedImportIntervalLabel),
  );
  const [name, setName] = useState(store.name);
  const [slug, setSlug] = useState(store.slug);
  const [logoUrl, setLogoUrl] = useState(store.logoUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(store.websiteUrl ?? "");
  const [status, setStatus] = useState(store.status);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setFeedUrl(store.feedUrl ?? "");
    setFeedIsActive(store.feedIsActive ?? true);
    setIntervalPreset(parseLabelToPreset(store.feedImportIntervalLabel));
    setName(store.name);
    setSlug(store.slug);
    setLogoUrl(store.logoUrl ?? "");
    setWebsiteUrl(store.websiteUrl ?? "");
    setStatus(store.status);
  }, [
    store.id,
    store.feedUrl,
    store.feedIsActive,
    store.feedImportIntervalLabel,
    store.name,
    store.slug,
    store.logoUrl,
    store.websiteUrl,
    store.status
  ]);

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/admin/stores/${store.id}`, {
        method: "PATCH",
        body,
        accessToken
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      setSaveMessage({ type: "ok", text: "Değişiklikler kaydedildi." });
      setTimeout(() => setSaveMessage(null), 5000);
    },
    onError: (err) => {
      setSaveMessage({ type: "err", text: parseErr(err) });
      setTimeout(() => setSaveMessage(null), 10000);
    }
  });

  const importMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ id: number; status: string }>(`/admin/stores/${store.id}/import-feed`, {
        method: "POST",
        accessToken
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-feed-imports"] });
      setImportMessage({
        type: "success",
        text: `Import kuyruğa eklendi (ID: ${res.id}).`
      });
      setTimeout(() => setImportMessage(null), 8000);
    },
    onError: (err: Error & { message?: string }) => {
      let msg = err.message || "Import başlatılamadı.";
      try {
        const parsed = JSON.parse(msg);
        if (parsed.message) msg = parsed.message;
      } catch {
        /* */
      }
      setImportMessage({ type: "error", text: msg });
      setTimeout(() => setImportMessage(null), 8000);
    }
  });

  const displayName = name.trim() || store.name;
  const displaySlug = slug.trim() || store.slug;
  const displayLogo = logoUrl.trim() || store.logoUrl || null;
  const initial = (displayName || "?").trim().charAt(0).toUpperCase();

  const handleSave = () => {
    if (!name.trim()) {
      setSaveMessage({ type: "err", text: "Mağaza adı boş olamaz." });
      setTimeout(() => setSaveMessage(null), 6000);
      return;
    }
    if (!slug.trim()) {
      setSaveMessage({ type: "err", text: "Slug boş olamaz." });
      setTimeout(() => setSaveMessage(null), 6000);
      return;
    }
    setSaveMessage(null);
    updateMutation.mutate({
      name: name.trim(),
      slug: slug.trim(),
      logoUrl: logoUrl.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
      status,
      feedUrl: feedUrl.trim() || null,
      feedIsActive,
      feedImportIntervalLabel: intervalPreset
    });
  };

  return (
    <article className={styles.storeCard}>
      <div className={styles.storeCardHead}>
        <div className={styles.logoWrap}>
          {displayLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayLogo} alt="" />
          ) : (
            <span className={styles.logoPlaceholder}>{initial}</span>
          )}
        </div>
        <div className={styles.storeTitleMeta}>
          <h2>{displayName}</h2>
          <span>/{displaySlug}</span>
        </div>
        <span className={styles.idBadge}>#{store.id}</span>
      </div>

      <div className={styles.storeCardBody}>
        <div className={styles.twoCol}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Mağaza adı</label>
            <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Slug</label>
            <input className="form-control" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Logo / görsel URL</label>
          <input
            className="form-control"
            placeholder="https://…/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            autoComplete="off"
          />
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            Kart üstündeki görsel buradan güncellenir; kaydetmeyi unutmayın.
          </span>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Web sitesi</label>
          <input
            className="form-control"
            placeholder="https://…"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Feed URL</label>
          <input
            className="form-control"
            placeholder="https://…/feed.xml"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
          />
        </div>

        <div className={styles.toggleRow}>
          <span>Feed ile otomatik içe aktarma</span>
          <label className={styles.switch}>
            <input type="checkbox" checked={feedIsActive} onChange={(e) => setFeedIsActive(e.target.checked)} />
            <span className={styles.switchSlider} />
          </label>
        </div>
        <p className={styles.feedHint} style={{ margin: "-0.35rem 0 0" }}>
          Bu anahtar ve diğer alanlar yalnızca <strong>Kaydet</strong> ile sunucuya yazılır; sayfayı yenilemeden önce
          kaydedin.
        </p>

        <div className={styles.intervalSection}>
          <p className={styles.intervalSectionTitle}>İçe aktarma sıklığı</p>
          <div className={styles.intervalChoices} role="radiogroup" aria-label="İçe aktarma sıklığı">
            <label
              className={`${styles.intervalChoice} ${intervalPreset === "1h" ? styles.intervalChoiceActive : ""}`}
            >
              <input
                type="radio"
                name={`interval-${store.id}`}
                checked={intervalPreset === "1h"}
                onChange={() => setIntervalPreset("1h")}
              />
              <span className={styles.choiceTitle}>Saatlik</span>
              <span className={styles.choiceHint}>Son tamamlanan importtan ~1 saat sonra yeniden planlanır</span>
            </label>
            <label
              className={`${styles.intervalChoice} ${intervalPreset === "24h" ? styles.intervalChoiceActive : ""}`}
            >
              <input
                type="radio"
                name={`interval-${store.id}`}
                checked={intervalPreset === "24h"}
                onChange={() => setIntervalPreset("24h")}
              />
              <span className={styles.choiceTitle}>Günlük</span>
              <span className={styles.choiceHint}>Son tamamlanan importtan ~24 saat sonra yeniden planlanır</span>
            </label>
          </div>
          <p className={styles.feedHint}>
            İşçi süreci kısa aralıklarla kontrol eder; gerçek tetikleme mağazanın seçtiğiniz süresine göre gecikir.
          </p>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Mağaza durumu</label>
          <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Pasif</option>
          </select>
        </div>

        {saveMessage ? (
          <div className={saveMessage.type === "ok" ? styles.importToastOk : styles.importToastErr}>
            {saveMessage.text}
          </div>
        ) : null}

        {importMessage ? (
          <div className={importMessage.type === "success" ? styles.importToastOk : styles.importToastErr}>
            {importMessage.text}
          </div>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={updateMutation.isPending}
            onClick={handleSave}
          >
            {updateMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button
            type="button"
            className={`btn-primary btn-sm ${styles.btnImport}`}
            disabled={!feedUrl.trim() || importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            Şimdi içe aktar
          </button>
          <button
            type="button"
            className={`btn-secondary btn-sm ${styles.btnDanger}`}
            onClick={() => {
              if (window.confirm(`“${store.name}” silinsin mi? Bağımlı kayıt varsa silinmez.`)) onDelete();
            }}
          >
            Sil
          </button>
        </div>
      </div>
    </article>
  );
}
