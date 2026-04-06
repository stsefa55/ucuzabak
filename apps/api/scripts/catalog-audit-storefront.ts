/**
 * Storefront güvenliği: ACTIVE ama slug’sız veya mağaza önünde görünmemesi gereken riskler.
 *
 *   pnpm -C apps/api exec tsx scripts/catalog-audit-storefront.ts
 */
import { PrismaClient, ProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const activeEmptySlug = await prisma.product.count({
    where: { status: ProductStatus.ACTIVE, slug: "" }
  });

  /** API list/detail ile aynı mantık: ACTIVE + slug dolu dışında kalan ACTIVE kayıtlar teorik olarak “sızıntı” adayı */
  const activeButUnlisted = await prisma.product.count({
    where: {
      status: ProductStatus.ACTIVE,
      OR: [{ slug: "" }, { slug: { startsWith: " " } }]
    }
  });

  const inactiveWithOffers = await prisma.product.count({
    where: {
      status: ProductStatus.INACTIVE,
      offers: { some: {} }
    }
  });

  console.log(JSON.stringify({
    activeWithEmptySlug: activeEmptySlug,
    activeSuspiciousSlug: activeButUnlisted,
    inactiveButHasOffers: inactiveWithOffers,
    note: "Storefront sorguları STOREFRONT_PRODUCT_WHERE (ACTIVE + slug not empty) ile hizalanmalı."
  }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
