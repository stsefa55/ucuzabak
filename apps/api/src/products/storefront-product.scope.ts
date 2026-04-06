import { Prisma } from "@prisma/client";
import { ProductStatus } from "@prisma/client";

/**
 * Mağaza önü (storefront) — yalnızca canonical Product: ACTIVE ve slug dolu.
 * StoreProduct / ham teklif satırları bu katmanda dönmez.
 */
export const STOREFRONT_PRODUCT_WHERE: Prisma.ProductWhereInput = {
  status: ProductStatus.ACTIVE,
  slug: { not: "" }
};

export function storefrontProductWhere(extra?: Prisma.ProductWhereInput): Prisma.ProductWhereInput {
  if (!extra || Object.keys(extra).length === 0) {
    return { ...STOREFRONT_PRODUCT_WHERE };
  }
  return { AND: [STOREFRONT_PRODUCT_WHERE, extra] };
}
