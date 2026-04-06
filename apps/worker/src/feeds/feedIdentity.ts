/**
 * Feed satırı dış kimliği: nesne / "undefined" / [object Object] çöküşlerini engeller.
 */

/** UTF-8 BOM; `startsWith("[")` / ilk karakter tespitlerini bozar. */
export function stripFeedFileUtf8Bom(raw: string): string {
  return raw.replace(/^\uFEFF/, "");
}

export function isForbiddenExternalIdLiteral(s: string): boolean {
  const l = s.trim().toLowerCase();
  return (
    l === "undefined" ||
    l === "null" ||
    l === "nan" ||
    l === "[object object]" ||
    l.startsWith("[object ")
  );
}

/** Yalnızca string / sayı / bigint; nesne ve diziyi reddeder. */
export function primitiveFeedIdCandidate(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") {
    const t = v.trim();
    if (t.length === 0 || isForbiddenExternalIdLiteral(t)) return undefined;
    return t;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return String(Math.trunc(v));
  }
  if (typeof v === "bigint") return String(v);
  return undefined;
}

export function isValidFeedExternalId(id: unknown): boolean {
  return coerceFeedItemExternalId({ externalId: id } as { externalId: unknown }) != null;
}

/**
 * Parse sonrası satırı güvenli tek string externalId'ye çevirir; geçersizse null (importer atlar).
 */
export function coerceFeedItemExternalId(item: { externalId?: unknown }): string | null {
  const v = item.externalId;
  let s = "";
  if (typeof v === "string") s = v.trim();
  else if (typeof v === "number" && Number.isFinite(v)) s = String(Math.trunc(v));
  else if (typeof v === "bigint") s = String(v);
  else return null;

  if (s.length === 0 || s.length > 255) return null;
  if (isForbiddenExternalIdLiteral(s)) return null;
  return s;
}

/** Trendyol ürün URL’sindeki içerik kimliği: ...-p-100001479?... */
export function parseTrendyolProductIdFromUrl(url: unknown): string | undefined {
  if (typeof url !== "string" || url.length === 0) return undefined;
  const m = url.match(/-p-(\d+)(?=\?|#|$)/i) ?? url.match(/\/p-(\d+)(?=\?|#|$)/i);
  const id = m?.[1];
  if (id && /^\d+$/.test(id)) return id;
  return undefined;
}

/** Product.slug parçası: boş / yasaklı literal → hash (feed-1-undefined oluşmaz). */
export function slugSafeSegmentFromExternalId(externalId: string): string {
  const raw = String(externalId ?? "").trim();
  if (raw.length === 0 || isForbiddenExternalIdLiteral(raw)) {
    let h = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      h = Math.imul(h ^ raw.charCodeAt(i), 16777619);
    }
    return "bad-" + (h >>> 0).toString(36);
  }
  const safe = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  if (safe.length > 0) return safe;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h = Math.imul(h ^ raw.charCodeAt(i), 16777619);
  }
  return "h" + (h >>> 0).toString(36);
}
