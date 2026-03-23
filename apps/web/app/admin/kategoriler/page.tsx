"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CATEGORY_ICON_NAME_OPTIONS } from "../../../src/lib/categoryIconMap";

type AdminCategory = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  iconName: string | null;
  imageUrl: string | null;
  sortOrder: number | null;
  isActive: boolean;
};

function computeCategoryLevel(c: AdminCategory, byId: Map<number, AdminCategory>) {
  let level = 0;
  let cursor = c.parentId ? byId.get(c.parentId) : null;
  while (cursor) {
    level += 1;
    cursor = cursor.parentId ? byId.get(cursor.parentId) : null;
    if (level > 10) break;
  }
  return level;
}

function getParentNameForCategory(c: AdminCategory, byId: Map<number, AdminCategory>) {
  if (!c.parentId) return "-";
  return byId.get(c.parentId)?.name ?? `#${c.parentId}`;
}

export default function AdminCategoriesPage() {
  const { accessToken } = useAuthStore();

  const { data, isLoading, error } = useQuery<any[]>({
    queryKey: ["admin-categories"],
    queryFn: () => apiFetch<any[]>("/admin/categories", { accessToken }),
    enabled: !!accessToken
  });

  const categories = useMemo(() => (Array.isArray(data) ? (data as AdminCategory[]) : []), [data]);

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const parentOptions = useMemo(
    () =>
      categories
        .filter((c) => c.isActive)
        .sort((a, b) => {
          const la = computeCategoryLevel(a, byId);
          const lb = computeCategoryLevel(b, byId);
          if (la !== lb) return la - lb;
          return a.name.localeCompare(b.name, "tr");
        }),
    [categories, byId]
  );

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<{
    id?: number;
    name: string;
    slug: string;
    parentId: number | null;
    iconName: string | null;
    imageUrl: string;
    sortOrder: string;
    isActive: boolean;
  }>({
    name: "",
    slug: "",
    parentId: null,
    iconName: CATEGORY_ICON_NAME_OPTIONS[0] ?? null,
    imageUrl: "",
    sortOrder: "0",
    isActive: true
  });

  if (!accessToken) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      parentId: form.parentId,
      iconName: form.iconName,
      imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : null,
      sortOrder: form.sortOrder.trim() ? Number(form.sortOrder.trim()) : null,
      isActive: form.isActive
    };

    if (mode === "create") {
      await apiFetch("/admin/categories", { method: "POST", body: payload, accessToken });
    } else {
      if (!form.id) return;
      await apiFetch(`/admin/categories/${form.id}`, { method: "PATCH", body: payload, accessToken });
    }

    setMode("create");
    setForm({
      name: "",
      slug: "",
      parentId: null,
      iconName: CATEGORY_ICON_NAME_OPTIONS[0] ?? null,
      imageUrl: "",
      sortOrder: "0",
      isActive: true
    });
  }

  function handleEditClick(c: AdminCategory) {
    setMode("edit");
    setForm({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      iconName: c.iconName ?? null,
      imageUrl: c.imageUrl ?? "",
      sortOrder: c.sortOrder != null ? String(c.sortOrder) : "0",
      isActive: c.isActive
    });
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Kategoriler</h2>
      {isLoading && <p>Yükleniyor...</p>}
      {error && <p className="text-danger">Kategoriler yüklenirken bir hata oluştu.</p>}
      {categories.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>ID</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Kategori</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Slug</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Üst kategori</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Seviye</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>IconName</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Sıralama</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Aktif</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr
                key={c.id}
                style={{ borderTop: "1px solid #e5e7eb", cursor: "pointer" }}
                onClick={() => handleEditClick(c)}
                title="Düzenlemek için tıklayın"
              >
                <td style={{ padding: "0.5rem" }}>{c.id}</td>
                <td style={{ padding: "0.5rem" }}>
                  <span style={{ paddingLeft: `${Math.min(computeCategoryLevel(c, byId), 4) * 12}px`, display: "inline-block" }}>{c.name}</span>
                </td>
                <td style={{ padding: "0.5rem" }}>{c.slug}</td>
                <td style={{ padding: "0.5rem" }}>{getParentNameForCategory(c, byId)}</td>
                <td style={{ padding: "0.5rem" }}>{computeCategoryLevel(c, byId)}</td>
                <td style={{ padding: "0.5rem" }}>{c.iconName ?? "-"}</td>
                <td style={{ padding: "0.5rem" }}>{c.sortOrder ?? "-"}</td>
                <td style={{ padding: "0.5rem" }}>{c.isActive ? "Evet" : "Hayır"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: "1rem",
          paddingTop: "1rem",
          borderTop: "1px solid #e5e7eb",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem"
        }}
      >
        <div style={{ gridColumn: "span 2", fontWeight: 700 }}>
          {mode === "create" ? "Yeni kategori ekle" : "Kategori düzenle"}
        </div>

        <div>
          <label className="form-label">Kategori adı</label>
          <input className="form-control" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className="form-label">Slug</label>
          <input className="form-control" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required />
        </div>

        <div>
          <label className="form-label">Üst kategori</label>
          <select
            className="form-control"
            value={form.parentId ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value ? Number(e.target.value) : null }))}
          >
            <option value="">Üst kategori yok</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {`${"— ".repeat(Math.min(computeCategoryLevel(p, byId), 3))}${p.name}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Sıralama</label>
          <input className="form-control" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
        </div>

        <div>
          <label className="form-label">IconName</label>
          <select
            className="form-control"
            value={form.iconName ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, iconName: e.target.value || null }))}
          >
            {CATEGORY_ICON_NAME_OPTIONS.map((k) => (
              <option key={k as string} value={k as string}>
                {k as string}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">ImageUrl</label>
          <input className="form-control" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="(opsiyonel)" />
        </div>

        <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
          <span>Kategori aktif olsun</span>
        </div>

        <div style={{ gridColumn: "span 2", display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" className="btn-primary">
            {mode === "create" ? "Oluştur" : "Güncelle"}
          </button>
          {mode === "edit" ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                setForm({
                  name: "",
                  slug: "",
                  parentId: null,
                  iconName: CATEGORY_ICON_NAME_OPTIONS[0] ?? null,
                  imageUrl: "",
                  sortOrder: "0",
                  isActive: true
                })
              }
            >
              İptal
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

