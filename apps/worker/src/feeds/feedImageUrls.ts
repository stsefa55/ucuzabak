import type { ParsedFeedItem } from "./types";

/**
 * Yerel `import-normalized-json` ile aynı mantık: `image` + `images[]` birleşimi, tekrarsız sıra.
 */
export function pickFeedImageUrlsFromParsedItem(item: ParsedFeedItem): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (u: string | undefined | null) => {
    const v = String(u ?? "").trim();
    if (!v || seen.has(v)) return;
    seen.add(v);
    urls.push(v);
  };
  add(item.imageUrl);
  for (const im of item.images ?? []) {
    add(im);
  }
  return urls;
}

/** Vitirin ana görseli: ilk geçerli URL. */
export function primaryFeedImageUrl(item: ParsedFeedItem): string | undefined {
  const all = pickFeedImageUrlsFromParsedItem(item);
  return all[0];
}
