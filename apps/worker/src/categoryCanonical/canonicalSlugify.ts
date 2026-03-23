/**
 * Seed (`apps/api/prisma/seed.ts`) ile aynı slug üretimi — kategori eşlemesi için zorunlu.
 * Burayı değiştirirsen seed'deki `slugify` ile senkron tut.
 */
export function canonicalSlugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, " ve ")
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g")
    .replace(/[ı]/g, "i")
    .replace(/[i]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ş]/g, "s")
    .replace(/[ü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
