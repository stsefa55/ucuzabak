/**
 * Normalize edilmiş `categoryText` → mevcut kategori `slug` (global unique).
 * Anahtarlar `normalizeCategoryPhrase()` çıktısı ile eşleşmeli (küçük harf, Türkçe fold, & → ve).
 *
 * Yeni satır: seed'deki `slugify` ile hedef slug'ı doğrula (`canonicalSlugify` ile aynı kural).
 */
export const CATEGORY_PHRASE_ALIASES: Record<string, string> = {
  // Kullanıcı örnekleri
  "deodorant ve roll on": "parfum-deodorant-ve-sprey",
  "deodorant roll on": "parfum-deodorant-ve-sprey",
  "roll on": "parfum-deodorant-ve-sprey",
  deodorant: "parfum-deodorant-ve-sprey",
  // Seed slugify("İç Giyim") → "i-c-giyim" (İ + JS toLowerCase); DB'de moda-i-c-giyim
  slip: "moda-i-c-giyim",
  "sac maskesi": "sac-bakim-sac-maskesi-ve-onarici",
  eldiven: "yapi-market-bahce-bahce-araclari-bahce-eldiveni",

  // Elektronik (kök L2; import slug'ları korunur)
  "cep telefonu": "cep-telefonu",
  laptop: "laptop",
  televizyon: "televizyon",
  tablet: "tablet",
  kulaklik: "kulaklik",
  kamera: "kamera",

  // Beyaz eşya
  buzdolabi: "buzdolabi",
  "camasir makinesi": "camsasir-makinesi",
  "bulasik makinesi": "bulasik-makinesi",
  "kurutma makinesi": "kurutma-makinesi",
  "derin dondurucu": "derin-dondurucu",

  // Ev yaşam
  "elektrikli supurge": "elektrikli-supurge",
  supurge: "elektrikli-supurge",
  "kahve makinesi": "kahve-makinesi",
  "tencere tava": "tencere-tava",
  aydinlatma: "aydinlatma",
  "ev tekstili": "ev-tekstili",
  isiticilar: "isiticilar",

  // Kişisel bakım
  "sac bakim": "sac-bakim",
  sampuan: "sac-bakim-sampuan-ve-sac-kremi",
  "sac kremi": "sac-bakim-sampuan-ve-sac-kremi",
  "cilt bakimi": "cilt-bakimi",
  "agiz bakimi": "agiz-bakimi",
  "dis macunu": "dis-bakimi-dis-macunu",
  parfum: "parfum-parfum",
  kozmetik: "kozmetik",
  tras: "tras",
  "dus jeli": "kisisel-bakim-kisisel-hijyen-dus-jeli",
  "dus": "kisisel-bakim-kisisel-hijyen",

  // Spor
  "fitness aksesuarlari": "fitness-aksesuarlar",
  bisiklet: "bisiklet",

  // Ofis
  kalem: "kalem",
  defter: "defterler",

  // Pet / süpermarket
  "kedi mamasi": "kedi-mamasi",
  "kopek mamasi": "kopek-mamasi",
  "temel gida": "temel-gida",
  icecek: "icecek",
  temizlik: "temizlik",
  "temizlik urunleri": "supermarket-temizlik-urunleri",

  // Anne & bebek
  "bebek bezi": "anne-bebek-bebek-bezi",

  // Sağlık
  vitamin: "saglik-vitamin-takviye",

  // Otomotiv
  "oto aksesuarlari": "oto-aksesuarlar",

  // --- Son geçiş: kalan pazar yeri etiketleri (seed slug’ları doğrulandı) ---
  // Saç maşası → saç bakım (elektrikli şekillendirme; ayrı yaprak yok)
  "sac masasi": "sac-bakim",
  // Sandık → depolama mobilyası
  sandik: "mobilya-depolama-mobilyalari",
  // Sabunluk → banyo duş aksesuarı
  sabunluk: "ev-yasam-banyo-dus-aksesuarlari",
  // Slip → moda-i-c-giyim (üstte "slip" anahtarı)
  // Boyunluk → dış giyim (atkı/boyunluk)
  boyunluk: "moda-dis-giyim",
  // Akıllı çocuk saati → giyilebilir / akıllı saat
  "akilli cocuk saati": "elektronik-giyilebilir-teknoloji-akilli-saat",
  // Spor slip → moda spor giyim
  "spor slip": "moda-spor-giyim",
  // Fitness / motosiklet eldiveni
  "agirlik eldiveni": "fitness-aksesuarlar-dambil-ve-agirlik",
  "motosiklet eldiveni": "otomotiv-motosiklet-ekipman",
  // Gelin aksesuarı → bijuteri (düğün/aksesuar)
  "gelin aksesuari": "taki-aksesuar-bijuteri"
};
