"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { AdminPageHeader } from "../../../../src/components/admin/AdminPageHeader";
import { apiFetch } from "../../../../src/lib/api-client";
import { useAuthStore } from "../../../../src/stores/auth-store";

interface AdminListItem {
  id: number;
  name: string;
}

interface ProductImage {
  id: number;
  imageUrl: string;
  position: number;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  status: string;
  isFeatured?: boolean;
  featuredSortOrder?: number;
  brandId?: number | null;
  categoryId?: number | null;
  ean?: string | null;
  modelNumber?: string | null;
  mainImageUrl?: string | null;
  description?: string | null;
  specsJson?: Record<string, unknown> | null;
  brand?: { id: number; name: string } | null;
  category?: { id: number; name: string } | null;
  productImages?: ProductImage[];
}

const OFFER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktif",
  DISABLED: "Devre dışı",
  OUT_OF_STOCK: "Stokta yok"
};

type OfferStatus = "ACTIVE" | "DISABLED" | "OUT_OF_STOCK";

interface Offer {
  id: number;
  productId: number;
  storeId: number;
  storeProductId: number;
  currentPrice: number | string;
  originalPrice?: number | string | null;
  inStock: boolean;
  status?: OfferStatus;
  affiliateUrl?: string | null;
  lastSeenAt?: string | null;
  updatedAt?: string;
  listDiscountPercent?: number | null;
  storefrontListDiscountEligible?: boolean;
  store?: { id: number; name: string } | null;
}

