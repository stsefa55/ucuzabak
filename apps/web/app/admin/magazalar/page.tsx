"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

interface Store {
  id: number;
  name: string;
  slug: string;
  status: string;
  feedUrl?: string | null;
  feedIsActive?: boolean | null;
  feedImportIntervalLabel?: string | null;
}

function StoreRow({ store, accessToken }: { store: Store; accessToken: string }) {
  const queryClient = useQueryClient();
  const [feedUrl, setFeedUrl] = useState(store.feedUrl ?? "");
  const [feedIsActive, setFeedIsActive] = useState(
    store.feedIsActive ?? store.status === "ACTIVE",
  );
  const [intervalLabel, setIntervalLabel] = useState(store.feedImportIntervalLabel ?? "");
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const updateMutation = useMutation({
    mutationFn: (body: { feedUrl: string; feedIsActive: boolean; feedImportIntervalLabel: string }) =>
      apiFetch(`/admin/stores/${store.id}/feed`, {
        method: "PATCH",
        body,
        accessToken
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
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
        text: `Import kuyruğa eklendi (ID: ${res.id}). "Feed importları" sayfasından durumu takip edebilirsiniz.`
      });
      setTimeout(() => setImportMessage(null), 8000);
    },
    onError: (err: Error & { message?: string; status?: number }) => {
      let msg = err.message || "Import başlatılamadı.";
      try {
        const parsed = JSON.parse(msg);
        if (parsed.message) msg = parsed.message;
      } catch {
        // use msg as-is
      }
      setImportMessage({ type: "error", text: msg });
      setTimeout(() => setImportMessage(null), 8000);
    }
  });

  return (
    <tr key={store.id} style={{ borderTop: "1px solid #e5e7eb" }}>
      <td style={{ padding: "0.5rem" }}>{store.id}</td>
      <td style={{ padding: "0.5rem" }}>{store.name}</td>
      <td style={{ padding: "0.5rem" }}>{store.slug}</td>
      <td style={{ padding: "0.5rem" }}>{store.status}</td>
      <td style={{ padding: "0.5rem" }}>
        <input
          className="form-control"
          placeholder="Feed URL"
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
        />
      </td>
      <td style={{ padding: "0.5rem" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.8rem" }}>
          <input
            type="checkbox"
            checked={feedIsActive}
            onChange={(e) => setFeedIsActive(e.target.checked)}
          />
          Aktif
        </label>
      </td>
      <td style={{ padding: "0.5rem" }}>
        <input
          className="form-control"
          placeholder="Örn. Günde 1 kez"
          value={intervalLabel}
          onChange={(e) => setIntervalLabel(e.target.value)}
        />
      </td>
      <td style={{ padding: "0.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          {importMessage && (
            <div
              style={{
                fontSize: "0.8rem",
                padding: "4px 8px",
                borderRadius: 4,
                maxWidth: 320,
                textAlign: "right",
                backgroundColor: importMessage.type === "success" ? "#dcfce7" : "#fee2e2",
                color: importMessage.type === "success" ? "#166534" : "#b91c1c"
              }}
            >
              {importMessage.text}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() =>
                updateMutation.mutate({
                  feedUrl,
                  feedIsActive,
                  feedImportIntervalLabel: intervalLabel
                })
              }
            >
              Kaydet
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => importMutation.mutate()}
              disabled={!feedUrl || importMutation.isPending}
              title="Feed’i şimdi kuyruğa ekler; işlem Feed importları sayfasından takip edilir."
            >
              {importMutation.isPending ? "Kuyruğa ekleniyor..." : "Şimdi içeri aktar"}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function AdminStoresPage() {
  const { accessToken } = useAuthStore();

  const { data, isLoading, error } = useQuery<Store[]>({
    queryKey: ["admin-stores"],
    queryFn: () => apiFetch<Store[]>("/admin/stores", { accessToken }),
    enabled: !!accessToken
  });

  if (!accessToken) return null;

  return (
    <div className="card">
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Mağazalar</h2>
      {isLoading && <p>Yükleniyor...</p>}
      {error && <p className="text-danger">Mağazalar yüklenirken bir hata oluştu.</p>}
      {data && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>ID</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Mağaza</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Slug</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Durum</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Feed URL</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Feed aktif</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>İçeri aktarma sıklığı</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <StoreRow key={s.id} store={s} accessToken={accessToken!} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

