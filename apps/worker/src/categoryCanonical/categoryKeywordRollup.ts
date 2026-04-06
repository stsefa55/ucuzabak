import type { CanonicalCategory } from "./categoryNormalization";
import { normalizeForCategoryText } from "./categoryNormalization";

/**
 * Trendyol / pazaryeri yaprak etiketleri → mevcut canonical slug.
 * Kurallar önce en spesifik, sonra genel olacak şekilde sıralanır.
 * Slug DB'de yoksa `tryKeywordRollupSlug` sessizce atlar (kural etkisiz).
 */
export type KeywordRollupRule = {
  slug: string;
  /** normalizeForCategoryText çıktısı üzerinde çalışır */
  test: (n: string) => boolean;
};

function n(s: string): string {
  return normalizeForCategoryText(s);
}

/** Alt dize eşleşmesi (kelime sınırı yok; kısa parçalar için dikkatli kullan) */
const has = (norm: string, phrase: string): boolean => norm.includes(n(phrase));

export const CATEGORY_KEYWORD_ROLLUP_RULES: KeywordRollupRule[] = [
  // --- Telefon & görüntü ---
  { slug: "cep-telefonu", test: (x) => has(x, "iphone") || has(x, "cep telefonu") || (has(x, "android") && has(x, "telefon")) },
  { slug: "kulaklik", test: (x) => has(x, "kulaklik") || has(x, "tws") || has(x, "airpods") },
  // TV aksı / aparat önce (geniş "tv" kelimesi televizyon köküne yanlış düşmesin)
  { slug: "televizyon-tv-duvar-aski-aparatlari", test: (x) => has(x, "tv aski") || has(x, "tv aparati") },
  { slug: "televizyon", test: (x) => has(x, "televizyon") || x.endsWith(" tv") },
  { slug: "tablet", test: (x) => has(x, "tablet") },
  { slug: "laptop", test: (x) => has(x, "laptop") || has(x, "notebook") || has(x, "macbook") },
  { slug: "elektronik-giyilebilir-teknoloji-akilli-saat", test: (x) => has(x, "akilli saat") || has(x, "apple watch") },
  { slug: "elektronik-giyilebilir-teknoloji-akilli-bileklik", test: (x) => has(x, "akilli bileklik") },
  { slug: "elektronik-kamera-fotograf-fotograf-makinesi", test: (x) => has(x, "fotograf makinesi") || has(x, "dijital foto") },
  { slug: "elektronik-oyun-konsol-oyun-konsolu", test: (x) => has(x, "playstation") || has(x, "xbox") || has(x, "oyun konsolu") },
  { slug: "elektronik-bilgisayar-masausti-bilgisayar", test: (x) => has(x, "masaustu bilgisayar") || has(x, "oyuncu masaustu") },
  { slug: "elektronik-bilgisayar-bilesenleri-ekran-karti", test: (x) => has(x, "ekran karti") || has(x, "grafik kart") },

  // --- Beyaz eşya / ev ---
  { slug: "kurutma-makinesi", test: (x) => has(x, "kurutma makinesi") },
  { slug: "camsasir-makinesi", test: (x) => has(x, "camasir makinesi") },
  { slug: "bulasik-makinesi", test: (x) => has(x, "bulasik makinesi") },
  { slug: "buzdolabi", test: (x) => has(x, "buzdolabi") || has(x, "buzdolab") },
  { slug: "ev-yasam-isitma-sogutma", test: (x) => has(x, "hava nemlendirici") || has(x, "nemlendirici") },
  { slug: "ev-yasam-isitma-sogutma-hava-temizleyici", test: (x) => has(x, "hava temizleyici") },
  { slug: "ev-yasam-aydinlatma", test: (x) => has(x, "led isik") || has(x, "led ampul") },

  // --- Moda ---
  { slug: "moda", test: (x) => has(x, "kazak") || has(x, "hirka") || has(x, "ceket") || has(x, "sweatshirt") },
  { slug: "moda", test: (x) => has(x, "t-shirt") || has(x, "tisort") || has(x, "polo") },
  { slug: "moda", test: (x) => has(x, "elbise") || has(x, "takim elbise") || has(x, "abiye") },
  { slug: "moda", test: (x) => has(x, "palto") || has(x, "trenckot") || has(x, "mont") },
  { slug: "moda", test: (x) => has(x, "pijama") || has(x, "atlet") || has(x, "esofman") },
  { slug: "moda", test: (x) => has(x, "jeans") || has(x, "kot pantolon") },
  { slug: "moda", test: (x) => has(x, "bluz") || has(x, "gomlek") || has(x, "tunik") },
  { slug: "moda", test: (x) => has(x, "buyuk beden") },
  { slug: "moda-spor-giyim", test: (x) => has(x, "spor t-shirt") || has(x, "spor sweatshirt") || has(x, "spor sort") || has(x, "spor atlet") },
  { slug: "moda-ic-giyim", test: (x) => has(x, "termal giyim") || has(x, "iclik") || has(x, "sutyen") || has(x, "kulot") },
  { slug: "moda-dis-giyim", test: (x) => has(x, "atkı") || has(x, "bere") || has(x, "sapka") || has(x, "boyunluk") },

  // --- Ayakkabı (bot kelimesi: robot süpürge yanlış eşleşmesin) ---
  { slug: "ayakkabi-canta-bot-cizme", test: (x) => has(x, "bot bootie") || has(x, "kar botu") || has(x, "krampon") },
  { slug: "ayakkabi-canta-bot-cizme", test: (x) => has(x, "cizme") && !has(x, "motosiklet") },
  { slug: "spor-ayakkabi", test: (x) => has(x, "basketbol ayakkabisi") || has(x, "kosu ayakkabisi") || has(x, "halı saha") || has(x, "deniz ayakkabisi") },
  { slug: "spor-ayakkabi", test: (x) => has(x, "spor ayakkab") || has(x, "sneaker") || has(x, "outdoor ayakkabi") || has(x, "yuruyus ayakkabisi") },
  { slug: "ayakkabi-canta-terlik-sandalet", test: (x) => has(x, "panduf") || has(x, "terlik") || has(x, "sandalet") || has(x, "loafer") },
  { slug: "ayakkabi-canta-canta", test: (x) => has(x, "bel cantasi") || has(x, "el cantasi") || has(x, "portfoy") || has(x, "clutch") },
  { slug: "ayakkabi-canta-canta", test: (x) => has(x, "spor cantasi") || has(x, "beslenme cantasi") || has(x, "notebook cantasi") },
  { slug: "ayakkabi-canta-valiz-seyahat", test: (x) => has(x, "valiz") || has(x, "bavul") },
  { slug: "ayakkabi-canta-kadin-ayakkabi-topuklu-ayakkabi", test: (x) => has(x, "topuklu") },
  { slug: "ayakkabi-canta-erkek-ayakkabi-deri-ayakkabi", test: (x) => has(x, "klasik ayakkabi") },

  // --- Kozmetik ---
  { slug: "kozmetik", test: (x) => has(x, "maskara") || has(x, "allik") || has(x, "kontur") || has(x, "makyaj") },
  { slug: "kozmetik", test: (x) => has(x, "manikur") || has(x, "pedikur") },
  { slug: "cilt-bakimi", test: (x) => has(x, "yuz kremi") || has(x, "cilt serumu") || has(x, "yuz gunes kremi") },
  { slug: "sac-bakim", test: (x) => has(x, "sac spreyi") },
  { slug: "parfum", test: (x) => has(x, "parfum seti") },
  { slug: "tras", test: (x) => has(x, "tiras sonrasi") },

  // --- Kitap ---
  { slug: "kitap-muzik-film-akademik-egitim-matematik-fen", test: (x) => has(x, "ders") && has(x, "kitap") },
  { slug: "kitap-muzik-film-akademik-egitim-matematik-fen", test: (x) => has(x, "sinav hazirlik") || has(x, "yabanci dil") },
  { slug: "kitap-muzik-film-cocuk-kitaplari-masal-kitaplari", test: (x) => has(x, "cocuk kitap") },
  { slug: "kitap-muzik-film-roman-hikaye-romanlar", test: (x) => has(x, "yabanci dil roman") },
  { slug: "kitap-muzik-film-kitap-kisisel-gelisim", test: (x) => has(x, "bireysel gelisim") || has(x, "kisisel gelisim") },

  // --- Takı ---
  { slug: "taki-aksesuar-kolye-uclari-kolye-zincirleri", test: (x) => has(x, "kolye") || has(x, "gumus kolye") || has(x, "celik kolye") },
  { slug: "taki-aksesuar-bijuteri-gunluk-bijuteri", test: (x) => has(x, "boncuk") || has(x, "toka") },

  // --- Otomotiv ---
  { slug: "otomotiv-oto-aksesuarlari", test: (x) => has(x, "oto paspas") || has(x, "arac ici telefon tutucu") },

  // --- Pet ---
  { slug: "pet-shop-kedi-kedi-mamasi", test: (x) => has(x, "kedi kuru mamasi") || has(x, "kedi mamasi") },
  { slug: "pet-shop-mama-kuru-mama", test: (x) => has(x, "kopek mamasi") },

  // --- Süpermarket ---
  { slug: "supermarket-temizlik-urunleri-yuzey-temizleyici", test: (x) => has(x, "camasir deterjani") || has(x, "temizlik bezi") },
  { slug: "supermarket-temizlik-urunleri-banyo-temizleyici", test: (x) => has(x, "banyo lifi") || has(x, "sunger") },
  { slug: "temizlik", test: (x) => has(x, "kati sabun") || has(x, "sivi sabun") },

  // --- Oyun & hobi ---
  { slug: "oyun-hobi-koleksiyon-koleksiyon-figur", test: (x) => has(x, "figur") && !has(x, "oyuncak araba") },
  { slug: "oyun-hobi-koleksiyon-koleksiyon-figur", test: (x) => has(x, "konsept hediyelik") },
  { slug: "oyun-hobi-egitici-oyuncaklar-puzzle", test: (x) => has(x, "kar kuresi") },

  // --- Bebek ---
  { slug: "anne-bebek-bebek-giyim", test: (x) => has(x, "bebek body") || has(x, "bebek takimi") || has(x, "hastane cikisi") },
  { slug: "anne-bebek-bebek-beslenme", test: (x) => has(x, "bebek bakim cantasi") },

  // --- Spor ekipman ---
  { slug: "fitness-aksesuarlar-dambil-ve-agirlik", test: (x) => has(x, "dambil standi") },

  // --- Yapı market ---
  { slug: "yapi-market-bahce-elektrikli-el-aletleri-matkap-vidalama", test: (x) => has(x, "matkap") },

  // --- Müzik aleti ---
  { slug: "oyun-hobi-muzik-enstrumanlari-gitar", test: (x) => has(x, "piyano") || has(x, "gitar") },

  // --- Oyuncak ---
  { slug: "anne-bebek-oyuncak-egitici-oyuncak", test: (x) => has(x, "oyuncak araba") || has(x, "pedalli arac") },

  // --- Mobilya ---
  { slug: "mobilya-depolama-mobilyalari", test: (x) => has(x, "dolap") && has(x, "gardirob") },

  // --- Geniş ---
  { slug: "moda", test: (x) => has(x, "corap") || has(x, "korse") },
  { slug: "ev-yasam", test: (x) => has(x, "hediye kutusu") },
  { slug: "oyun-hobi", test: (x) => has(x, "balon") },
  { slug: "supermarket-temel-gida", test: (x) => has(x, "baharat") || has(x, "dokme cay") },
  { slug: "atistirmalik", test: (x) => has(x, "sekerleme") }
];

export function tryKeywordRollupSlug(norm: string, slugMap: Map<string, CanonicalCategory>): number | null {
  const trimmed = norm.trim();
  if (trimmed.length < 2) return null;
  for (const rule of CATEGORY_KEYWORD_ROLLUP_RULES) {
    if (!rule.test(trimmed)) continue;
    const cat = slugMap.get(rule.slug);
    if (cat) return cat.id;
  }
  return null;
}
