/**
 * StoreProduct.matchDetailsJson (v2) üzerinden eşleşme nedeni dağılımı ve düşük güvenli kayıtlar.
 * Kullanım: pnpm exec ts-node --transpile-only scripts/audit-product-matching.ts
 */
import { prisma } from "../src/prisma";

type ReasonRow = { reason: string | null; n: bigint };
type SuspiciousRow = {
  id: number;
  matchScore: number;
  reason: string | null;
  confidence: number | null;
  storeId: number;
};

async function main() {
  const byReason = await prisma.$queryRaw<ReasonRow[]>`
    SELECT
      ("matchDetailsJson"->'productMatch'->>'reason') AS reason,
      COUNT(*)::bigint AS n
    FROM "StoreProduct"
    WHERE "matchDetailsJson"->>'version' = '2'
    GROUP BY 1
    ORDER BY n DESC
  `;

  const lowConfidence = await prisma.$queryRaw<SuspiciousRow[]>`
    SELECT
      id,
      "matchScore" AS "matchScore",
      ("matchDetailsJson"->'productMatch'->>'reason') AS reason,
      NULLIF(("matchDetailsJson"->'productMatch'->>'confidence'), '')::float AS confidence,
      "storeId" AS "storeId"
    FROM "StoreProduct"
    WHERE "matchDetailsJson"->>'version' = '2'
      AND COALESCE(
        NULLIF(("matchDetailsJson"->'productMatch'->>'confidence'), '')::float,
        0
      ) < 75
      AND ("matchDetailsJson"->'productMatch'->>'reason') IN ('title_single_candidate', 'spec_overlap')
    ORDER BY "matchScore" ASC
    LIMIT 80
  `;

  const ambiguousTitle = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*)::bigint AS n
    FROM "StoreProduct"
    WHERE (("matchDetailsJson"::jsonb #> '{productMatch,details}')::jsonb) ? 'ambiguousTitleCandidates'
  `;

  const report = {
    reasons: byReason.map((r) => ({ reason: r.reason ?? "(null)", count: Number(r.n) })),
    lowConfidenceSample: lowConfidence,
    storeProductsWithAmbiguousTitleDetail: Number(ambiguousTitle[0]?.n ?? 0)
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
