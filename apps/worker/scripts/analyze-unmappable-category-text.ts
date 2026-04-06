/**
 * Tek seferlik analiz: feed içindeki categoryText değerlerinden eşlenemeyenleri sayar (override dahil).
 * Kullanım: pnpm exec ts-node --transpile-only scripts/analyze-unmappable-category-text.ts [json-yolu] [--default-source=trendyol]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createCategoryResolutionContext, resolveCategoryTextWithTrace } from "../src/categoryCanonical/resolveCategoryText";
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
  const defaultFeed = path.join(
    __dirname,
    "../imports/processed/trendyol_2026-03-20_13-53-46.2026-03-20T12-06-46-558Z.json"
  );
  const filePath = argPath ? path.resolve(argPath) : defaultFeed;

  const raw = await fs.readFile(filePath, "utf8");
  const items = JSON.parse(raw) as FeedItem[];

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, parentId: true }
  });

  const overrideByKey = await loadCategoryMappingOverrides(prisma);
  const categoryCtx = createCategoryResolutionContext(categories, { overrideByKey });

  const groups = new Map<string, { total: number; variants: Map<string, number> }>();
  let emptyCt = 0;
  let mappableRows = 0;

  for (const item of items) {
    const ct = String(item.categoryText ?? "").trim();
    if (!ct) {
      emptyCt += 1;
      continue;
    }

    const feedSource = String(item.source ?? defaultSource)
      .toLowerCase()
      .trim();
    const id = resolveCategoryTextWithTrace(categoryCtx, ct, feedSource).categoryId;
    if (id !== null) {
      mappableRows += 1;
      continue;
    }

    const key = normalizeKey(ct);
    let g = groups.get(key);
    if (!g) {
      g = { total: 0, variants: new Map() };
      groups.set(key, g);
    }
    g.total += 1;
    const trimmed = ct.trim();
    g.variants.set(trimmed, (g.variants.get(trimmed) ?? 0) + 1);
  }

  const sorted = [...groups.entries()]
    .map(([key, g]) => {
      let bestText = key;
      let bestN = 0;
      for (const [text, n] of g.variants) {
        if (n > bestN) {
          bestN = n;
          bestText = text;
        }
      }
      return {
        key,
        categoryText: bestText,
        count: g.total
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 100);

  const out = sorted.map(({ categoryText, count }) => ({ categoryText, count }));
  const unmappableRows = [...groups.values()].reduce((s, g) => s + g.total, 0);

  console.log(JSON.stringify(out, null, 2));
  console.error(
    `[analyze-unmappable] file=${filePath} totalItems=${items.length} emptyCategoryText=${emptyCt} mappable=${mappableRows} unmappableRows=${unmappableRows} unmappableUnique=${groups.size} overridesLoaded=${overrideByKey.size} defaultSource=${defaultSource}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
