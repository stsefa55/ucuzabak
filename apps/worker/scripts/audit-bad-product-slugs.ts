import { prisma } from "../src/prisma";
import { normalizeProductTitle, slugifyCanonical } from "@ucuzabak/shared";

function normalizeSpacingForDisplay(input: string): string {
  return String(input ?? "")
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSuspiciousTitle(title: string): boolean {
  const raw = String(title ?? "");
  // NBSP/zero-width vb.
  if (/[\u00A0\u200B\u200C\u200D]/.test(raw)) return true;
  // Çoklu boşluk (görsel çirkinlik)
  if (/\s{2,}/.test(raw)) return true;
  // Çok kısa/çok uzun ekstrem başlıklar
  const t = normalizeSpacingForDisplay(raw);
  if (t.length < 8) return true;
  if (t.length > 180) return true;
  return false;
}

function isSuspiciousSlug(slug: string): boolean {
  const s = String(slug ?? "").trim();
  if (!s) return true;
  if (s.length > 120) return true;
  if (s.includes("--")) return true;
  if (s.startsWith("-") || s.endsWith("-")) return true;
  return false;
}

async function main() {
  const take = Number(process.env.AUDIT_TAKE || 20000);
  const rows = await prisma.product.findMany({
    take,
    orderBy: { id: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      brand: { select: { name: true } }
    }
  });

  let badTitle = 0;
  let badSlug = 0;
  const samples: Array<{
    id: number;
    brand: string;
    name: string;
    slug: string;
    suggestedSlug: string;
    titleSuspicious: boolean;
    slugSuspicious: boolean;
  }> = [];

  for (const p of rows) {
    const brand = p.brand?.name ?? "markasiz";
    const titleSuspicious = isSuspiciousTitle(p.name);
    const slugSuspicious = isSuspiciousSlug(p.slug);
    if (titleSuspicious) badTitle += 1;
    if (slugSuspicious) badSlug += 1;

    if (titleSuspicious || slugSuspicious) {
      const seed = `${brand}-${normalizeProductTitle(normalizeSpacingForDisplay(p.name))}`;
      const suggestedSlug = slugifyCanonical(seed);
      if (samples.length < 40) {
        samples.push({
          id: p.id,
          brand,
          name: p.name,
          slug: p.slug,
          suggestedSlug,
          titleSuspicious,
          slugSuspicious
        });
      }
    }
  }

  console.log("[audit-bad-product-slugs] scanned:", rows.length);
  console.log("[audit-bad-product-slugs] suspiciousTitle:", badTitle);
  console.log("[audit-bad-product-slugs] suspiciousSlug:", badSlug);
  console.log("[audit-bad-product-slugs] samples:");
  for (const s of samples) {
    console.log(
      `- #${s.id} brand=${s.brand} titleBad=${s.titleSuspicious} slugBad=${s.slugSuspicious}\n` +
        `  name="${s.name}"\n` +
        `  slug="${s.slug}"\n` +
        `  suggested="${s.suggestedSlug}"`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

