/**
 * Katalog omurgası — ürün slug, başlık/marka normalizasyonu, kategori metni, model çıkarımı.
 * Seed (`apps/api/prisma/seed.ts`) ve worker ile aynı slug kuralını koruyun.
 */

/** Storefront’ta kabul edilen canonical slug biçimi (küçük harf, tire, rakam). */
export const CANONICAL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidCanonicalSlug(slug: string): boolean {
  const s = slug.trim();
  return s.length > 0 && CANONICAL_SLUG_PATTERN.test(s);
}

/**
 * Ürün / kategori slug üretimi — seed & worker `canonicalSlugify` ile uyumlu.
 */
export function slugifyCanonical(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, " ve ")
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g")
    .replace(/[ı]/g, "i")
    .replace(/[i]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ş]/g, "s")
    .replace(/[ü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Ürün adı karşılaştırması (eşleştirme): Türkçe locale, noktalama sadeleştirme.
 */
export function normalizeProductTitle(input: string): string {
  return input
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/&/g, " ve ")
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g")
    .replace(/[ı]/g, "i")
    .replace(/[i]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ş]/g, "s")
    .replace(/[ü]/g, "u")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** E-ticaret başlıklarında sık tekrarlayan gürültü (eşleştirme için atılır). */
const PRODUCT_TITLE_NOISE_WORDS = new Set([
  "urun",
  "product",
  "orijinal",
  "original",
  "garantili",
  "garanti",
  "warranty",
  "kargo",
  "ucretsiz",
  "bedava",
  "ucretsizkargo",
  "hediye",
  "seti",
  "paketi",
  "paket",
  "stokta",
  "taksit",
  "kampanya",
  "indirimli",
  "indirim",
  "satista",
  "satis",
  "online",
  "resmi",
  "lisansli",
  "distribitor",
  "distributor",
  "ithal",
  "ithalatci",
  "yeni",
  "sezon",
  "renk",
  "secenegi",
  "secenek",
  "adet",
  "toplu",
  "tikla",
  "hemen",
  "dahil",
  "haric",
  "ozellikleri",
  "detayli",
  "aciklama",
  "firsati",
  "super",
  "premium",
  "lux",
  "turkiye",
  "turkiyede",
  "en",
  "ucuz",
  "fiyat",
  "fiyati",
  "magaza",
  "store",
  "shop",
  "official",
  "satici",
  "satıcı",
  "magazamiz",
  "magazamız",
  "dukkan",
  "dükkan",
  "pazaryeri",
  "guvenilir",
  "güvenilir",
  "yetkili",
  "bayi",
  "outlet"
]);

/** Pazaryeri / kanal adları ve “resmi satıcı” kalıpları (ASCII + TR varyantları). */
const STORE_CHANNEL_PATTERN =
  /\b(trendyol|hepsiburada|hepsibuda|n11|amazon|gittigidiyor|pttavm|ciceksepeti|çiçeksepeti|teknosa|mediamarkt|vatan|vatanbilgisayar|pazaryeri|pazar\s*yeri|resmi\s*satici|resmi\s*satıcı|guvenilir\s*satici|güvenilir\s*satici|guvenilir\s*satıcı|güvenilir\s*satıcı|turkiye\s*garantili|türkiye\s*garantili)\b/gi;

/** Renk eşanlamlıları → tek token (çapraz mağaza TR/EN varyasyonları). */
const COLOR_TOKEN_CANON: Record<string, string> = {
  siyah: "c_blk",
  siyahi: "c_blk",
  black: "c_blk",
  beyaz: "c_wht",
  white: "c_wht",
  gri: "c_gry",
  gray: "c_gry",
  grey: "c_gry",
  gumus: "c_slv",
  gümüş: "c_slv",
  silver: "c_slv",
  altin: "c_gld",
  altın: "c_gld",
  gold: "c_gld",
  mavi: "c_blu",
  blue: "c_blu",
  kirmizi: "c_red",
  kırmızı: "c_red",
  red: "c_red",
  yesil: "c_grn",
  yeşil: "c_grn",
  green: "c_grn",
  sari: "c_ylw",
  sarı: "c_ylw",
  yellow: "c_ylw",
  turuncu: "c_org",
  orange: "c_org",
  mor: "c_prp",
  purple: "c_prp",
  pembe: "c_pnk",
  pink: "c_pnk",
  kahverengi: "c_brn",
  brown: "c_brn"
};

function stripStoreChannelPhrases(s: string): string {
  return s
    .replace(STORE_CHANNEL_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonColorTokens(tokens: string[]): string[] {
  return tokens.map((t) => COLOR_TOKEN_CANON[t] ?? t);
}

/**
 * Çapraz mağaza eşleştirme için başlık: birimleri hizalar, gürültü kelimeleri atar.
 * Görünür metin için `normalizeProductTitle` kullanmaya devam edin.
 */
export function normalizeProductTitleForMatching(input: string): string {
  let s = stripStoreChannelPhrases(normalizeProductTitle(input.trim()));
  s = s.replace(/(\d+)\s*,\s*(\d+)/g, "$1.$2");
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*(tb|gb|mb|kb)\b/g, (_, n: string, u: string) => `${n} ${u}`);
  s = s.replace(/\b(\d+(?:\.\d+)?)(tb|gb|mb|kb)\b/g, (_, n: string, u: string) => `${n} ${u}`);
  s = s.replace(/\b(\d+)\s*(gb|tb|mb)\s*(ram|bellek)\b/g, "$1 $2 ram");
  s = s.replace(/\bram\s*(\d+)\s*(gb|tb|mb)\b/g, "$1 $2 ram");
  s = s.replace(/\bram\b/g, " ram ");
  s = s.replace(/\s+/g, " ").trim();
  const rawTokens = s
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !PRODUCT_TITLE_NOISE_WORDS.has(t));
  const tokens = canonColorTokens(rawTokens);
  return tokens.join(" ").replace(/\s+/g, " ").trim();
}

/** Barkod karşılaştırması: yalnızca rakamlar (EAN-8 … EAN-14). */
export function normalizeEanDigits(ean: string | null | undefined): string | null {
  if (ean == null || String(ean).trim() === "") return null;
  const d = String(ean).replace(/\D/g, "");
  if (d.length < 8 || d.length > 14) return null;
  return d;
}

/** Model / MPN: boşluk, tire, noktalama yok sayılarak kıyaslama. */
export function normalizeModelNumberForMatch(mpn: string | null | undefined): string {
  if (mpn == null) return "";
  return String(mpn)
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Marka metni (karşılaştırma / basit eşleştirme).
 */
export function normalizeBrandText(input: string): string {
  return normalizeProductTitle(input);
}

const BRAND_CORPORATE_SUFFIX_RE =
  /\b(electronics|electric|technologies|technology|telekom|telecommunications|mobile|mobil|home|appliances|appliance|global|digital|consumer|international|group|holding)\b/giu;

const BRAND_LEGAL_SUFFIX_RE =
  /\b(incorporated|inc|ltd|limited|corp|corporation|co|company|llp|plc|gmbh|s\.a\.|sa|spa|bv|nv|a\.s\.|aş|as)\b/giu;

/**
 * "Samsung Electronics" / "Apple Inc." gibi varyantları aynı köke indirger (marka tablosu eşlemesi için).
 */
export function brandStemKeyForMatch(raw: string): string {
  let s = normalizeBrandText(raw);
  s = s.replace(BRAND_CORPORATE_SUFFIX_RE, " ");
  s = s.replace(BRAND_LEGAL_SUFFIX_RE, " ");
  s = s.replace(/\s+/g, " ").trim();
  const parts = s.split(" ").filter((p) => p.length > 1);
  if (parts.length === 0) return s;
  return parts[0]!;
}

/**
 * Feed kategori metni — eşleştirme anahtarı (worker `normalizeCategoryPhrase` ile aynı mantık).
 */
export function normalizeCategoryText(raw: string): string {
  const s = raw
    .replace(/[,;|]+/g, " ")
    .replace(/[>/\\]+/g, " ")
    .replace(/[-–—]+/g, " ")
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalizeProductTitle(s);
}

/** Import/worker otomatik kategori ataması — güvenli varsayılan (kodu tek yerden ayarlayın). */
export const AUTO_CATEGORY_MATCH_THRESHOLD = 0.75;

/** Admin öneri rozeti: güçlü eşleşme (yeşil). */
export const CATEGORY_SUGGESTION_STRONG = 0.85;

/** Admin öneri rozeti: orta (sarı) alt sınır. */
export const CATEGORY_SUGGESTION_OK = 0.7;

/**
 * Bigram / Sørensen–Dice benzerliği (0–1). `string-similarity` compareTwoStrings ile uyumlu aile.
 */
export function bigramDiceSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;

  const bigrams = (s: string): Map<string, number> => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      m.set(bg, (m.get(bg) ?? 0) + 1);
    }
    return m;
  };

  const a = bigrams(left);
  const b = bigrams(right);
  let intersection = 0;
  for (const [k, va] of a) {
    const vb = b.get(k) ?? 0;
    if (vb > 0) intersection += Math.min(va, vb);
  }
  return (2 * intersection) / (a.size + b.size);
}

