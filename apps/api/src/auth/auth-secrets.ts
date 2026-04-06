/**
 * Üretimde zayıf veya eksik JWT/pepper yasak; tüm ortamlarda API_JWT_SECRET zorunludur.
 * İsteğe bağlı pepper'lar yoksa JWT sırrına düşülür (tahmin edilebilir sabit kullanılmaz).
 */
export function getJwtSecret(): string {
  const s = process.env.API_JWT_SECRET?.trim();
  if (!s) {
    throw new Error(
      "API_JWT_SECRET is required. Set a long random value in the environment (e.g. openssl rand -hex 32).",
    );
  }
  return s;
}

export function getPasswordResetPepper(): string {
  const p = process.env.API_PASSWORD_RESET_PEPPER?.trim();
  if (p) return p;
  return getJwtSecret();
}

export function getEmailVerificationPepper(): string {
  const p = process.env.API_EMAIL_VERIFICATION_PEPPER?.trim();
  if (p) return p;
  const p2 = process.env.API_PASSWORD_RESET_PEPPER?.trim();
  if (p2) return p2;
  return getJwtSecret();
}

export function getRefreshTokenPepper(): string {
  const p = process.env.API_REFRESH_TOKEN_PEPPER?.trim();
  if (p) return p;
  return getJwtSecret();
}

export function getAffiliateIpSalt(): string {
  const s = process.env.AFFILIATE_IP_SALT?.trim();
  if (s) return s;
  return getJwtSecret();
}
