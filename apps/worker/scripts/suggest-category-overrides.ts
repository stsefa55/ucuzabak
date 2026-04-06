/**
 * review.json içindeki adaylar için DB'de tekil kategori eşleşmesi arar.
 * Amaç: “güvenli” adayları hızlıca bulmak, belirsizleri dışarıda bırakmak.
 *
 * Kullanım:
 * pnpm exec ts-node --transpile-only scripts/suggest-category-overrides.ts
 */
import { canonicalSlugify } from "../src/categoryCanonical/canonicalSlugify";
import { normalizeCategoryPhrase, normalizeForCategoryText } from "../src/categoryCanonical/categoryNormalization";
import { prisma } from "../src/prisma";

const CANDIDATES = [
  "Panduf",
  "Cüzdan",
  "Loafer Ayakkabı",
  "Casual Ayakkabı",
  "Krampon",
  "Dolap ve Gardırop",
  "Kartlık",
  "Gümüş Kolye",
  "Diğer Baharat",
  "Oto Paspas",
  "Playstation 5",
  "SH Kaydı Gerektirmeyen Drone"
];

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

function score(rawText: string, catName: string, catSlug: string): number {
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

async function main() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true }
  });

  for (const text of CANDIDATES) {
    const normalizedKey = normalizeCategoryPhrase(text);
    const scored = categories
      .map((c) => ({ ...c, s: score(text, c.name, c.slug) }))
      .filter((x) => x.s >= 0.6)
      .sort((a, b) => b.s - a.s);

    console.log("----");
    console.log({ text, normalizedKey, hits: scored.length });
    for (const r of scored.slice(0, 8)) {
      console.log(`  ${r.id} | ${r.slug} | ${r.name} | score=${r.s}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

