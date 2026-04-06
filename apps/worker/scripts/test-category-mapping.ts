/**
 * Veritabanı gerektirmez: kategori rollup ve yol çözümlemesi duman testi.
 * Kullanım: pnpm exec ts-node --transpile-only scripts/test-category-mapping.ts
 */
import assert from "node:assert/strict";
import { createCategoryResolutionContext, resolveCategoryTextId } from "../src/categoryCanonical/resolveCategoryText";
import type { CanonicalCategory } from "../src/categoryCanonical/resolveCategoryText";

function run() {
  const cats: CanonicalCategory[] = [
    { id: 1, name: "Moda", slug: "moda", parentId: null },
    { id: 2, name: "Elektronik", slug: "elektronik", parentId: null },
    { id: 3, name: "Cep Telefonu", slug: "cep-telefonu", parentId: 2 },
    { id: 4, name: "Televizyon", slug: "televizyon", parentId: 2 },
    { id: 5, name: "TV Duvar Askı Aparatları", slug: "televizyon-tv-duvar-aski-aparatlari", parentId: 4 }
  ];

  const ctx = createCategoryResolutionContext(cats);

  assert.equal(resolveCategoryTextId(ctx, "Kazak"), 1, "rollup: kazak → moda");
  assert.equal(resolveCategoryTextId(ctx, "Elektronik > Cep Telefonu"), 3, "hiyerarşi");
  assert.equal(resolveCategoryTextId(ctx, "Elektronik,Cep Telefonu"), 3, "virgül ayırıcı");
  assert.equal(resolveCategoryTextId(ctx, "TV Askı Aparatı"), 5, "rollup: tv askı → L3");

  console.log("category mapping smoke: OK");
}

run();
