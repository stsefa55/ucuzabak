/**
 * Şifre sıfırlama jeton süresi (saniye) — tek kaynak.
 * Ortam: PASSWORD_RESET_TOKEN_TTL_SEC (yoksa varsayılan).
 */

export const PASSWORD_RESET_TOKEN_TTL_ENV_KEY = "PASSWORD_RESET_TOKEN_TTL_SEC" as const;

/** Varsayılan: 1 saat */
export const PASSWORD_RESET_TTL_DEFAULT_SEC = 3600;

/** İzin verilen aralık (saniye) */
export const PASSWORD_RESET_TTL_MIN_SEC = 300;
export const PASSWORD_RESET_TTL_MAX_SEC = 86400;

/**
 * API token `expiresAt` ve worker şifre e-postası metni için aynı değeri üretir.
 */
export function resolvePasswordResetTtlSeconds(env: NodeJS.ProcessEnv = process.env): number {
  return Math.min(
    Math.max(
      Number(env[PASSWORD_RESET_TOKEN_TTL_ENV_KEY] || PASSWORD_RESET_TTL_DEFAULT_SEC),
      PASSWORD_RESET_TTL_MIN_SEC
    ),
    PASSWORD_RESET_TTL_MAX_SEC
  );
}