export default function AdminProductEditPage() {
  const params = useParams();
  const id = Number(params.id);
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [newOfferStoreId, setNewOfferStoreId] = useState("");
  const [newOfferPrice, setNewOfferPrice] = useState("");
  const [newOfferInStock, setNewOfferInStock] = useState(true);
  const [newOfferAffiliateUrl, setNewOfferAffiliateUrl] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  const { data: product, isLoading: productLoading } = useQuery<Product>({
    queryKey: ["admin-product", id],
    queryFn: () => apiFetch<Product>(`/admin/products/${id}`, { accessToken }),
    enabled: !!accessToken && !Number.isNaN(id)
  });

  const { data: offers = [], isLoading: offersLoading } = useQuery<Offer[]>({
    queryKey: ["admin-product-offers", id],
    queryFn: () => apiFetch<Offer[]>(`/admin/products/${id}/offers`, { accessToken }),
    enabled: !!accessToken && !Number.isNaN(id)
  });

  const { data: categories } = useQuery<AdminListItem[]>({
    queryKey: ["admin-categories"],
    queryFn: () => apiFetch<AdminListItem[]>("/admin/categories", { accessToken }),
    enabled: !!accessToken
  });
  const { data: brands } = useQuery<AdminListItem[]>({
    queryKey: ["admin-brands"],
    queryFn: () => apiFetch<AdminListItem[]>("/admin/brands", { accessToken }),
    enabled: !!accessToken
  });
  const { data: stores } = useQuery<AdminListItem[]>({
    queryKey: ["admin-stores"],
    queryFn: () => apiFetch<AdminListItem[]>("/admin/stores", { accessToken }),
    enabled: !!accessToken
  });

  const [form, setForm] = useState({
    name: "",
    slug: "",
    brandId: "",
    categoryId: "",
    ean: "",
    modelNumber: "",
    mainImageUrl: "",
    description: "",
    status: "ACTIVE",
    isFeatured: false,
    featuredSortOrder: "0",
    specsJsonText: ""
  });
  const [specRows, setSpecRows] = useState<Array<{ key: string; value: string }>>([{ key: "", value: "" }]);
  const [formInitialized, setFormInitialized] = useState(false);

  useEffect(() => {
    setFormInitialized(false);
  }, [id]);

  useEffect(() => {
    if (!product || formInitialized) return;
    setForm({
      name: product.name,
      slug: product.slug,
      brandId: product.brandId != null ? String(product.brandId) : "",
      categoryId: product.categoryId != null ? String(product.categoryId) : "",
      ean: product.ean ?? "",
      modelNumber: product.modelNumber ?? "",
      mainImageUrl: product.mainImageUrl ?? "",
      description: product.description ?? "",
      status: product.status,
      isFeatured: Boolean(product.isFeatured),
      featuredSortOrder: String(product.featuredSortOrder ?? 0),
      specsJsonText: ""
    });
    const spec = product.specsJson && typeof product.specsJson === "object" ? product.specsJson : {};
    const rows = Object.entries(spec)
      .filter(([k]) => k !== "_recommendedPrice")
      .map(([k, v]) => ({ key: k, value: String(v ?? "") }));
    setSpecRows(rows.length === 0 ? [{ key: "", value: "" }] : rows);
    setFormInitialized(true);
  }, [product, formInitialized]);

  const saveProductMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/admin/products/${id}`, { method: "PATCH", body, accessToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product", id] });
      setMessage({ type: "success", text: "Ürün kaydedildi." });
      setTimeout(() => setMessage(null), 4000);
    },
    onError: () => setMessage({ type: "error", text: "Kaydetme sırasında hata oluştu." })
  });

  const updateOfferMutation = useMutation({
    mutationFn: ({ offerId, body }: { offerId: number; body: { currentPrice?: string; inStock?: boolean; status?: OfferStatus; affiliateUrl?: string | null } }) =>
      apiFetch(`/admin/offers/${offerId}`, { method: "PATCH", body, accessToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-offers", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-product", id] });
      setMessage({ type: "success", text: "Teklif güncellendi." });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: () => setMessage({ type: "error", text: "Teklif güncellenirken hata oluştu." })
  });

  const addOfferMutation = useMutation({
    mutationFn: (body: { storeId: number; currentPrice: string; inStock: boolean; affiliateUrl?: string }) =>
      apiFetch(`/admin/products/${id}/offers`, { method: "POST", body, accessToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-offers", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-product", id] });
      setMessage({ type: "success", text: "Yeni teklif eklendi." });
      setNewOfferStoreId("");
      setNewOfferPrice("");
      setNewOfferInStock(true);
      setNewOfferAffiliateUrl("");
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (e: Error) => setMessage({ type: "error", text: e.message || "Teklif eklenirken hata oluştu." })
  });

  const addImageMutation = useMutation({
    mutationFn: (imageUrl: string) =>
      apiFetch(`/admin/products/${id}/images`, { method: "POST", body: { imageUrl }, accessToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product", id] });
      setNewImageUrl("");
      setMessage({ type: "success", text: "Görsel eklendi." });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (e: Error) => setMessage({ type: "error", text: e.message || "Görsel eklenirken hata oluştu." })
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: number) =>
      apiFetch(`/admin/products/${id}/images/${imageId}`, { method: "DELETE", accessToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product", id] });
      setMessage({ type: "success", text: "Görsel silindi." });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: () => setMessage({ type: "error", text: "Görsel silinirken hata oluştu." })
  });

  const reorderImagesMutation = useMutation({
    mutationFn: (imageIds: number[]) =>
      apiFetch(`/admin/products/${id}/images/reorder`, { method: "PATCH", body: { imageIds }, accessToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product", id] });
      setMessage({ type: "success", text: "Sıra güncellendi." });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: () => setMessage({ type: "error", text: "Sıra güncellenirken hata oluştu." })
  });

  function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    const slugTrimmed = form.slug.trim();
    if (!slugTrimmed || !/^[a-z0-9-]+$/.test(slugTrimmed)) {
      setMessage({ type: "error", text: "Slug yalnızca küçük harf, rakam ve '-' içermelidir." });
      return;
    }
    const specsFromRows: Record<string, unknown> = {};
    for (const row of specRows) {
      const key = row.key.trim();
      if (!key) continue;
      specsFromRows[key] = row.value;
    }
    let specs: Record<string, unknown> | undefined = Object.keys(specsFromRows).length > 0 ? specsFromRows : undefined;
    if (form.specsJsonText.trim()) {
      try {
        const parsed = JSON.parse(form.specsJsonText);
        if (parsed && typeof parsed === "object") specs = { ...(specs ?? {}), ...parsed };
      } catch {
        setMessage({ type: "error", text: "Özellikler JSON alanı geçerli bir JSON olmalıdır." });
        return;
      }
    }
    const sortOrder = Number(form.featuredSortOrder);
    saveProductMutation.mutate({
      name: form.name,
      slug: slugTrimmed,
      brandId: form.brandId ? Number(form.brandId) : undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      ean: form.ean || undefined,
      modelNumber: form.modelNumber || undefined,
      mainImageUrl: form.mainImageUrl || undefined,
      description: form.description || undefined,
      specsJson: specs,
      status: form.status,
      isFeatured: form.isFeatured,
      featuredSortOrder: Number.isFinite(sortOrder) && sortOrder >= 0 ? sortOrder : 0
    });
  }

  if (!accessToken) return null;
  if (Number.isNaN(id)) {
    return (
      <div className="card admin-page">
        <p className="text-danger">Geçersiz ürün ID.</p>
        <Link href="/admin/urunler">Ürün listesine dön</Link>
      </div>
    );
  }
  const productMismatch = product != null && product.id !== id;
  if (productLoading || !product || productMismatch) {
    return (
      <div className="card admin-page">
        {productLoading || productMismatch ? <p>Yükleniyor…</p> : <p>Ürün bulunamadı.</p>}
        <Link href="/admin/urunler">Ürün listesine dön</Link>
      </div>
    );
  }

  return (
    <div className="card admin-page" style={{ maxWidth: 900, margin: "0 auto" }}>
      <AdminPageHeader
        title={product.name}
        description="Ürün bilgilerini düzenleyin, görselleri ve teklifleri yönetin."
        actions={
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
            <Link href={`/urun/${product.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
              Storefront&apos;ta gör
            </Link>
            <Link href="/admin/urunler" className="btn-secondary btn-sm">
              Listeye dön
            </Link>
            <button
              type="submit"
              form="admin-product-edit-form"
              className="btn-primary btn-sm"
              disabled={saveProductMutation.isPending}
            >
              {saveProductMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        }
      />

      {message && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.6rem 1rem",
            borderRadius: 8,
            fontSize: "0.9rem",
            backgroundColor: message.type === "success" ? "#dcfce7" : "#fee2e2",
            color: message.type === "success" ? "#166534" : "#b91c1c"
          }}
        >
          {message.text}
        </div>
      )}

      <form id="admin-product-edit-form" onSubmit={handleSaveProduct}>
        <section className="admin-section">
          <h2 className="admin-section-title">Temel bilgiler</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label-admin">Ürün adı</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label-admin">Slug</label>
              <input
                className="form-control"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label-admin">Marka</label>
              <select
                className="form-control"
                value={form.brandId}
                onChange={(e) => setForm((f) => ({ ...f, brandId: e.target.value }))}
              >
                <option value="">Seçiniz</option>
                {brands?.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label-admin">Kategori</label>
              <select
                className="form-control"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">Seçiniz</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label-admin">EAN</label>
              <input className="form-control" value={form.ean} onChange={(e) => setForm((f) => ({ ...f, ean: e.target.value }))} />
            </div>
            <div>
              <label className="form-label-admin">Model numarası</label>
              <input className="form-control" value={form.modelNumber} onChange={(e) => setForm((f) => ({ ...f, modelNumber: e.target.value }))} />
            </div>
            <div>
              <label className="form-label-admin">Durum</label>
              <select className="form-control" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} style={{ maxWidth: 160 }}>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Pasif</option>
              </select>
            </div>
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "1rem",
                borderRadius: 10,
                border: "1px solid #e0e7ff",
                background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
                display: "grid",
                gap: "0.75rem"
              }}
            >
              <span className="form-label-admin" style={{ marginBottom: 0, color: "#3730a3" }}>
                Anasayfa vitrin (öne çıkan)
              </span>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.9rem" }}>
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                />
                «Öne çıkan ürünler» rayında göster
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem" }}>
                <label className="form-label-admin" style={{ marginBottom: 0 }}>
                  Vitrin sırası (küçük önce)
                </label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  step={1}
                  style={{ width: 120 }}
                  value={form.featuredSortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, featuredSortOrder: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="admin-section">
          <h2 className="admin-section-title">Açıklama ve ana görsel</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label className="form-label-admin">Ana görsel URL</label>
              <input className="form-control" value={form.mainImageUrl} onChange={(e) => setForm((f) => ({ ...f, mainImageUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <label className="form-label-admin">Açıklama</label>
              <textarea className="form-control" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Ürün açıklaması" />
            </div>
          </div>
        </section>

        <section className="admin-section">
          <h2 className="admin-section-title">Teknik özellikler</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr auto", gap: "0.5rem", alignItems: "center", fontSize: "0.85rem" }}>
              <span className="form-label-admin" style={{ marginBottom: 0 }}>Özellik adı</span>
              <span className="form-label-admin" style={{ marginBottom: 0 }}>Değer</span>
              <span style={{ width: 48 }} />
            </div>
            {specRows.map((row, index) => (
              <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr auto", gap: "0.5rem", alignItems: "center" }}>
                <input
                  className="form-control"
                  placeholder="örn. ekran_boyutu"
                  value={row.key}
                  onChange={(e) => setSpecRows((r) => r.map((x, i) => (i === index ? { ...x, key: e.target.value } : x)))}
                />
                <input
                  className="form-control"
                  placeholder="örn. 6.5 inç"
                  value={row.value}
                  onChange={(e) => setSpecRows((r) => r.map((x, i) => (i === index ? { ...x, value: e.target.value } : x)))}
                />
                <button type="button" className="btn-ghost btn-sm" onClick={() => setSpecRows((r) => r.filter((_, i) => i !== index))} disabled={specRows.length === 1} title="Sil">
                  <Trash2 size={16} style={{ color: "#6b7280" }} />
                </button>
              </div>
            ))}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.25rem" }}>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setSpecRows((r) => [...r, { key: "", value: "" }])}>
                Özellik satırı ekle
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setShowAdvancedJson((v) => !v)}>
                {showAdvancedJson ? "Gelişmiş JSON alanını gizle" : "Gelişmiş JSON alanını göster"}
              </button>
            </div>
            {showAdvancedJson && (
              <div style={{ marginTop: "0.75rem" }}>
                <label className="form-label-admin">Gelişmiş özellikler (JSON)</label>
                <textarea className="form-control" rows={4} placeholder='{"anahtar": "değer"}' value={form.specsJsonText} onChange={(e) => setForm((f) => ({ ...f, specsJsonText: e.target.value }))} style={{ fontFamily: "monospace", fontSize: "0.85rem" }} />
              </div>
            )}
          </div>
        </section>

        <div style={{ marginBottom: "1.5rem" }}>
          <button type="submit" className="btn-primary" disabled={saveProductMutation.isPending}>
            {saveProductMutation.isPending ? "Kaydediliyor..." : "Ürünü kaydet"}
          </button>
        </div>
      </form>

      <section className="admin-section">
        <h2 className="admin-section-title">Ürün görselleri</h2>
        <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
          Ek görseller mağaza ürün sayfasında galeri olarak gösterilir. Ana görsel (yukarıdaki alan) ayrıca kullanılır.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-end", marginBottom: "1rem" }}>
          <input
            className="form-control"
            placeholder="Görsel URL"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            style={{ width: 320, maxWidth: "100%" }}
          />
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={!newImageUrl.trim() || addImageMutation.isPending}
            onClick={() => addImageMutation.mutate(newImageUrl.trim())}
          >
            {addImageMutation.isPending ? "Ekleniyor..." : "Ekle"}
          </button>
        </div>
        {(product.productImages?.length ?? 0) > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.75rem" }}>
            {(product.productImages ?? []).map((img, index) => (
              <div
                key={img.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#f9fafb"
                }}
              >
                <div style={{ aspectRatio: "4/3", background: "#f3f4f6" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 2, padding: "0.35rem" }}>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    title="Yukarı"
                    disabled={index === 0 || reorderImagesMutation.isPending}
                    onClick={() => {
                      const imgs = product.productImages ?? [];
                      const ids = imgs.map((i) => i.id);
                      const prev = ids[index - 1];
                      ids[index - 1] = ids[index];
                      ids[index] = prev;
                      reorderImagesMutation.mutate(ids);
                    }}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    title="Aşağı"
                    disabled={index === (product.productImages ?? []).length - 1 || reorderImagesMutation.isPending}
                    onClick={() => {
                      const ids = (product.productImages ?? []).map((i) => i.id);
                      const next = ids[index + 1];
                      ids[index + 1] = ids[index];
                      ids[index] = next;
                      reorderImagesMutation.mutate(ids);
                    }}
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    title="Sil"
                    disabled={deleteImageMutation.isPending}
                    onClick={() => {
                      if (confirm("Bu görseli silmek istediğinize emin misiniz?")) deleteImageMutation.mutate(img.id);
                    }}
                  >
                    <Trash2 size={14} style={{ color: "#b91c1c" }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>Henüz ek görsel yok. Yukarıdan URL ekleyebilirsiniz.</p>
        )}
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">Teklifler</h2>
        <p className="text-muted" style={{ fontSize: "0.82rem", lineHeight: 1.55, marginBottom: "0.75rem" }}>
          <strong>Liste indirimi</strong> (üstü çizili liste fiyatı + % rozeti), teklifin <code>originalPrice</code> ile{" "}
          <code>currentPrice</code> karşılaştırmasıdır; <strong>fiyat düşüşü</strong> grafikteki{" "}
          <code>PriceHistory</code> ile ölçülür. Vitrin rozeti yalnızca ACTIVE teklifte, liste fiyatı güncel fiyattan
          büyükse ve kanıt tarihi tazeyse gösterilir: feed&apos;de <code>lastSeenAt</code> doluysa sadece o; yoksa{" "}
          <code>updatedAt</code>. Süre: ortam değişkeni <code>OFFER_LIST_PRICE_FRESH_DAYS</code> (varsayılan 21 gün).
        </p>
        {offersLoading ? (
          <p className="text-muted">Yükleniyor...</p>
        ) : (
          <>
            <div className="admin-data-table-wrap" style={{ marginBottom: "1.25rem" }}>
            <table className="admin-data-table" style={{ fontSize: "0.8125rem" }}>
              <thead>
                <tr>
                  <th>Mağaza</th>
                  <th style={{ textAlign: "right" }}>Güncel</th>
                  <th style={{ textAlign: "right" }}>Liste (original)</th>
                  <th style={{ textAlign: "right" }}>İndirim %</th>
                  <th>Vitrin rozeti</th>
                  <th>Durum</th>
                  <th>Stok</th>
                  <th>Son görülme</th>
                  <th>Affiliate</th>
                  <th style={{ textAlign: "right" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <OfferRow
                    key={offer.id}
                    offer={offer}
                    onUpdate={(body) => updateOfferMutation.mutate({ offerId: offer.id, body })}
                    isUpdating={updateOfferMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
            </div>
            {offers.length === 0 && <p className="text-muted" style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>Henüz teklif yok. Aşağıdan yeni teklif ekleyebilirsiniz.</p>}

            <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "0 0 0.5rem 0" }}>Yeni teklif ekle</h3>
              <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "1rem" }}>
                Aynı mağaza için zaten teklif varsa fiyat ve stok güncellenir; yeni satır oluşturulmaz.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem", alignItems: "end" }}>
                <div>
                  <label className="form-label-admin">Mağaza</label>
                  <select className="form-control" value={newOfferStoreId} onChange={(e) => setNewOfferStoreId(e.target.value)}>
                    <option value="">Seçiniz</option>
                    {stores?.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label-admin">Fiyat (TRY)</label>
                  <input className="form-control" type="text" placeholder="0.00" value={newOfferPrice} onChange={(e) => setNewOfferPrice(e.target.value)} />
                </div>
                <div>
                  <label className="form-label-admin">Stokta</label>
                  <select className="form-control" value={newOfferInStock ? "1" : "0"} onChange={(e) => setNewOfferInStock(e.target.value === "1")}>
                    <option value="1">Evet</option>
                    <option value="0">Hayır</option>
                  </select>
                </div>
                <div>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={!newOfferStoreId || !newOfferPrice.trim() || addOfferMutation.isPending}
                    onClick={() => {
                      const price = newOfferPrice.trim().replace(",", ".");
                      if (!price || Number.isNaN(Number(price))) {
                        setMessage({ type: "error", text: "Geçerli bir fiyat giriniz." });
                        return;
                      }
                      addOfferMutation.mutate({
                        storeId: Number(newOfferStoreId),
                        currentPrice: price,
                        inStock: newOfferInStock,
                        affiliateUrl: newOfferAffiliateUrl.trim() || undefined
                      });
                    }}
                  >
                    {addOfferMutation.isPending ? "Ekleniyor..." : "Ekle"}
                  </button>
                </div>
              </div>
              <div style={{ marginTop: "0.75rem" }}>
                <label className="form-label-admin">Affiliate URL (opsiyonel)</label>
                <input className="form-control" placeholder="https://..." value={newOfferAffiliateUrl} onChange={(e) => setNewOfferAffiliateUrl(e.target.value)} />
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function formatAdminTry(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const v = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  if (!Number.isFinite(v)) return "—";
  return `${v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

function formatAdminDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("tr-TR");
}

function OfferRow({
  offer,
  onUpdate,
  isUpdating
}: {
  offer: Offer;
  onUpdate: (body: { currentPrice?: string; inStock?: boolean; status?: OfferStatus; affiliateUrl?: string | null }) => void;
  isUpdating: boolean;
}) {
  const [price, setPrice] = useState(String(offer.currentPrice ?? ""));
  const [inStock, setInStock] = useState(offer.inStock);
  const [status, setStatus] = useState<OfferStatus>((offer.status as OfferStatus) ?? "ACTIVE");
  const [affiliateUrl, setAffiliateUrl] = useState(offer.affiliateUrl ?? "");
  const [editing, setEditing] = useState(false);

  const changed =
    price !== String(offer.currentPrice ?? "") ||
    inStock !== offer.inStock ||
    status !== (offer.status ?? "ACTIVE") ||
    affiliateUrl !== (offer.affiliateUrl ?? "");

  const listPct =
    offer.listDiscountPercent != null && Number.isFinite(offer.listDiscountPercent)
      ? `${offer.listDiscountPercent}%`
      : "—";

  return (
    <tr style={{ opacity: offer.status === "ACTIVE" ? 1 : 0.88 }}>
      <td>{offer.store?.name ?? "—"}</td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        {editing ? (
          <input className="form-control" type="text" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: 100, textAlign: "right" }} />
        ) : (
          formatAdminTry(offer.currentPrice)
        )}
      </td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{formatAdminTry(offer.originalPrice)}</td>
      <td style={{ textAlign: "right" }}>{listPct}</td>
      <td>
        {offer.storefrontListDiscountEligible ? (
          <span style={{ color: "#166534", fontWeight: 600, fontSize: "0.78rem" }}>Gösterilir</span>
        ) : (
          <span className="text-muted" style={{ fontSize: "0.78rem" }}>Gizlenir</span>
        )}
      </td>
      <td>
        {editing ? (
          <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value as OfferStatus)} style={{ width: 120 }}>
            <option value="ACTIVE">{OFFER_STATUS_LABELS.ACTIVE}</option>
            <option value="DISABLED">{OFFER_STATUS_LABELS.DISABLED}</option>
            <option value="OUT_OF_STOCK">{OFFER_STATUS_LABELS.OUT_OF_STOCK}</option>
          </select>
        ) : (
          OFFER_STATUS_LABELS[offer.status ?? "ACTIVE"] ?? offer.status
        )}
      </td>
      <td>
        {editing ? (
          <select className="form-control" value={inStock ? "1" : "0"} onChange={(e) => setInStock(e.target.value === "1")} style={{ width: 100 }}>
            <option value="1">Stokta</option>
            <option value="0">Yok</option>
          </select>
        ) : (
          offer.inStock ? "Stokta" : "Yok"
        )}
      </td>
      <td style={{ whiteSpace: "nowrap", fontSize: "0.78rem" }} title={offer.lastSeenAt ? "lastSeenAt (feed)" : "lastSeenAt yok — vitrin tazeliği updatedAt ile"}>
        {formatAdminDateTime(offer.lastSeenAt ?? undefined)}
      </td>
      <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
        {editing ? (
          <input className="form-control" type="text" value={affiliateUrl} onChange={(e) => setAffiliateUrl(e.target.value)} placeholder="URL" />
        ) : (
          offer.affiliateUrl ? (
            <a href={offer.affiliateUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.78rem" }}>
              Link
            </a>
          ) : (
            "—"
          )
        )}
      </td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        {editing ? (
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(false)}>
              İptal
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={isUpdating || !changed}
              onClick={() => {
                const priceNum = price.trim().replace(",", ".");
                if (!priceNum || Number.isNaN(Number(priceNum))) return;
                onUpdate({ currentPrice: priceNum, inStock, status, affiliateUrl: affiliateUrl.trim() || null });
                setEditing(false);
              }}
            >
              Kaydet
            </button>
          </>
        ) : (
          <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(true)}>
            Düzenle
          </button>
        )}
      </td>
    </tr>
  );
}
