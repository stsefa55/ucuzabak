/**
 * Slug kalite denetimi: boş, geçersiz biçim, (DB unique ihlali teorik).
 *
 * Çalıştırma (repo kökü veya apps/api): DATABASE_URL yüklü olmalı.
 *   pnpm -C apps/api exec tsx scripts/catalog-audit-slugs.ts
 */
import { PrismaClient } from "@prisma/client";
import { CANONICAL_SLUG_PATTERN } from "@ucuzabak/shared";

const prisma = new PrismaClient();

async function main() {
  const empty = await prisma.product.count({ where: { slug: "" } });
  const trimmedEmpty = await prisma.$queryRaw<{ c: bigint }[]>`
    SELECT COUNT(*)::bigint AS c FROM "Product" WHERE trim(slug) = ''
  `;

  const allSlugs = await prisma.product.findMany({
    select: { id: true, slug: true },
    take: 500_000
  });

  let invalid = 0;
  const invalidSamples: { id: number; slug: string }[] = [];
  for (const row of allSlugs) {
    if (!CANONICAL_SLUG_PATTERN.test(row.slug.trim())) {
      invalid += 1;
      if (invalidSamples.length < 20) invalidSamples.push({ id: row.id, slug: row.slug });
    }
  }

  console.log(JSON.stringify({
    emptySlugCount: empty,
    trimEmptyCount: Number(trimmedEmpty[0]?.c ?? 0),
    invalidSlugShapeCount: invalid,
    invalidSlugSamples: invalidSamples,
    duplicateSlugNote: "Prisma şemasında slug @unique; çift kayıt DB seviyesinde oluşmaz."
  }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
