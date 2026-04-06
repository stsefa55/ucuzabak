/**
 * Admin panelinde kaydedilen `Store.feedImportIntervalLabel` ile planlı import aralığı.
 * UI `1h` / `24h` gönderir; eski serbest metinler için geriye dönük tahmin.
 */
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function parseFeedImportIntervalMs(
  label: string | null | undefined,
  fallbackMs: number,
): number {
  const raw = label?.trim().toLowerCase();
  if (!raw) return fallbackMs;

  if (raw === "1h" || raw === "hourly" || raw.includes("saatlik")) {
    return HOUR_MS;
  }
  if (
    raw === "24h" ||
    raw === "1d" ||
    raw === "daily" ||
    raw.includes("günlük") ||
    raw.includes("gunluk")
  ) {
    return DAY_MS;
  }

  const m = raw.match(/^(\d+)\s*h(?:our)?s?$/);
  if (m) {
    const n = Number(m[1]);
    if (n > 0 && n <= 168) return n * HOUR_MS;
  }
  const d = raw.match(/^(\d+)\s*d(?:ay)?s?$/);
  if (d) {
    const n = Number(d[1]);
    if (n > 0 && n <= 30) return n * DAY_MS;
  }

  if (raw.includes("gün") || raw.includes("gun ") || raw.includes("daily")) {
    return DAY_MS;
  }
  if (raw.includes("saat") && !raw.includes("24")) {
    return HOUR_MS;
  }

  return fallbackMs;
}
