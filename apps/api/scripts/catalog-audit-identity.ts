/**
 * Ürün kimliği tutarlılığı — Faz 1 iskeleti (genişletilebilir).
 *
 *   pnpm -C apps/api exec tsx scripts/catalog-audit-identity.ts
 */
import { MatchStatus, PrismaClient, ProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [activeNoCategory, activeNoBrand, activeNoOffers, storeProductsUnmatched] = await Promise.all([
    prisma.product.count({
      where: { status: ProductStatus.ACTIVE, categoryId: null }
    }),
    prisma.product.count({
      where: { status: ProductStatus.ACTIVE, brandId: null }
    }),
    prisma.product.count({
      where: {
        status: ProductStatus.ACTIVE,
        offerCountCache: 0,
        slug: { not: "" }
      }
    }),
    prisma.storeProduct.count({
      where: { productId: null, matchStatus: MatchStatus.UNMATCHED }
    })
  ]);

  console.log(JSON.stringify({
    activeWithoutCategory: activeNoCategory,
    activeWithoutBrand: activeNoBrand,
    activeWithZeroOfferCountCache: activeNoOffers,
    unmatchedStoreProducts: storeProductsUnmatched,
    nextSteps: [
      "offerCountCache ile gerçek Offer sayısı karşılaştırması (ileri faz)",
      "Çoklu mağaza eşlemesi sonrası duplicate Product birleştirme kuralları"
    ]
  }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
