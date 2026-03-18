# MVP Stabilizasyon Denetimi – Özet Rapor

## 1. Tespit Edilen Sorunlar

| # | Alan | Sorun | Etki |
|---|------|--------|------|
| 1 | Veri tutarlılığı | Storefront ürün detayında **tüm teklifler** (ACTIVE, DISABLED, OUT_OF_STOCK) listeleniyordu; kullanıcı devre dışı/stokta yok teklifleri de görüyordu. | Yanlış fiyat/mağaza gösterimi, tıklanabilir pasif teklifler. |
| 2 | Storefront listeleri | Public **ürün listesi** (`GET /products`) ürün status’ü filtrelemiyordu; INACTIVE ürünler anasayfa/kategori listelerinde görünebiliyordu. | Pasif ürünler mağaza ön yüzünde listeleniyordu. |
| 3 | Storefront detay | **Ürün detay** (`findBySlug`) slug ile bulduğu her ürünü döndürüyordu; INACTIVE ürün doğrudan linkle açılabiliyordu. | Pasif ürünler URL ile görüntülenebiliyordu. |
| 4 | Admin ürün düzenleme | Route **id** değiştiğinde (örn. listeden başka ürünün düzenlemesine geçince) React Query önbelleğindeki **önceki ürün** kısa süre formda gösteriliyordu. | Yanlış ürün bilgisiyle form gösterimi. |
| 5 | Admin CSV import | Hata durumunda sadece genel “İçeri aktarma sırasında bir hata oluştu” mesajı gösteriliyordu; **API’den gelen hata mesajı** kullanıcıya iletilmiyordu. | Hata ayıklama ve kullanıcı bilgilendirme zayıf. |
| 6 | CSV import sonuç | `result.errors` yoksa veya dizi değilse **result.errors.length** erişimi runtime hatası riski taşıyordu. | Opsiyonel alanlı API yanıtında sayfa kırılması. |
| 7 | Karşılaştırma sayfası | Özellikler satırında **Fragment** kullanılırken `key` üst elemana verilmediği için React list uyarısı oluşuyordu. | Konsol uyarısı, liste güncellemelerinde potansiyel tutarsızlık. |

---

## 2. Uygulanan Düzeltmeler

- **Storefront teklifleri:** `getOffersBySlug` sadece `status: OfferStatus.ACTIVE` olan teklifleri döndürüyor; ürün detayında yalnızca aktif teklifler listeleniyor.
- **Public ürün listesi:** `products.service.ts` içinde `list()` artık `where: { status: ProductStatus.ACTIVE }` ile sadece aktif ürünleri döndürüyor (anasayfa, kategori, vb.).
- **Ürün detay (slug):** `findBySlug()` artık `where: { slug, status: ProductStatus.ACTIVE }` ile sadece aktif ürünü döndürüyor; pasif ürün 404.
- **Admin ürün düzenleme:** `product?.id !== id` kontrolü eklendi; id değişince “Yükleniyor” gösteriliyor, önceki ürün formda gösterilmiyor.
- **CSV import hata mesajı:** `catch` içinde API’den gelen metin kullanılıyor; JSON ise `parsed.message` tercih ediliyor, aksi halde ham mesaj gösteriliyor.
- **CSV import errors:** `result.errors` için `Array.isArray(result.errors) && result.errors.length > 0` kontrolü eklendi; yoksa liste render edilmiyor.
- **Karşılaştırma sayfası:** Özellikler listesinde `React.Fragment` ile tek bir `key` verildi; React list uyarısı giderildi.

---

## 3. Değiştirilen Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `apps/api/src/products/products.service.ts` | `OfferStatus`, `ProductStatus` import; `list()` için `status: ProductStatus.ACTIVE`; `findBySlug()` için `slug + status: ACTIVE`; `getOffersBySlug()` için `status: OfferStatus.ACTIVE`. |
| `apps/web/app/admin/urunler/[id]/page.tsx` | Stale product engelleme: `productMismatch = product != null && product.id !== id`; loading/not-found koşuluna `productMismatch` eklendi. |
| `apps/web/app/admin/urun-import/page.tsx` | Catch’te API hata mesajı (JSON.message veya ham metin) gösterimi; `result.errors` için `Array.isArray(result.errors) && result.errors.length > 0` kontrolü. |
| `apps/web/app/karsilastir/page.tsx` | `React` import; özellikler listesinde `React.Fragment` + tek `key` kullanımı. |

---

## 4. Kalan Zayıf Noktalar (Düzeltilmedi / İzlenmeli)

