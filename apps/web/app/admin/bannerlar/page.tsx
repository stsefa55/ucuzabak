"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

interface Banner {
  id: number;
  imageUrl: string;
  linkUrl: string | null;
  title: string | null;
  position: number;
  isActive: boolean;
}

export default function AdminBannersPage() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["admin-banners"],
    queryFn: () => apiFetch<Banner[]>("/admin/banners", { accessToken }),
    enabled: !!accessToken
  });

  const createMutation = useMutation({
    mutationFn: (body: { imageUrl: string; linkUrl?: string; title?: string }) =>
      apiFetch("/admin/banners", { method: "POST", body, accessToken: accessToken! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      setNewImageUrl("");
      setNewLinkUrl("");
      setNewTitle("");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Banner> }) =>
      apiFetch(`/admin/banners/${id}`, { method: "PATCH", body, accessToken: accessToken! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-banners"] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/admin/banners/${id}`, { method: "DELETE", accessToken: accessToken! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-banners"] })
  });

  const moveBanner = async (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= banners.length) return;
    const a = banners[fromIndex];
    const b = banners[toIndex];
    try {
      await Promise.all([
        apiFetch(`/admin/banners/${a.id}`, { method: "PATCH", body: { position: toIndex }, accessToken: accessToken! }),
        apiFetch(`/admin/banners/${b.id}`, { method: "PATCH", body: { position: fromIndex }, accessToken: accessToken! })
      ]);
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
    } catch (err) {
      console.error("Banner sıralama hatası:", err);
    }
  };

  if (!accessToken) return null;

  return (
    <div className="card">
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>Anasayfa bannerları</h2>
      <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
        Bannerlar anasayfada carousel olarak gösterilir. Görsel URL’si zorunludur; link ve başlık isteğe bağlıdır.
      </p>
      <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "1rem", padding: "0.5rem 0.75rem", background: "#f0f9ff", borderRadius: 6, border: "1px solid #bae6fd" }}>
        <strong>Görsel ölçüleri:</strong> Oran <strong>32:10</strong> (geniş : yüksek) olmalı. Önerilen boyutlar: <strong>1280×400 px</strong> veya <strong>1600×500 px</strong>. Farklı oranlar kırpılarak gösterilir.
      </p>

      <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f9fafb", borderRadius: 8 }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.75rem" }}>Yeni banner ekle</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480 }}>
          <div>
            <input
              className="form-control"
              placeholder="Görsel URL (zorunlu)"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
            />
            <span className="text-muted" style={{ fontSize: "0.75rem", display: "block", marginTop: 4 }}>Önerilen: 1280×400 veya 1600×500 px (32:10 oran)</span>
          </div>
          <input
            className="form-control"
            placeholder="Tıklama linki (isteğe bağlı)"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
          />
          <input
            className="form-control"
            placeholder="Başlık (isteğe bağlı)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={!newImageUrl.trim() || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                imageUrl: newImageUrl.trim(),
                linkUrl: newLinkUrl.trim() || undefined,
                title: newTitle.trim() || undefined
              })
            }
          >
            {createMutation.isPending ? "Ekleniyor..." : "Banner ekle"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted">Yükleniyor...</p>
      ) : banners.length === 0 ? (
        <p className="text-muted">Henüz banner yok. Yukarıdan ekleyebilirsiniz.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: 4 }}>
            Sırayı değiştirmek için yukarı/aşağı oklarını kullanın. Üstteki banner anasayfada önce gösterilir.
          </p>
          {banners.map((b, index) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: 8
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  flexShrink: 0
                }}
              >
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                  {index + 1}
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: 4 }}
                  disabled={index === 0}
                  onClick={() => moveBanner(index, "up")}
                  aria-label="Yukarı taşı"
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: 4 }}
                  disabled={index === banners.length - 1}
                  onClick={() => moveBanner(index, "down")}
                  aria-label="Aşağı taşı"
                >
                  <ChevronDown size={18} />
                </button>
              </div>
              <div style={{ width: 160, flexShrink: 0, borderRadius: 6, overflow: "hidden", background: "#f3f4f6" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageUrl} alt={b.title ?? ""} style={{ width: "100%", aspectRatio: "32/10", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.85rem", marginBottom: 4 }}>{b.title || "—"}</p>
                <p className="text-muted" style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>
                  {b.linkUrl || "Link yok"}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.85rem" }}>
                    <input
                      type="checkbox"
                      checked={b.isActive}
                      onChange={(e) => updateMutation.mutate({ id: b.id, body: { isActive: e.target.checked } })}
                    />
                    Aktif
                  </label>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      if (confirm("Bu bannerı silmek istediğinize emin misiniz?")) deleteMutation.mutate(b.id);
                    }}
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
