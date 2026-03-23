const ICON_NAME_TO_IONICON: Record<string, string> = {
  electronics: "phone-portrait-outline",
  whitegoods: "construct-outline",
  home: "home-outline",
  // Expo Ionicons sürümünde her ikon adı her zaman bulunmayabiliyor.
  // Kişisel Bakım için daha garantili bir fallback ikon kullanıyoruz.
  "personal-care": "person-outline",
  baby: "heart-outline",
  sports: "basketball-outline",
  automotive: "car-outline",
  office: "document-text-outline",
  pet: "paw-outline",
  grocery: "cart-outline"
};

function normalizeTR(s: string) {
  // Diakritikleri kaldır (örn. "Ağız" -> "Agiz") anahtar eşleşmelerini kolaylaştırır.
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function pickVariantForElectronics(context: string) {
  // Burada sadece varlığı çok muhtemel Ioniconları seçiyoruz; yoksa fallback otomatik gruba döner.
  if (context.includes("telefon") || context.includes("cep")) return "phone-portrait-outline";
  if (context.includes("laptop") || context.includes("bilgisayar")) return "laptop-outline";
  if (context.includes("masa") || context.includes("desktop")) return "desktop-outline";
  if (context.includes("monit")) return "desktop-outline";
  if (context.includes("tv") || context.includes("televizyon")) return "tv-outline";
  if (context.includes("tablet")) return "tablet-landscape-outline";
  if (context.includes("kulak")) return "headset-outline";
  if (context.includes("kamera")) return "camera-outline";
  if (context.includes("yazici") || context.includes("tarayici")) return "print-outline";
  if (context.includes("router") || context.includes("ag") || context.includes("network")) return "wifi-outline";
  if (context.includes("ses") || context.includes("soundbar") || context.includes("hoparl")) return "musical-notes-outline";
  if (context.includes("saat") || context.includes("giyilebilir")) return "watch-outline";
  if (context.includes("konsol") || context.includes("oyun")) return "game-controller-outline";
  if (context.includes("ofis") || context.includes("projeksiyon")) return "reader-outline";
  return null;
}

function pickVariantForPersonalCare(context: string) {
  // Bu grupta daha az ikon varyantı kullanıyoruz; yoksa yanlış ikon yüzünden "?" görünmesi riski artar.
  // Bilinen güvenli alternatif: heart-outline
  if (context.includes("parfum") || context.includes("dis") || context.includes("agiz") || context.includes("medikal")) return "heart-outline";
  return null;
}

export function getCategoryIoniconName(iconName?: string | null, contextLabelOrSlug?: string | null) {
  if (!iconName) return "help-circle-outline";

  // Backend'den gelen iconName bazen camelCase / underscore / space / trailing space şeklinde gelebilir.
  // Bunları normalize ederek mapping'e daha güvenli ulaşmak istiyoruz.
  const raw = iconName.trim();
  if (!raw) return "help-circle-outline";

  const normalized = raw
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  // Örnek: "personalcare" -> "personal-care"
  const key = normalized === "personalcare" ? "personal-care" : normalized;

  // Mapping'de varsa onu kullan, yoksa '?' yerine daha güvenli bir fallback ver.
  const base = ICON_NAME_TO_IONICON[key] ?? "help-circle-outline";

  if (!contextLabelOrSlug) return base;

  const context = normalizeTR(String(contextLabelOrSlug).toLowerCase());
  // Aynı group'un farklı alt dalları için ikon çeşitliliği.
  if (key === "electronics") {
    return pickVariantForElectronics(context) ?? base;
  }
  if (key === "personal-care") {
    return pickVariantForPersonalCare(context) ?? base;
  }

  // Diğer gruplarda default icon daha tutarlı; gerekirse ileride genişletilebilir.
  return base;
}