/**
 * Otomatik kategori / admin önerisi için tek tip giriş (kategori adı + slug).
 */
export function normalizeForCategorySimilarityQuery(raw: string): string {
  return normalizeCategoryText(raw);
}

/**
 * Gelen feed parçası ile canonical ad/slug arasındaki en iyi skor (0–1).
 */
export function scoreQueryAgainstCanonical(
  queryRaw: string,
  categoryName: string,
  categorySlug: string
): number {
  const q = normalizeForCategorySimilarityQuery(queryRaw);
  if (!q) return 0;
  const n = normalizeProductTitle(categoryName);
  const s = normalizeProductTitle(categorySlug.replace(/-/g, " "));
  return Math.max(bigramDiceSimilarity(q, n), bigramDiceSimilarity(q, s));
}

/**
 * Feed’deki son segment (worker `resolveCategoryText` içindeki global/rollup ile uyumlu).
 */
export function lastCategorySegmentForSimilarity(raw: string): string {
  const parts = raw
    .split(/[>,/\\|;]+/g)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1]! : raw.trim();
}

/**
 * Tüm canonical adaylar arasında en iyi eşleşmeyi döner (sıralama / öneri UI).
 */
export function bestCanonicalCategoryBySimilarity(
  incomingRaw: string,
  categories: ReadonlyArray<{ id: number; name: string; slug: string }>
): { id: number; score: number } | null {
  const seg = lastCategorySegmentForSimilarity(incomingRaw);
  if (!seg) return null;
  let best: { id: number; score: number } | null = null;
  for (const c of categories) {
    const score = scoreQueryAgainstCanonical(seg, c.name, c.slug);
    if (!best || score > best.score) best = { id: c.id, score };
  }
  return best;
}

/**
 * Başlıktan kaba model / parça numarası çıkarımı (MPN yoksa).
 * Çok agresif olmayan heuristik — null güvenli.
 */
export function extractModelNumber(title: string): string | null {
  const t = title.trim();
  if (t.length < 4) return null;

  // Örn. WQG25201TR, ABC-1234, X1000 Pro
  const patterns = [
    /\b([A-Z]{2,10}\d{2,8}[A-Z]{0,4})\b/gi,
    /\b([A-Z]{1,4}[- ]?\d{3,6}[A-Z]?)\b/g,
    /\b(\d{3,5}[-][A-Z0-9]{2,8})\b/gi
  ];

  for (const re of patterns) {
    re.lastIndex = 0;
    const m = re.exec(t);
    if (m?.[1]) {
      const v = m[1].replace(/\s+/g, "-").trim();
      if (v.length >= 4 && v.length <= 64) return v;
    }
  }
  return null;
}
