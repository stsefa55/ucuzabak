import { OfferStatus } from "@prisma/client";

/**
 * Liste / kart “indirim” rozeti: teklifin `originalPrice` (mağazanın gösterdiği liste fiyatı) ile
 * `currentPrice` karşılaştırmasıdır. `PriceHistory` ile karıştırılmamalı — o “fiyat düşüşü” zaman serisidir.
 *
 * Eski feed’lerde `originalPrice` güncellenmeyebilir; rozeti yanıltıcı göstermemek için
 * kanıt tarihi olarak önce `lastSeenAt` (feed’de satırın son görülmesi), yoksa `updatedAt` kullanılır.
 */
export const DEFAULT_OFFER_LIST_PRICE_FRESH_DAYS = 21;

export function getOfferListPriceFreshDays(): number {
  const raw = process.env.OFFER_LIST_PRICE_FRESH_DAYS;
  const n = raw != null && raw !== "" ? Number(String(raw).trim()) : NaN;
  if (Number.isFinite(n) && n >= 1 && n <= 365) return Math.floor(n);
  return DEFAULT_OFFER_LIST_PRICE_FRESH_DAYS;
}

/**
 * Tazelik kanıtı:
 * - Feed’den gelen tekliflerde `lastSeenAt` doluysa **yalnızca** bu tarih kullanılır (admin `updatedAt` dokunuşu rozeti yanlışlıkla yenilemez).
 * - `lastSeenAt` yoksa (manuel / eski kayıt) `updatedAt` kullanılır.
 */
export function isOriginalPriceFreshForStorefrontListDiscount(
  lastSeenAt: Date | null,
  updatedAt: Date,
  now: Date = new Date()
): boolean {
  const maxAgeMs = getOfferListPriceFreshDays() * 24 * 60 * 60 * 1000;
  const cutoff = now.getTime() - maxAgeMs;
  if (lastSeenAt != null && !Number.isNaN(lastSeenAt.getTime())) {
    return lastSeenAt.getTime() >= cutoff;
  }
  return updatedAt.getTime() >= cutoff;
}

export function canShowStorefrontListDiscountBadge(params: {
  status: OfferStatus;
  currentPrice: number;
  originalPrice: number | null;
  lastSeenAt: Date | null;
  updatedAt: Date;
  now?: Date;
}): boolean {
  if (params.status !== OfferStatus.ACTIVE) return false;
  const orig = params.originalPrice;
  if (orig == null || !(orig > 0) || !(orig > params.currentPrice)) return false;
  return isOriginalPriceFreshForStorefrontListDiscount(params.lastSeenAt, params.updatedAt, params.now);
}

export function computeListDiscountPercent(currentPrice: number, originalPrice: number): number {
  if (!(originalPrice > 0) || currentPrice >= originalPrice) return 0;
  return Math.max(0, Math.round((1 - currentPrice / originalPrice) * 100));
}
