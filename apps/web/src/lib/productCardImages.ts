/**
 * Trendyol CDN liste URL’leri `.../mnresize/400/-/ty.../...` şeklinde küçültülür (kırpılmış gibi).
 * Öneki kaldırınca aynı dosya tam çözünürlükte servis edilir.
 */
export function preferFullSizeProductImageUrl(url: string): string {
  const t = url.trim();
  if (!t) return t;
  try {
    const u = new URL(t);
    if (!u.hostname.endsWith("dsmcdn.com")) return t;

    const p = u.pathname;
    const wAuto = /^\/mnresize\/\d+\/-\/(.+)$/.exec(p);
    if (wAuto) {
      u.pathname = `/${wAuto[1]}`;
      return u.toString();
    }
    const wh = /^\/mnresize\/\d+\/\d+\/(.+)$/.exec(p);
    if (wh) {
      u.pathname = `/${wh[1]}`;
      return u.toString();
    }
    return t;
  } catch {
    return t;
  }
}

/** Kart / önizleme galerisi: productImages öncelikli; yoksa mainImageUrl + imageUrls */
export interface ProductCardImageFields {
  mainImageUrl?: string | null;
  imageUrls?: string[];
  productImages?: Array<{ imageUrl: string; position?: number }>;
}

export function buildCardImageUrls(product: ProductCardImageFields): string[] {
  const sortedProductImages = [...(product.productImages ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((i) => i.imageUrl)
    .filter((v): v is string => Boolean(v));

  const fromLegacy = (product.imageUrls ?? []).filter((v): v is string => Boolean(v));

  const pushUniq = (into: string[], seen: Set<string>, url: string) => {
    if (!seen.has(url)) {
      seen.add(url);
      into.push(url);
    }
  };

  if (sortedProductImages.length > 0) {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const url of sortedProductImages) pushUniq(out, seen, url);
    if (product.mainImageUrl && !seen.has(product.mainImageUrl)) {
      seen.add(product.mainImageUrl);
      out.unshift(product.mainImageUrl);
    }
    for (const url of fromLegacy) pushUniq(out, seen, url);
    return out;
  }

  const out: string[] = [];
  const seen = new Set<string>();
  if (product.mainImageUrl) pushUniq(out, seen, product.mainImageUrl);
  for (const url of fromLegacy) pushUniq(out, seen, url);
  return out;
}

/** Hızlı bak: kart sırası + mümkünse CDN tam boy (örn. Trendyol mnresize kaldırma) */
export function buildQuickPreviewImageUrls(product: ProductCardImageFields): string[] {
  return buildCardImageUrls(product).map(preferFullSizeProductImageUrl);
}
