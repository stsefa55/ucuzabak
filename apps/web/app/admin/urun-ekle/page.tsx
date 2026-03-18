"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "../../../src/components/layout/Header";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

interface AdminListItem {
  id: number;
  name: string;
}

export default function AdminCreateProductPage() {
  const { accessToken } = useAuthStore();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    brandId: "",
    categoryId: "",
    ean: "",
    modelNumber: "",
    mainImageUrl: "",
    description: "",
    specsJsonText: "",
    recommendedPrice: "",
    initialOfferStoreId: "",
    initialOfferPrice: "",
    initialOfferInStock: "in_stock",
    initialOfferAffiliateUrl: ""
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [specRows, setSpecRows] = useState<Array<{ key: string; value: string }>>([
    { key: "", value: "" }
  ]);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);

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

  if (!accessToken) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      // Slug basit doğrulama
      const slugTrimmed = form.slug.trim();
      if (!slugTrimmed || !/^[a-z0-9-]+$/.test(slugTrimmed)) {
        setMessage({
          type: "error",
          text: "Slug yalnızca küçük harf, rakam ve '-' karakterlerinden oluşmalıdır."
        });
        setSaving(false);
        return;
      }

      const specsFromRows: Record<string, unknown> = {};
      for (const row of specRows) {
        const key = row.key.trim();
        if (!key) continue;
        specsFromRows[key] = row.value;
      }

      let specs: Record<string, unknown> | undefined;
      if (Object.keys(specsFromRows).length > 0) {
        specs = { ...specsFromRows };
      }

      if (form.specsJsonText.trim()) {
        try {
          const parsed = JSON.parse(form.specsJsonText);
          if (parsed && typeof parsed === "object") {
            specs = {
              ...(specs ?? {}),
              ...(parsed as Record<string, unknown>)
            };
          } else {
            throw new Error("INVALID_SPECS");
          }
        } catch {
          setMessage({
            type: "error",
            text: "Özellikler alanı geçerli bir JSON olmalıdır."
          });
          setSaving(false);
          return;
        }
      }

      if (form.recommendedPrice.trim()) {
        const num = Number(form.recommendedPrice.replace(",", "."));
        if (!Number.isNaN(num)) {
          if (!specs) specs = {};
          specs._recommendedPrice = num;
        } else {
          setMessage({
            type: "error",
            text: "Önerilen liste fiyatı geçerli bir sayı olmalıdır."
          });
          setSaving(false);
          return;
        }
      }

      let initialOfferInStock: boolean | undefined;
      if (form.initialOfferInStock === "in_stock") initialOfferInStock = true;
      if (form.initialOfferInStock === "out_of_stock") initialOfferInStock = false;

      await apiFetch("/admin/products", {
        method: "POST",
        body: {
          name: form.name,
          slug: slugTrimmed,
          brandId: form.brandId ? Number(form.brandId) : undefined,
          categoryId: form.categoryId ? Number(form.categoryId) : undefined,
          ean: form.ean || undefined,
          modelNumber: form.modelNumber || undefined,
          mainImageUrl: form.mainImageUrl || undefined,
          description: form.description || undefined,
          specsJson: specs,
          initialOfferStoreId: form.initialOfferStoreId ? Number(form.initialOfferStoreId) : undefined,
          initialOfferPrice: form.initialOfferPrice || undefined,
          initialOfferInStock,
          initialOfferAffiliateUrl: form.initialOfferAffiliateUrl || undefined
        },
        accessToken
      });
      setMessage({ type: "success", text: "Ürün başarıyla oluşturuldu." });
      setForm({
        name: "",
        slug: "",
        brandId: "",
        categoryId: "",
        ean: "",
        modelNumber: "",
        mainImageUrl: "",
        description: "",
        specsJsonText: "",
        recommendedPrice: "",
        initialOfferStoreId: "",
        initialOfferPrice: "",
        initialOfferInStock: "in_stock",
        initialOfferAffiliateUrl: ""
      });
      setSpecRows([{ key: "", value: "" }]);
    } catch (err) {
      setMessage({ type: "error", text: "Ürün oluşturulurken bir hata oluştu." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <div className="card" style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              Yeni ürün ekle
            </h1>
            <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
              Temel ürün bilgilerini girerek katalogda yeni bir ürün oluşturabilirsiniz. Fiyatlar mağaza teklifleri
              üzerinden yönetilir; burada sadece ürün tanımı ve isteğe bağlı özellikler girilir.
            </p>
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "0.9rem", marginTop: "0.5rem" }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.1fr", gap: "0.75rem" }}>
                <div>
                  <label className="form-label">Ürün adı</label>
                  <input
                    className="form-control"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Slug</label>
                  <input
                    className="form-control"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label className="form-label">Marka</label>
                  <select
                    className="form-control"
                    value={form.brandId}
                    onChange={(e) => setForm((f) => ({ ...f, brandId: e.target.value }))}
                  >
                    <option value="">Seçiniz</option>
                    {brands?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Kategori</label>
                  <select
                    className="form-control"
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  >
                    <option value="">Seçiniz</option>
                    {categories?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label className="form-label">EAN</label>
                  <input
                    className="form-control"
                    value={form.ean}
                    onChange={(e) => setForm((f) => ({ ...f, ean: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Model numarası</label>
                  <input
                    className="form-control"
                    value={form.modelNumber}
                    onChange={(e) => setForm((f) => ({ ...f, modelNumber: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Ana görsel URL</label>
                <input
                  className="form-control"
                  value={form.mainImageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, mainImageUrl: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Ürün özellikleri</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {specRows.map((row, index) => (
                    <div
                      key={index}
                      style={{ display: "grid", gridTemplateColumns: "1.2fr 1.5fr auto", gap: "0.5rem", alignItems: "center" }}
                    >
                      <input
                        className="form-control"
                        placeholder="Özellik adı (örn. ekran_boyutu)"
                        value={row.key}
                        onChange={(e) =>
                          setSpecRows((rows) =>
                            rows.map((r, i) => (i === index ? { ...r, key: e.target.value } : r)),
                          )
                        }
                      />
                      <input
                        className="form-control"
                        placeholder="Değer (örn. 6.5 inç)"
                        value={row.value}
                        onChange={(e) =>
                          setSpecRows((rows) =>
                            rows.map((r, i) => (i === index ? { ...r, value: e.target.value } : r)),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() =>
                          setSpecRows((rows) => rows.filter((_, i) => i !== index))
                        }
                        disabled={specRows.length === 1}
                      >
                        Satırı sil
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setSpecRows((rows) => [...rows, { key: "", value: "" }])}
                    style={{ alignSelf: "flex-start" }}
                  >
                    Özellik satırı ekle
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setShowAdvancedJson((v) => !v)}
                    style={{ fontSize: "0.8rem" }}
                  >
                    {showAdvancedJson ? "Gelişmiş JSON alanını gizle" : "Gelişmiş JSON alanını göster"}
                  </button>
                  {showAdvancedJson && (
                    <div>
                      <label className="form-label" style={{ fontSize: "0.85rem" }}>
                        Gelişmiş özellikler (JSON)
                      </label>
                      <textarea
                        className="form-control"
                        rows={4}
                        placeholder='Örn. {"ekran_boyutu": "6.5 inç", "hafiza": "128 GB"}'
                        value={form.specsJsonText}
                        onChange={(e) => setForm((f) => ({ ...f, specsJsonText: e.target.value }))}
                      />
                      <p className="text-muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        Buraya girilen JSON, yukarıdaki satır tabanlı özelliklerle birleştirilir.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label className="form-label">Açıklama</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Önerilen liste fiyatı (opsiyonel)</label>
                  <input
                    className="form-control"
                    placeholder="Örn. 14999.90"
                    value={form.recommendedPrice}
                    onChange={(e) => setForm((f) => ({ ...f, recommendedPrice: e.target.value }))}
                  />
                  <p className="text-muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                    Gerçek satış fiyatları mağaza teklifleri (offers) üzerinden yönetilir.
                  </p>
                </div>
              </div>
              <div style={{ marginTop: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                  İlk teklif (opsiyonel)
                </h2>
                <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>
                  İsterseniz ürün oluştururken aynı anda bir başlangıç teklifi de ekleyebilirsiniz.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.1fr", gap: "0.75rem" }}>
                  <div>
                    <label className="form-label">Mağaza</label>
                    <select
                      className="form-control"
                      value={form.initialOfferStoreId}
                      onChange={(e) => setForm((f) => ({ ...f, initialOfferStoreId: e.target.value }))}
                    >
                      <option value="">Seçiniz</option>
                      {stores?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Fiyat</label>
                    <input
                      className="form-control"
                      placeholder="Örn. 14999.90"
                      value={form.initialOfferPrice}
                      onChange={(e) => setForm((f) => ({ ...f, initialOfferPrice: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
                  <div>
                    <label className="form-label">Stok durumu</label>
                    <select
                      className="form-control"
                      value={form.initialOfferInStock}
                      onChange={(e) => setForm((f) => ({ ...f, initialOfferInStock: e.target.value }))}
                    >
                      <option value="in_stock">Stokta</option>
                      <option value="out_of_stock">Stokta değil</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Affiliate URL (opsiyonel)</label>
                    <input
                      className="form-control"
                      placeholder="Örn. mağaza affiliate linki"
                      value={form.initialOfferAffiliateUrl}
                      onChange={(e) => setForm((f) => ({ ...f, initialOfferAffiliateUrl: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Kaydediliyor..." : "Ürünü kaydet"}
                </button>
              </div>
              {message && (
                <div
                  style={{
                    marginTop: "0.25rem",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.375rem",
                    fontSize: "0.82rem",
                    backgroundColor: message.type === "success" ? "#ecfdf3" : "#fef2f2",
                    color: message.type === "success" ? "#166534" : "#b91c1c",
                    border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`
                  }}
                >
                  {message.text}
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
    </>
  );
}

