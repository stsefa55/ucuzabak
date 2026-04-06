/**
 * Faz 2.1: Top unmappable categoryText değerlerinden başlangıç override seti üretir.
 *
 * Çıktılar:
 * - JSON rapor (safe/risky/unresolved + aday kategori listesi)
 * - SQL bootstrap dosyası (yalnızca safe adaylar)
 *
 * Kullanım:
 * pnpm exec ts-node --transpile-only scripts/bootstrap-category-overrides-from-feed.ts <feed.json> --source=trendyol
 * pnpm exec ts-node --transpile-only scripts/bootstrap-category-overrides-from-feed.ts <feed.json> --source=trendyol --apply
 */
import fs from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { canonicalSlugify } from "../src/categoryCanonical/canonicalSlugify";
import { normalizeCategoryPhrase, normalizeForCategoryText } from "../src/categoryCanonical/categoryNormalization";
import { buildCategoryOverrideKey } from "../src/categoryCanonical/overrideKeys";
import { loadCategoryMappingOverrides } from "../src/categoryCanonical/loadCategoryOverrides";
import { createCategoryResolutionContext, resolveCategoryTextWithTrace } from "../src/categoryCanonical/resolveCategoryText";
import { prisma } from "../src/prisma";

type FeedItem = { categoryText?: string | null; source?: string | null };

type GroupRow = {
  key: string;
  categoryText: string;
  count: number;
};

type ScoredCandidate = {
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  score: number;
};

type CandidateReport = GroupRow & {
  normalizedKey: string;
  topCandidates: ScoredCandidate[];
  selectedCategoryId: number | null;
  selectedCategorySlug: string | null;
  selectedCategoryName: string | null;
  confidence: number;
  reason: string;
};

