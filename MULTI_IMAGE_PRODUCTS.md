# Çoklu Ürün Görseli – Özet

## 1. Değiştirilen / Eklenen Dosyalar

### Veritabanı / API
- `apps/api/prisma/schema.prisma` – ProductImage modeli ve Product ilişkisi
- `apps/api/src/products/products.service.ts` – findBySlug içinde productImages include
- `apps/api/src/admin/admin.controller.ts` – getProductById’e productImages, GET/POST/DELETE/PATCH product images endpoint’leri

### Web – Admin
- `apps/web/app/admin/urunler/[id]/page.tsx` – ProductImage tipi, görsel ekleme/silme/sıralama alanı ve mutasyonları

### Web – Mağaza
- `apps/web/src/components/products/ProductGallery.tsx` – Yeni (ana görsel, oklar, thumbnails)
- `apps/web/app/urun/[slug]/page.tsx` – ProductGallery kullanımı
- `apps/web/app/globals.css` – Galeri thumbnail stilleri ve mobil

---

## 2. Şema Değişiklikleri

**Yeni model: ProductImage**

- `id` – Int, PK, auto
- `productId` – Int, FK → Product (onDelete: Cascade)
- `imageUrl` – String
- `position` – Int, default 0  
- `@@index([productId])`

**Product**

- `productImages` – ProductImage[] ilişkisi eklendi.

Migration: `cd apps/api && npx prisma migrate dev --name add_product_images`

---

## 3. Admin Tarafı Değişiklikleri

- **Ürün detay (GET /admin/products/:id):** Cevapta `productImages` (position’a göre sıralı) dönüyor.
- **Yeni endpoint’ler:**
  - `GET /admin/products/:id/images` – Ürünün görselleri
  - `POST /admin/products/:id/images` – Body: `{ imageUrl: string }`, yeni görsel ekler (position otomatik)
  - `DELETE /admin/products/:id/images/:imageId` – Görsel siler
  - `PATCH /admin/products/:id/images/reorder` – Body: `{ imageIds: number[] }`, sırayı günceller

- **Ürün düzenleme sayfası:**
  - “Ürün görselleri” bölümü: açıklama, URL input + “Ekle” butonu.
  - Mevcut görseller: küçük önizleme, **Yukarı** / **Aşağı** (sıra), **Sil**.
  - Eklenen/silinen/sıra değişen görseller anında listelenir (query invalidation).

---

## 4. Frontend (Mağaza) Değişiklikleri

- **ProductGallery (client component):**
  - Görsel listesi: önce `productImages` (position sırası), yoksa `mainImageUrl` (tek görsel), ikisi de yoksa “Görsel yok” placeholder.
  - Ana alan: seçili görsel büyük gösterilir.
  - Birden fazla görselde: sol/sağ ok ile önceki/sonraki, altta thumbnail’lar (tıklanınca seçili görsel değişir).
  - Tek görselde oklar ve thumbnail’lar gösterilmez.
  - Responsive: Mobilde thumbnail’lar yatay kaydırılabilir (flex-wrap: nowrap, overflow-x: auto).

- **Ürün detay sayfası:** Mevcut tek görsel alanı kaldırıldı, yerine `<ProductGallery productName={...} mainImageUrl={...} images={...} />` kullanılıyor. Sayfa layout’u ve diğer bölümler aynı.

---

## 5. Manuel Test Adımları

1. **Migration**
   - `cd apps/api && npx prisma migrate dev --name add_product_images`
   - Gerekirse `npx prisma generate`

2. **Admin – Görsel ekleme**
   - Admin → Ürünler → Bir ürünü düzenle.
   - “Ürün görselleri” bölümünde bir görsel URL’si yapıştırıp “Ekle” ile ekleyin.
   - Liste güncellenmeli, yeni satır görünmeli.

3. **Admin – Görsel silme**
   - Bir görselin “Sil”ine tıklayıp onaylayın.
   - Görsel listeden kalkmalı.

4. **Admin – Sıralama**
   - En az 2 görsel varken “Yukarı” / “Aşağı” ile sırayı değiştirin.
   - Liste sırası ve (mağaza sayfasında) görsel sırası buna göre değişmeli.

5. **Mağaza – Tek görsel**
   - Sadece ana görsel URL’si olan (veya sadece 1 ProductImage olan) bir ürün sayfasını açın.
   - Tek görsel büyük görünmeli, ok/thumbnail olmamalı.

6. **Mağaza – Çoklu görsel**
   - Birden fazla ProductImage eklenmiş bir ürün sayfasını açın.
   - Ana alanda ilk görsel, sol/sağ oklarla geçiş, altta thumbnail’lar görünmeli.
   - Thumbnail’a tıklanınca ana görsel değişmeli; oklar da aynı şekilde çalışmalı.

7. **Mobil**
   - Ürün detayında galeriyi dar ekranda açın.
   - Thumbnail’lar yatay kaydırılabilir olmalı, layout bozulmamalı.

8. **Geriye dönük**
   - productImages’ı olmayan eski bir ürün: sadece mainImageUrl varsa tek görsel olarak görünmeli; ikisi de yoksa “Görsel yok” çıkmalı.
