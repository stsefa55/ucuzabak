/// <reference path="../types/string-similarity.d.ts" />
import type { PrismaClient, Product } from "@prisma/client";
import {
  normalizeEanDigits,
  normalizeModelNumberForMatch,
  normalizeProductTitleForMatching
} from "@ucuzabak/shared";
import { compareTwoStrings } from "string-similarity";

export type ProductMatchReason =
  | "ean_exact"
  | "brand_model_exact"
  | "title_exact"
  | "title_single_candidate"
  | "title_similarity"
  | "spec_overlap"
  | "no_match"
  /** Yalnızca import tarafında yeni canonical ürün yaratıldığında raporlanır */
  | "created_new";

export type ProductMatchResult = {
  product: Product | null;
  reason: ProductMatchReason;
  /** 0–100; düşük güvende otomatik birleştirme yapılmaz */
  confidence: number;
  details: Record<string, unknown>;
};

function shallowSpecOverlap(
  feedSpecs: Record<string, unknown> | null | undefined,
  productSpecs: unknown
): number {
  if (!feedSpecs || !productSpecs || typeof productSpecs !== "object" || Array.isArray(productSpecs)) {
    return 0;
  }
  const p = productSpecs as Record<string, unknown>;
  let n = 0;
  for (const [k, v] of Object.entries(feedSpecs)) {
    if (p[k] === undefined) continue;
    const a = String(v ?? "").toLocaleLowerCase("tr-TR").trim();
    const b = String(p[k] ?? "").toLocaleLowerCase("tr-TR").trim();
    if (a.length > 0 && a === b) n += 1;
  }
  return n;
}

export type TitlePrefixCache = Map<string, Product[]>;

/**
 * Canonical Product eşlemesi — sıra: EAN → marka+model → başlık (tek aday) → sınırlı spec örtüşmesi.
 * Çoklu bulanık adayda kasıtlı olarak eşleşmez (yanlış pozitif riski).
 */