function parseArg(name: string): string | null {
  const p = `--${name}=`;
  const exact = process.argv.find((v) => v.startsWith(p));
  if (exact) return exact.slice(p.length);
  const idx = process.argv.findIndex((v) => v === `--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function normalizeKey(s: string): string {
  return s
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");
}

function bestVariant(variants: Map<string, number>, fallback: string): string {
  let bestText = fallback;
  let bestN = 0;
  for (const [text, n] of variants) {
    if (n > bestN) {
      bestN = n;
      bestText = text;
    }
  }
  return bestText;
}

function tokenSet(s: string): Set<string> {
  return new Set(
    s
      .split(/\s+/g)
      .map((x) => x.trim())
      .filter((x) => x.length >= 2)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const uni = a.size + b.size - inter;
  if (uni === 0) return 0;
  return inter / uni;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function scoreCategoryMatch(rawText: string, catName: string, catSlug: string): number {
  const nRaw = normalizeForCategoryText(rawText);
  const nCat = normalizeForCategoryText(catName);
  if (!nRaw || !nCat) return 0;

  if (nRaw === nCat) return 1;

  const rawSlug = canonicalSlugify(rawText);
  if (rawSlug && (rawSlug === catSlug || catSlug.endsWith(`-${rawSlug}`))) {
    return 0.96;
  }

  let s = 0;
  if (nCat.startsWith(`${nRaw} `) || nRaw.startsWith(`${nCat} `)) s = Math.max(s, 0.9);
  if (nCat.includes(nRaw) || nRaw.includes(nCat)) s = Math.max(s, 0.85);

  const jac = jaccard(tokenSet(nRaw), tokenSet(nCat));
  s = Math.max(s, jac * 0.92);

  return clamp(s, 0, 1);
}

function classifyCandidate(row: GroupRow, top: ScoredCandidate[]): CandidateReport {
  const normalizedKey = normalizeCategoryPhrase(row.categoryText);
  if (top.length === 0 || top[0]!.score < 0.72) {
    return {
      ...row,
      normalizedKey,
      topCandidates: top.slice(0, 5),
      selectedCategoryId: null,
      selectedCategorySlug: null,
      selectedCategoryName: null,
      confidence: 0,
      reason: "no_reliable_candidate"
    };
  }

  const first = top[0]!;
  const second = top[1];
  const gap = second ? first.score - second.score : first.score;
  const safe = first.score >= 0.9 && gap >= 0.12;

  return {
    ...row,
    normalizedKey,
    topCandidates: top.slice(0, 5),
    selectedCategoryId: first.categoryId,
    selectedCategorySlug: first.categorySlug,
    selectedCategoryName: first.categoryName,
    confidence: Number(clamp(first.score, 0.75, 1).toFixed(2)),
    reason: safe ? "safe_auto" : "needs_review"
  };
}

function sqlValue(s: string): string {
  return s.replace(/'/g, "''");
}

async function main() {
  const argPath = process.argv[2]?.startsWith("--") ? null : process.argv[2];
  if (!argPath) {
    console.error(
      "Kullanım: pnpm exec ts-node --transpile-only scripts/bootstrap-category-overrides-from-feed.ts <feed.json> --source=trendyol [--min-count=100] [--top=150] [--apply]"
    );
    process.exit(1);
  }

  const source = (parseArg("source") ?? "trendyol").toLowerCase().trim();
  const minCount = Number(parseArg("min-count") ?? "100");
  const topN = Number(parseArg("top") ?? "150");
  const apply = hasFlag("apply");
  const filePath = path.resolve(argPath);

  const raw = await fs.readFile(filePath, "utf8");
  const items = JSON.parse(raw) as FeedItem[];

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, parentId: true }
  });

  const overrideByKey = await loadCategoryMappingOverrides(prisma);
  const categoryCtx = createCategoryResolutionContext(categories, { overrideByKey });

  const groups = new Map<string, { total: number; variants: Map<string, number> }>();
  for (const item of items) {
    const categoryText = String(item.categoryText ?? "").trim();
    if (!categoryText) continue;
    const feedSource = String(item.source ?? source).toLowerCase().trim();
    const res = resolveCategoryTextWithTrace(categoryCtx, categoryText, feedSource);
    if (res.categoryId !== null) continue;

    const k = normalizeKey(categoryText);
    let g = groups.get(k);
    if (!g) {
      g = { total: 0, variants: new Map() };
      groups.set(k, g);
    }
    g.total += 1;
    g.variants.set(categoryText, (g.variants.get(categoryText) ?? 0) + 1);
  }

  const topRows: GroupRow[] = [...groups.entries()]
    .map(([key, g]) => ({
      key,
      categoryText: bestVariant(g.variants, key),
      count: g.total
    }))
    .filter((r) => r.count >= minCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  const scoredReports: CandidateReport[] = topRows.map((row) => {
    const scored = categories
      .map((c) => ({
        categoryId: c.id,
        categoryName: c.name,
        categorySlug: c.slug,
        score: scoreCategoryMatch(row.categoryText, c.name, c.slug)
      }))
      .filter((x) => x.score >= 0.6)
      .sort((a, b) => b.score - a.score);
    return classifyCandidate(row, scored);
  });

  const safe = scoredReports.filter((r) => r.reason === "safe_auto" && r.selectedCategoryId !== null);
  const risky = scoredReports.filter((r) => r.reason === "needs_review");
  const unresolved = scoredReports.filter((r) => r.reason === "no_reliable_candidate");

  const now = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(process.cwd(), "scripts", "output");
  await fs.mkdir(outDir, { recursive: true });
  const base = `trendyol-category-override-bootstrap.${now}`;
  const reportPath = path.join(outDir, `${base}.report.json`);
  const sqlPath = path.join(outDir, `${base}.safe.sql`);

  const sqlLines: string[] = [];
  sqlLines.push("-- Auto-generated bootstrap overrides (safe candidates only)");
  sqlLines.push("-- Source: trendyol");
  sqlLines.push("BEGIN;");
  for (const row of safe) {
    const normalizedKey = sqlValue(row.normalizedKey);
    const categoryText = sqlValue(row.categoryText);
    const sourceOverrideKey = buildCategoryOverrideKey(source, "full", row.normalizedKey);
    const categoryId = row.selectedCategoryId!;
    const confidence = row.confidence.toFixed(2);
    sqlLines.push(`-- ${categoryText} -> ${row.selectedCategorySlug} (${row.count} rows)`);
    sqlLines.push(
      `-- overrideKey: ${sqlValue(sourceOverrideKey)}`
    );
    sqlLines.push(
      `INSERT INTO "CategoryMappingOverride" ("source","matchScope","normalizedKey","categoryId","confidence","isManual","rawSourceText","createdAt","updatedAt") VALUES ('${sqlValue(
        source
      )}','FULL','${normalizedKey}',${categoryId},${confidence},true,'${categoryText}',NOW(),NOW()) ON CONFLICT ("source","matchScope","normalizedKey") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","confidence"=EXCLUDED."confidence","isManual"=EXCLUDED."isManual","rawSourceText"=EXCLUDED."rawSourceText","updatedAt"=NOW();`
    );
  }
  sqlLines.push("COMMIT;");

  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        source,
        file: filePath,
        totalItems: items.length,
        unmappableUnique: groups.size,
        consideredMinCount: minCount,
        consideredTop: topN,
        safeCount: safe.length,
        riskyCount: risky.length,
        unresolvedCount: unresolved.length,
        safe,
        risky,
        unresolved
      },
      null,
      2
    ),
    "utf8"
  );
  await fs.writeFile(sqlPath, sqlLines.join("\n"), "utf8");

  if (apply && safe.length > 0) {
    await prisma.$transaction(
      safe.map((row) =>
        prisma.categoryMappingOverride.upsert({
          where: {
            source_matchScope_normalizedKey: {
              source,
              matchScope: "FULL",
              normalizedKey: row.normalizedKey
            }
          },
          create: {
            source,
            matchScope: "FULL",
            normalizedKey: row.normalizedKey,
            categoryId: row.selectedCategoryId!,
            confidence: row.confidence,
            isManual: true,
            rawSourceText: row.categoryText
          },
          update: {
            categoryId: row.selectedCategoryId!,
            confidence: row.confidence,
            isManual: true,
            rawSourceText: row.categoryText
          }
        })
      )
    );
  }

  console.log(
    JSON.stringify(
      {
        reportPath,
        sqlPath,
        safeCount: safe.length,
        riskyCount: risky.length,
        unresolvedCount: unresolved.length,
        applied: apply ? safe.length : 0
      },
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
