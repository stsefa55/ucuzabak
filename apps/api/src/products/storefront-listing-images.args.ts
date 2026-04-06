import type { Prisma } from "@prisma/client";

/** Liste / arama / ray kartlarında galeri için sınırlı sayıda ek görsel (performans) */
export const STOREFRONT_LISTING_PRODUCT_IMAGES: Prisma.Product$productImagesArgs = {
  orderBy: { position: "asc" },
  take: 8,
  select: { imageUrl: true, position: true }
};
