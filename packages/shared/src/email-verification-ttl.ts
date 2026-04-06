/**
 * E-posta doğrulama jeton süresi (saniye).
 * Ortam: EMAIL_VERIFICATION_TOKEN_TTL_SEC
 */

export const EMAIL_VERIFICATION_TOKEN_TTL_ENV_KEY = "EMAIL_VERIFICATION_TOKEN_TTL_SEC" as const;

/** Varsayılan: 48 saat */
export const EMAIL_VERIFICATION_TTL_DEFAULT_SEC = 172800;

export const EMAIL_VERIFICATION_TTL_MIN_SEC = 3600;
export const EMAIL_VERIFICATION_TTL_MAX_SEC = 604800;

export function resolveEmailVerificationTtlSeconds(env: NodeJS.ProcessEnv = process.env): number {
  return Math.min(
    Math.max(
      Number(env[EMAIL_VERIFICATION_TOKEN_TTL_ENV_KEY] || EMAIL_VERIFICATION_TTL_DEFAULT_SEC),
      EMAIL_VERIFICATION_TTL_MIN_SEC
    ),
    EMAIL_VERIFICATION_TTL_MAX_SEC
  );
}
