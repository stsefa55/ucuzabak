/**
 * Trendyol FULL override kayıtlarını listeler (normalizedKey + hedef category).
 * Kullanım: pnpm -C apps/worker exec ts-node --transpile-only scripts/list-trendyol-category-overrides.ts
 */
import { prisma } from "../src/prisma";

async function main() {
  const rows = await prisma.categoryMappingOverride.findMany({
    where: { source: "trendyol", matchScope: "FULL" },
    orderBy: { normalizedKey: "asc" },
    select: {
      normalizedKey: true,
      rawSourceText: true,
      confidence: true,
      category: { select: { id: true, slug: true, name: true } }
    }
  });
  console.log(
    JSON.stringify(
      rows.map((r) => ({
        normalizedKey: r.normalizedKey,
        rawSourceText: r.rawSourceText,
        confidence: r.confidence,
        categoryId: r.category.id,
        categorySlug: r.category.slug,
        categoryName: r.category.name
      })),
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

