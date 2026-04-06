const MAX_SPEC_LEN = 80;
const MAX_ROWS = 6;

/** Liste kartındaki specsJson’dan önizleme için kısa satırlar (3–6 arası hedef) */
export function pickPreviewSpecs(
  specsJson: Record<string, unknown> | null | undefined
): Array<{ key: string; value: string }> {
  if (!specsJson || typeof specsJson !== "object" || Array.isArray(specsJson)) return [];
  const out: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(specsJson)) {
    if (out.length >= MAX_ROWS) break;
    if (v == null || v === "") continue;
    let s: string;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") s = String(v);
    else if (Array.isArray(v)) s = v.map(String).join(", ");
    else s = JSON.stringify(v);
    const t = s.trim();
    if (!t) continue;
    const value = t.length > MAX_SPEC_LEN ? `${t.slice(0, MAX_SPEC_LEN)}…` : t;
    out.push({ key: humanizeSpecKey(k), value });
  }
  return out;
}

function humanizeSpecKey(raw: string): string {
  const s = raw.replace(/[_-]+/g, " ").trim();
  if (!s) return raw;
  return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
}
