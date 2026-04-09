/**
 * Tek canonical mağaza kökü (üretim): https://www.ucuzabak.com
 * STOREFRONT_BASE_URL tanımlıysa her zaman o kullanılır.
 *
 * Not: Next.js `next build` sırasında NODE_ENV=production olduğundan, web metadata/robots
 * için `resolveStorefrontBaseUrlForWeb` kullanın (üretim varsayımı yok — env şart).
 */
export const CANONICAL_STOREFRONT_PRODUCTION = "https://www.ucuzabak.com";

export function resolveStorefrontBaseUrlForBackend(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.STOREFRONT_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  if (env.NODE_ENV === "production") {
    return CANONICAL_STOREFRONT_PRODUCTION.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/**
 * Next.js layout / robots / sitemap.
 * - STOREFRONT_BASE_URL öncelikli.
 * - Vercel production veya Docker production (RUNNING_IN_DOCKER): canonical www.
 * - Diğer (yerel dev): localhost.
 */
export function resolveStorefrontBaseUrlForWeb(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.STOREFRONT_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  if (env.VERCEL_ENV === "production") {
    return CANONICAL_STOREFRONT_PRODUCTION.replace(/\/$/, "");
  }
  if (env.RUNNING_IN_DOCKER === "true" && env.NODE_ENV === "production") {
    return CANONICAL_STOREFRONT_PRODUCTION.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
