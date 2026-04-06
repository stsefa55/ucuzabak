/**
 * Tüm kategorileri ağaç olarak category-tree.txt dosyasına yazar.
 * Kullanım (api klasöründen): pnpm exec tsx scripts/export-category-tree.ts
 */
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function sortKids<T extends { sortOrder: number | null; name: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const sa = a.sortOrder ?? 999_999;
    const sb = b.sortOrder ?? 999_999;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name, "tr");
  });
}

async function main() {
  const rows = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      sortOrder: true,
      isActive: true
    }
  });

  const byParent = new Map<number | null, typeof rows>();
  for (const r of rows) {
    const pid = r.parentId;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push(r);
  }

  const lines: string[] = [];
  const now = new Date().toISOString();
  lines.push(`# Ucuzabak kategori ağacı (export: ${now})`);
  lines.push(`# Toplam kayıt: ${rows.length}`);
  lines.push(`# Satır formatı: [derinlik] Ad | slug: ... | id: ... | aktif: evet/hayır | sortOrder: ...`);
  lines.push("");

  function walk(parentId: number | null, depth: number) {
    const kids = sortKids(byParent.get(parentId) ?? []);
    for (const c of kids) {
      const indent = "  ".repeat(depth);
      const prefix = depth === 0 ? "■ " : "└ ";
      const active = c.isActive ? "evet" : "hayır";
      const so = c.sortOrder != null ? String(c.sortOrder) : "-";
      lines.push(`${indent}${prefix}${c.name} | slug: ${c.slug} | id: ${c.id} | aktif: ${active} | sortOrder: ${so}`);
      walk(c.id, depth + 1);
    }
  }

  walk(null, 0);

  const outPath = path.join(__dirname, "..", "..", "..", "category-tree.txt");
  fs.writeFileSync(outPath, "\uFEFF" + lines.join("\n"), "utf8");
  console.log("Yazıldı:", outPath);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
