import type { LucideIcon } from "lucide-react";
import {
  Baby,
  BookOpen,
  Car,
  Circle,
  CookingPot,
  Footprints,
  Gamepad2,
  Gem,
  Mountain,
  PawPrint,
  PenLine,
  Refrigerator,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  Stethoscope,
  Trees
} from "lucide-react";

/**
 * Kök kategori slug → benzersiz Lucide ikonu (yalnızca root satırlarında kullanılır).
 * Alt kategorilerde ikon gösterilmez; bu harita yine de admin / geriye dönük anahtarlarla uyumludur.
 */
export const ROOT_SLUG_TO_COMPONENT: Record<string, LucideIcon> = {
  elektronik: Smartphone,
  "beyaz-esya": Refrigerator,
  "ev-yasam": CookingPot,
  mobilya: Sofa,
  "kisisel-bakim": Sparkles,
  "anne-bebek": Baby,
  moda: Shirt,
  "ayakkabi-canta": Footprints,
  "spor-outdoor": Mountain,
  otomotiv: Car,
  "ofis-kirtasiye": PenLine,
  "pet-shop": PawPrint,
  supermarket: ShoppingBasket,
  "yapi-market-bahce": Trees,
  "oyun-hobi": Gamepad2,
  "kitap-muzik-film": BookOpen,
  saglik: Stethoscope,
  "taki-aksesuar": Gem
};

/**
 * Admin / API `iconName` (tohumdaki iconByGroup değerleri + genişletilmiş anahtarlar).
 * Not: Arayüzde kök ikonları için `getRootCategoryIconComponent(slug)` kullanılmalıdır.
 */
const ICON_NAME_TO_COMPONENT: Record<string, LucideIcon> = {
  electronics: Smartphone,
  whitegoods: Refrigerator,
  home: CookingPot,
  furniture: Sofa,
  "personal-care": Sparkles,
  baby: Baby,
  fashion: Shirt,
  "shoes-bags": Footprints,
  sports: Mountain,
  automotive: Car,
  office: PenLine,
  pet: PawPrint,
  grocery: ShoppingBasket,
  "diy-garden": Trees,
  "games-hobby": Gamepad2,
  "media-books": BookOpen,
  health: Stethoscope,
  jewelry: Gem
};

/** Admin form select — `iconName` string anahtarları */
export const CATEGORY_ICON_NAME_OPTIONS = Object.keys(ICON_NAME_TO_COMPONENT) as string[];

/**
 * Kök kategori satırı için: slug ile benzersiz ikon (öncelik).
 */
export function getRootCategoryIconComponent(slug: string): LucideIcon {
  return ROOT_SLUG_TO_COMPONENT[slug] ?? Circle;
}

/**
 * Admin veya `iconName` ile bileşen (alt kategori satırlarında kullanmayın — yalnızca kök / admin).
 */
export function getCategoryIconComponent(iconName?: string | null) {
  if (!iconName) return Circle;
  return ICON_NAME_TO_COMPONENT[iconName] ?? Circle;
}