- **Auth:** Admin layout client-side’da `user.role !== "ADMIN"` kontrolü yapıyor; API’de admin route’ları JWT + rol ile korunuyor. Sayfa yenilenmeden token/rol değişirse kısa süre eski rol görünebilir (yenileme veya token süresi ile düzelir).
- **Fiyat formatı:** Ürün detayında `offer.currentPrice` API’den string veya number gelebilir; büyük sayılarda binlik ayraç yok (sadece “1234.56 TL”). İsteğe bağlı: `toLocaleString("tr-TR")` ile formatlanabilir.
- **Feed import:** Hata durumunda `errorLog` metin olarak gösteriliyor; çok uzun veya yapılandırılmış log için ileride parse/kesme eklenebilir.
- **Ürün detay 404:** Slug ile bulunamayan veya pasif ürün için Next.js `notFound()` kullanılıyor; özel 404 sayfası yok (isteğe bağlı iyileştirme).

---

## 5. Manuel Test Kontrol Listesi

### Admin akışları

- [ ] **Ürün oluştur:** Giriş yap → Admin → Ürün ekle → Zorunlu alanları doldur → Kaydet → Listede görünüyor.
- [ ] **Ürün düzenle:** Ürünler → Bir ürünün “Düzenle” → Bilgi değiştir → Kaydet → Değişiklikler kalıcı; “Storefront’ta gör” ile doğru ürün açılıyor.
- [ ] **Teklif ekle/güncelle:** Ürün düzenle → Yeni teklif ekle (mağaza, fiyat, stok, URL) → Kaydet; mevcut teklifte fiyat/durum değiştir → Kaydet; aynı mağaza tekrar eklenince mevcut teklif güncelleniyor.
- [ ] **Teklif durumu:** Ürün düzenle → Bir teklifin Durum’unu “Devre dışı” veya “Stokta yok” yap → Kaydet → Storefront ürün sayfasında bu teklif listede görünmüyor.
- [ ] **CSV import:** Admin → CSV ile ürün içeri aktarma → Geçerli CSV yapıştır → İçeri aktar → Özet ve varsa satır hataları görünüyor; hatalı istekte API’den gelen hata mesajı sayfada görünüyor.
- [ ] **Feed import tetikle:** Admin → Mağazalar → Bir mağazada “Şimdi içeri aktar” → Başarı mesajı ve import ID; Feed importları sayfasında kayıt görünüyor.
- [ ] **Feed import listesi/detay:** Admin → Feed importları → Liste yükleniyor; durum filtresi çalışıyor; bir satırda “Detay” → sourceRef, checksum, errorLog (varsa) görünüyor; hatalı satır vurgulu.

### Storefront akışları

- [ ] **Anasayfa:** Kategoriler, ürünler, popüler/fiyatı düşen/fırsat bölümleri yükleniyor; sadece aktif ürünler listeleniyor.
- [ ] **Kategori:** Bir kategoriye tıkla → Sadece o kategorideki aktif ürünler; pasif ürün yok.
- [ ] **Arama:** Arama kutusu veya /arama?q=… → Sonuçlar geliyor; sadece aktif ürünler.
- [ ] **Ürün detay:** Ürün kartına tıkla → Detay açılıyor; sadece aktif teklifler tabloda; fiyat/mağaza doğru; görsel yoksa “Görsel yok” placeholder.
- [ ] **Karşılaştırma:** Ürünlerden “Karşılaştır” ile 2–4 ürün ekle → Karşılaştır sayfasına git → Marka, kategori, en düşük fiyat, teklif sayısı, EAN, model, özellikler doğru; “Temizle” / “Kaldır” çalışıyor; olmayan ürün için “Ürün artık mevcut değil” ve “Kaldır” görünüyor.
- [ ] **Popüler / Fiyatı düşen / Fırsat:** İlgili sayfalara git → Listeler yükleniyor, kartlar tıklanınca doğru ürün detayına gidiyor.

### Veri tutarlılığı

- [ ] **Ürün cache:** Admin’de bir teklif fiyatı veya durumu değişince ürün listesi/detayda en düşük fiyat ve teklif sayısı güncel.
- [ ] **Aktif/pasif teklif:** Teklif “Devre dışı” yapıldığında storefront detayda o teklif yok; “Stokta yok” yapıldığında da yok.
- [ ] **Karşılaştırma fiyatı:** Karşılaştırma sayfası açıldığında API’den güncel ürün çekiliyor; “En düşük fiyat” cache ile uyumlu.
- [ ] **Görsel yok:** mainImageUrl boş ürünlerde kart ve detayda “Görsel yok” placeholder görünüyor.

### Auth / Erişim

- [ ] **Admin sayfaları:** Çıkış yap → /admin veya /admin/urunler aç → “Giriş yap” veya yetkisiz mesajı; admin olmayan kullanıcı ile giriş yapınca “Bu alana erişim yetkiniz yok”.
- [ ] **Girişli kullanıcı:** Normal kullanıcı ile giriş → Anasayfa, arama, ürün detay, karşılaştırma, profil (varsa) çalışıyor.
- [ ] **Çıkış / tekrar giriş:** Çıkış yap → Anasayfa hâlâ çalışıyor; tekrar giriş → Admin kullanıcı ile admin sayfalarına erişilebiliyor.

---

*Denetim tarihi: 2025-03-13*
