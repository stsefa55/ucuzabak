import type { Category, Money, Offer, Product } from "./types";

export type ProductListMode = "popular" | "deals" | "recent";

const STORES = ["TrendyStore", "Teknosa", "Vatan", "MediaMart", "A101", "Bim", "Hepsiburada", "N11"] as const;

function formatMoney(amount: number, currency: string = "TRY"): Money {
  return { amount, currency };
}

function makeOffers(productId: string, basePrice: number): Offer[] {
  // Deterministic offers per productId.
  const seed = Array.from(productId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const multipliers = [0.92, 0.97, 1.0, 1.04];

  return multipliers.slice(0, 3).map((m, idx) => {
    const price = Math.round(basePrice * m);
    const storeName = STORES[(seed + idx) % STORES.length];
    return {
      id: `${productId}-offer-${idx + 1}`,
      storeName,
      price: formatMoney(price),
      url: "https://example.com/teklif",
    };
  });
}

export function mockImageUrls(productId: string, count: number = 4): string[] {
  // Picsum mock images; UI applies ecommerce-friendly aspect ratio.
  return Array.from({ length: count }).map((_, idx) => {
    const n = idx + 1;
    return `https://picsum.photos/seed/${encodeURIComponent(productId)}-${n}/1200/900`;
  });
}

export function mockProduct({
  id,
  name,
  price,
  storeCount,
  ratingAvg = 4.5,
  ratingCount = 120,
  imageUrl = null,
  dropPercent = null,
  specs = { Özellik: "Değer" },
  includeOffers = true,
}: {
  id: string;
  name: string;
  price: number;
  storeCount: number;
  ratingAvg?: number;
  ratingCount?: number;
  imageUrl?: string | null;
  dropPercent?: number | null;
  specs?: Product["specs"];
  includeOffers?: boolean;
}): Product {
  const oldPrice =
    dropPercent === null || dropPercent === undefined
      ? null
      : {
          amount: Math.round(price * (1 + dropPercent / 100)),
          currency: "TRY",
        };

  return {
    id,
    name,
    imageUrl,
    ratingAvg,
    ratingCount,
    price: formatMoney(price),
    oldPrice,
    priceDropPercent: dropPercent ?? null,
    storeCount,
    specs,
    offers: includeOffers ? makeOffers(id, price) : undefined,
  };
}

export const mockCategories: Category[] = [
  { id: "c1", name: "Elektronik", iconUrl: null },
  { id: "c2", name: "Kozmetik, Kişisel Bakım", iconUrl: null },
  { id: "c3", name: "Süpermarket", iconUrl: null },
  { id: "c4", name: "Ev, Ofis, Yaşam", iconUrl: null },
  { id: "c5", name: "Anne, Bebek, Oyuncak", iconUrl: null },
  { id: "c6", name: "Yapı Market, Oto, Bahçe", iconUrl: null },
  { id: "c7", name: "Hobi, Kitap, Müzik", iconUrl: null },
  { id: "c8", name: "Spor, Outdoor", iconUrl: null },
];

export function getPriceDropProducts(): Product[] {
  return [
    mockProduct({
      id: "d1",
      name: "Delonghi Kahve Makinesi",
      price: 6999,
      storeCount: 7,
      ratingAvg: 4.6,
      ratingCount: 210,
      dropPercent: 18,
      specs: { Güç: "1100W", Kapasite: "1.2L" },
    }),
    mockProduct({
      id: "d2",
      name: "Stanley Termos 1.1L",
      price: 1899,
      storeCount: 4,
      ratingAvg: 4.4,
      ratingCount: 140,
      dropPercent: 9,
      specs: { Hacim: "1.1L", Malzeme: "Çelik" },
    }),
    mockProduct({
      id: "d3",
      name: "Onvo 32\" LED TV",
      price: 5499,
      storeCount: 6,
      ratingAvg: 4.2,
      ratingCount: 98,
      dropPercent: 12,
      specs: { Ekran: "32\"", Çözünürlük: "HD" },
    }),
    mockProduct({
      id: "d4",
      name: "Familia Çamaşır Suyu 3L",
      price: 199,
      storeCount: 12,
      ratingAvg: 4.7,
      ratingCount: 420,
      dropPercent: 8,
      specs: { Hacim: "3L", Kullanım: "Her gün" },
      includeOffers: false,
    }),
    mockProduct({
      id: "d5",
      name: "Philips Airfryer 4.5L",
      price: 4599,
      storeCount: 10,
      ratingAvg: 4.5,
      ratingCount: 180,
      dropPercent: 15,
      specs: { Kapasite: "4.5L", Güç: "1500W" },
    }),
  ];
}

export function getPopularProducts(): Product[] {
  return [
    mockProduct({
      id: "p1",
      name: "Samsung Galaxy A15",
      price: 7999,
      storeCount: 8,
      ratingAvg: 4.5,
      ratingCount: 320,
      imageUrl: null,
      dropPercent: null,
      specs: { Hafıza: "128GB", Kamera: "50MP" },
    }),
    mockProduct({
      id: "p2",
      name: "Xiaomi Robot Süpürge Gen 2",
      price: 11999,
      storeCount: 5,
      ratingAvg: 4.4,
      ratingCount: 210,
      dropPercent: null,
      specs: { Emiş: "2500Pa", Navigasyon: "Lazer" },
    }),
    mockProduct({
      id: "p3",
      name: "LG 43\" Smart TV",
      price: 15999,
      storeCount: 6,
      ratingAvg: 4.3,
      ratingCount: 90,
      dropPercent: null,
      specs: { Ekran: "43\"", HDR: "Var" },
    }),
    mockProduct({
      id: "p4",
      name: "Oral-B Elektrikli Diş Fırçası",
      price: 2899,
      storeCount: 9,
      ratingAvg: 4.6,
      ratingCount: 410,
      dropPercent: null,
      specs: { Mod: "4", Sensör: "Var" },
    }),
    mockProduct({
      id: "p5",
      name: "Fissler Tencere Seti",
      price: 4999,
      storeCount: 4,
      ratingAvg: 4.6,
      ratingCount: 60,
      dropPercent: null,
      specs: { Set: "5 parça", Kapak: "Var" },
    }),
  ];
}

export function getViewedProducts(): Product[] {
  // Recent-view style: newest first.
  return [
    mockProduct({
      id: "r1",
      name: "Xiaomi Bluetooth Kulaklık",
      price: 2499,
      storeCount: 8,
      ratingAvg: 4.4,
      ratingCount: 240,
      dropPercent: null,
      specs: { Pil: "24 saat", Bluetooth: "5.3" },
    }),
    mockProduct({
      id: "r2",
      name: "Philips Tıraş Makinesi",
      price: 3299,
      storeCount: 5,
      ratingAvg: 4.2,
      ratingCount: 110,
      dropPercent: null,
      specs: { Başlık: "3 bıçak", Su: "IPX7" },
    }),
    mockProduct({
      id: "r3",
      name: "Vileda Paspas Yedek",
      price: 149,
      storeCount: 14,
      ratingAvg: 4.7,
      ratingCount: 980,
      dropPercent: null,
      specs: { Tip: "Mikrofiber", Paket: "2'li" },
    }),
    mockProduct({
      id: "r4",
      name: "Altus Çamaşır Makinesi 8kg",
      price: 10999,
      storeCount: 3,
      ratingAvg: 4.1,
      ratingCount: 55,
      dropPercent: null,
      specs: { Kapasite: "8kg", Devir: "1200" },
    }),
  ];
}

export function getProductListParams(mode: ProductListMode): { title: string; mode: ProductListMode } {
  switch (mode) {
    case "deals":
      return { title: "Fiyatı Düşenler", mode };
    case "recent":
      return { title: "Son İncelediklerin", mode };
    default:
      return { title: "Popüler Ürünler", mode };
  }
}

function seedFromString(value: string): number {
  return Array.from(value).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

export function getCategoryProducts(categoryId: string, mode: ProductListMode = "popular"): Product[] {
  const category = mockCategories.find((c) => c.id === categoryId);
  const label = category?.name ?? "Kategori";

  const seed = seedFromString(categoryId);
  const count = 10;

  const multipliers = [0.82, 0.9, 0.98, 1.03, 1.1, 1.18, 0.86, 1.06, 0.94, 1.2] as const;
  const ratingBase = 3.7 + ((seed % 30) / 100);

  return Array.from({ length: count }).map((_, idx) => {
    const productId = `${categoryId}-cat-${idx + 1}`;
    const basePrice = 250 + ((seed + idx * 17) % 18500);
    const price = Math.round(basePrice * multipliers[idx % multipliers.length]);

    const storeCount = 2 + ((seed + idx) % 20);
    const ratingAvg = Math.min(4.9, ratingBase + ((seed + idx * 13) % 100) / 250);

    const dropPercent = mode === "deals" ? Math.round(5 + ((seed + idx * 7) % 16)) : null;

    const imageUrl = mockImageUrls(productId, 1)[0];

    return mockProduct({
      id: productId,
      name: `${label} Ürünü ${idx + 1}`,
      price,
      storeCount,
      ratingAvg,
      ratingCount: 80 + ((seed + idx * 9) % 520),
      imageUrl,
      dropPercent,
      specs: {
        "Özellik": "Değer",
        "Model": `M${(seed + idx) % 99}`
      },
      includeOffers: true
    });
  });
}

export function getProductsForList({
  mode,
  categoryId
}: {
  mode: ProductListMode;
  categoryId?: string;
}): Product[] {
  if (categoryId) return getCategoryProducts(categoryId, mode);
  if (mode === "deals") return getPriceDropProducts();
  if (mode === "recent") return getViewedProducts();
  return getPopularProducts();
}

