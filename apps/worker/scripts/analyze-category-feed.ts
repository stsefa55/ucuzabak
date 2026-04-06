/**
 * Kaynak bazlı kategori çözümlemesi analizi: override/alias/path/rollup dağılımı ve eşlenemeyen top listesi.
 * Kullanım: pnpm exec ts-node --transpile-only scripts/analyze-category-feed.ts <feed.json> [--default-source=trendyol]
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  createCategoryResolutionContext,
  resolveCategoryTextWithTrace,
  type CategoryResolutionMethod
} from "../src/categoryCanonical/resolveCategoryText";
import { loadCategoryMappingOverrides } from "../src/categoryCanonical/loadCategoryOverrides";
import { prisma } from "../src/prisma";

type FeedItem = { categoryText?: string | null; source?: string | null };

function parseArg(name: string): string | null {
  const p = `--${name}=`;
  const exact = process.argv.find((v) => v.startsWith(p));
  if (exact) return exact.slice(p.length);
  const idx = process.argv.findIndex((v) => v === `--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

function normalizeKey(s: string): string {
  return s
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");
}

async function main() {
  const defaultSource = parseArg("default-source") ?? "trendyol";
  const argPath = process.argv[2]?.startsWith("--") ? null : process.argv[2];
  if (!argPath) {
    console.error("Kullanım: pnpm exec ts-node --transpile-only scripts/analyze-category-feed.ts <feed.json> [--default-source=trendyol]");
    process.exit(1);
  }
  const filePath = path.resolve(argPath);

  const raw = await fs.readFile(filePath, "utf8");
  const items = JSON.parse(raw) as FeedItem[];

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, parentId: true }
  });
  const overrideByKey = await loadCategoryMappingOverrides(prisma);
  const categoryCtx = createCategoryResolutionContext(categories, { overrideByKey });

  const methodCounts = new Map<CategoryResolutionMethod, number>();
  const unmappableBySource = new Map<string, Map<string, { total: number; variants: Map<string, number> }>>();
  let emptyCt = 0;

  for (const item of items) {
    const ct = String(item.categoryText ?? "").trim();
    const feedSource = String(item.source ?? defaultSource)
      .toLowerCase()
      .trim();
    if (!ct) {
      emptyCt += 1;
      continue;
    }

    const res = resolveCategoryTextWithTrace(categoryCtx, ct, feedSource);
    methodCounts.set(res.method, (methodCounts.get(res.method) ?? 0) + 1);

    if (res.categoryId !== null) continue;

    let bySrc = unmappableBySource.get(feedSource);
    if (!bySrc) {
      bySrc = new Map();
      unmappableBySource.set(feedSource, bySrc);
    }
    const key = normalizeKey(ct);
    let g = bySrc.get(key);
    if (!g) {
      g = { total: 0, variants: new Map() };
      bySrc.set(key, g);
    }
    g.total += 1;
    g.variants.set(ct.trim(), (g.variants.get(ct.trim()) ?? 0) + 1);
  }

  const topUnmappableGlobal = new Map<string, number>();
  for (const [, m] of unmappableBySource) {
    for (const [k, g] of m) {
      topUnmappableGlobal.set(k, (topUnmappableGlobal.get(k) ?? 0) + g.total);
    }
  }

  const topGlobal = [...topUnmappableGlobal.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([categoryTextKey, count]) => ({ categoryTextKey, count }));

  const report = {
    file: filePath,
    totalItems: items.length,
    emptyCategoryText: emptyCt,
    overrideRowsLoaded: overrideByKey.size,
    resolutionMethodBreakdown: Object.fromEntries(methodCounts) as Record<string, number>,
    topUnmappableCategoryText: topGlobal,
    unmappableBySource: Object.fromEntries(
      [...unmappableBySource.entries()].map(([src, m]) => [
        src,
        [...m.entries()]
          .map(([key, g]) => {
            let bestText = key;
            let bestN = 0;
            for (const [text, n] of g.variants) {
              if (n > bestN) {
                bestN = n;
                bestText = text;
              }
            }
            return { key, categoryText: bestText, count: g.total };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 30)
      ])
    )
  };

  console.log(JSON.stringify(report, null, 2));
  console.error(
    `[analyze-category-feed] file=${filePath} items=${items.length} overrides=${overrideByKey.size}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
