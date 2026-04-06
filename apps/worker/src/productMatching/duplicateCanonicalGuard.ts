/// <reference path="../types/string-similarity.d.ts" />
import type { PrismaClient } from "@prisma/client";
import { normalizeEanDigits, normalizeModelNumberForMatch, normalizeProductTitleForMatching } from "@ucuzabak/shared";
import { compareTwoStrings } from "string-similarity";
import { categoryMatchSignal } from "./categoryMatchSignals";

export type DuplicateCanonicalDecision =
  | {
      action: "use_existing";
      productId: number;
      reasons: string[];
    }
  | {
      action: "create_new";
      nearDuplicate?: { productId: number; similarity: number; hintTr: string };
    };

/**
 * Yeni canonical Product yaratmadan önce: aynı gerçek ürün için mevcut kayıt var mı?
 */
export async function resolveDuplicateBeforeCreate(
  prisma: PrismaClient,
  args: {
    ean: string | null;
    modelNumber: string | null;
    brandId: number | null;
    categoryId: number | null;
    title: string;
  },
  categoryParentById: Map<number, number | null>
): Promise<DuplicateCanonicalDecision> {
  const eanDigits = normalizeEanDigits(args.ean);
  const rawEan = args.ean?.trim() || null;

  if (eanDigits) {
    const byEan = await prisma.product.findFirst({
      where: {
        OR: [{ ean: eanDigits }, ...(rawEan && rawEan !== eanDigits ? [{ ean: rawEan }] : [])]
      }
    });
    if (byEan && normalizeEanDigits(byEan.ean) === eanDigits) {
      return { action: "use_existing", productId: byEan.id, reasons: ["ean_digits_match_existing"] };
    }
  }

  const normModel = normalizeModelNumberForMatch(args.modelNumber);
  if (args.brandId != null && normModel.length >= 4) {
    const rows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM "Product"
      WHERE "brandId" = ${args.brandId}
        AND LENGTH(regexp_replace(lower(COALESCE("modelNumber", '')), '[^a-z0-9]', '', 'g')) >= 4
        AND regexp_replace(lower(COALESCE("modelNumber", '')), '[^a-z0-9]', '', 'g') = ${normModel}
      LIMIT 3
    `;
    const first = rows[0]?.id;
    if (first != null) {
      return {
        action: "use_existing",
        productId: first,
        reasons: ["brand_id_plus_normalized_model_match"]
      };
    }
  }

  if (args.brandId != null) {
    const normTitle = normalizeProductTitleForMatching(args.title);
    const candidates = await prisma.product.findMany({
      where: { brandId: args.brandId },
      orderBy: { id: "desc" },
      take: 80,
      select: { id: true, name: true, categoryId: true }
    });
    let best: { id: number; sim: number; categoryId: number | null } | null = null;
    for (const p of candidates) {
      const sim = compareTwoStrings(normTitle, normalizeProductTitleForMatching(p.name));
      if (sim >= 0.88 && (!best || sim > best.sim)) {
        best = { id: p.id, sim, categoryId: p.categoryId };
      }
    }
    if (best && best.sim >= 0.94 && args.categoryId != null && best.categoryId === args.categoryId) {
      return {
        action: "use_existing",
        productId: best.id,
        reasons: ["high_title_similarity_same_brand_same_category"]
      };
    }
    if (best && best.sim >= 0.92 && best.sim < 0.94) {
      const cat = categoryMatchSignal(args.categoryId, best.categoryId, categoryParentById);
      if (cat.points >= 11) {
        return {
          action: "use_existing",
          productId: best.id,
          reasons: ["title_similarity_same_brand_strong_category_match"]
        };
      }
    }
    if (best && best.sim >= 0.86 && best.sim < 0.94) {
      return {
        action: "create_new",
        nearDuplicate: {
          productId: best.id,
          similarity: Number(best.sim.toFixed(4)),
          hintTr: "Benzer başlık + aynı marka — admin birleştirme adayı olabilir."
        }
      };
    }
  }

  return { action: "create_new" };
}
