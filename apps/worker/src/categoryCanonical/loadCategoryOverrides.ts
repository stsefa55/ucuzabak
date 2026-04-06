import type { PrismaClient } from "@prisma/client";
import { buildCategoryOverrideKey } from "./overrideKeys";

/** DB satırlarını `lookupOverride` ile uyumlu tek Map'e dönüştürür. */
export async function loadCategoryMappingOverrides(prisma: PrismaClient): Promise<Map<string, number>> {
  const rows = await prisma.categoryMappingOverride.findMany({
    select: {
      source: true,
      matchScope: true,
      normalizedKey: true,
      categoryId: true
    }
  });
  const m = new Map<string, number>();
  for (const r of rows) {
    const scope = r.matchScope === "FULL" ? "full" : "last";
    const key = buildCategoryOverrideKey(r.source, scope, r.normalizedKey);
    m.set(key, r.categoryId);
  }
  return m;
}