export async function matchCanonicalProduct(
  prisma: PrismaClient,
  input: {
    brandId: number | null;
    ean: string | null;
    mpn: string | null;
    title: string;
    specsJson?: Record<string, unknown> | null;
    categoryId?: number | null;
  },
  titlePrefixQueryCache: TitlePrefixCache
): Promise<ProductMatchResult> {
  const { brandId, mpn, title, specsJson } = input;
  const eanDigits = normalizeEanDigits(input.ean);

  if (eanDigits) {
    const rawTrim = input.ean?.trim();
    const orClause: Array<{ ean: string }> = [{ ean: eanDigits }];
    if (rawTrim && rawTrim !== eanDigits) orClause.push({ ean: rawTrim });
    const byEan = await prisma.product.findFirst({
      where: { OR: orClause }
    });
    if (byEan?.ean) {
      const dbDigits = normalizeEanDigits(byEan.ean);
      if (dbDigits === eanDigits) {
        return {
          product: byEan,
          reason: "ean_exact",
          confidence: 98,
          details: { ean: eanDigits }
        };
      }
    }
  }

  if (brandId && mpn) {
    const byModel = await prisma.product.findFirst({
      where: {
        brandId,
        modelNumber: { equals: mpn, mode: "insensitive" }
      }
    });
    if (byModel) {
      return {
        product: byModel,
        reason: "brand_model_exact",
        confidence: 94,
        details: { brandId, mpn }
      };
    }
    const normMpn = normalizeModelNumberForMatch(mpn);
    if (normMpn.length >= 4) {
      const rows = await prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM "Product"
        WHERE "brandId" = ${brandId}
          AND LENGTH(regexp_replace(lower(COALESCE("modelNumber", '')), '[^a-z0-9]', '', 'g')) >= 4
          AND regexp_replace(lower(COALESCE("modelNumber", '')), '[^a-z0-9]', '', 'g') = ${normMpn}
        LIMIT 5
      `;
      const firstId = rows[0]?.id;
      if (firstId != null) {
        const byNorm = await prisma.product.findUnique({ where: { id: firstId } });
        if (byNorm) {
          return {
            product: byNorm,
            reason: "brand_model_exact",
            confidence: 93,
            details: { brandId, mpnNormalized: normMpn }
          };
        }
      }
    }
  }

  if (brandId) {
    const normTitle = normalizeProductTitleForMatching(title);
    const titlePrefix = title.split(/\s+/).slice(0, 4).join(" ");
    const cacheKey = `${brandId}|${titlePrefix}`;
    let candidates = titlePrefixQueryCache.get(cacheKey);
    if (!candidates) {
      candidates = await prisma.product.findMany({
        where: {
          brandId,
          name: { contains: titlePrefix, mode: "insensitive" }
        },
        take: 40
      });
      titlePrefixQueryCache.set(cacheKey, candidates);
    }

    const exact = candidates.find((p) => normalizeProductTitleForMatching(p.name) === normTitle);
    if (exact) {
      return {
        product: exact,
        reason: "title_exact",
        confidence: 90,
        details: { brandId, titleNorm: normTitle }
      };
    }

    const fuzzy = candidates.filter((p) => {
      const pn = normalizeProductTitleForMatching(p.name);
      return pn.includes(normTitle) || normTitle.includes(pn);
    });
    if (fuzzy.length === 1) {
      return {
        product: fuzzy[0]!,
        reason: "title_single_candidate",
        confidence: 72,
        details: { brandId, candidateCount: 1 }
      };
    }
    if (fuzzy.length > 1) {
      return {
        product: null,
        reason: "no_match",
        confidence: 0,
        details: { brandId, ambiguousTitleCandidates: fuzzy.length }
      };
    }

    // Normalized title similarity (spacing/typo kaynaklı duplicate'ları azaltmak için).
    // Not: Yanlış pozitif riskini azaltmak için "tek net aday" kuralı.
    const simCandidates = await prisma.product.findMany({
      where: {
        brandId,
        ...(input.categoryId ? { categoryId: input.categoryId } : {})
      },
      take: 80
    });
    const sims = simCandidates
      .map((p) => ({
        p,
        sim: compareTwoStrings(normTitle, normalizeProductTitleForMatching(p.name))
      }))
      .sort((a, b) => b.sim - a.sim);

    const best = sims[0];
    const second = sims[1];
    // Eşikler: yüksek benzerlik + ikinciden belirgin fark.
    if (best && best.sim >= 0.92 && (!second || best.sim - second.sim >= 0.03)) {
      return {
        product: best.p,
        reason: "title_similarity",
        confidence: 78,
        details: {
          brandId,
          similarity: Number(best.sim.toFixed(4)),
          secondBest: second ? Number(second.sim.toFixed(4)) : null,
          candidateCount: simCandidates.length
        }
      };
    }
    // Çoklu yüksek aday: kasıtlı olarak eşleşme yok (review'a düşsün)
    if (best && best.sim >= 0.92 && second && second.sim >= 0.92) {
      return {
        product: null,
        reason: "no_match",
        confidence: 0,
        details: {
          brandId,
          ambiguousTitleSimilarity: true,
          best: Number(best.sim.toFixed(4)),
          secondBest: Number(second.sim.toFixed(4))
        }
      };
    }

    if (specsJson && Object.keys(specsJson).length > 0) {
      const specCandidates = await prisma.product.findMany({
        where: {
          brandId,
          ...(input.categoryId ? { categoryId: input.categoryId } : {})
        },
        take: 80
      });
      const scored = specCandidates
        .map((p) => ({
          p,
          score: shallowSpecOverlap(specsJson, p.specsJson)
        }))
        .filter((x) => x.score >= 2)
        .sort((a, b) => b.score - a.score);

      if (scored.length === 1 && scored[0]!.score >= 2) {
        return {
          product: scored[0]!.p,
          reason: "spec_overlap",
          confidence: 65,
          details: { overlapKeys: scored[0]!.score }
        };
      }
    }
  }

  return {
    product: null,
    reason: "no_match",
    confidence: 0,
    details: { brandId: brandId ?? null }
  };
}
