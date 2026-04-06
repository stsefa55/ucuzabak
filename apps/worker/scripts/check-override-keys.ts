import { prisma } from "../src/prisma";

const KEYS = [
  "kedi odulu",
  "kopek odulu",
  "yemek odasi takimi",
  "kedi tuvaleti",
  "bisiklet aksesuari",
  "blender seti",
  "biberon isitici ve sterilizator"
];

async function main() {
  const rows = await prisma.categoryMappingOverride.findMany({
    where: { source: "trendyol", normalizedKey: { in: KEYS } },
    select: { normalizedKey: true, categoryId: true }
  });
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

