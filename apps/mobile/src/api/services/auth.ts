import { apiFetchJson } from "../client";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  phone?: string | null;
  birthDate?: string | null;
  role?: string;
  status?: string;
  lastLoginAt?: string | null;
};

export type AuthTokens = { accessToken: string; refreshToken: string };

function extractErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const status = (err as { status?: number } | null)?.status;

  if (status === 401 || status === 403) return "E-posta veya şifre hatalı.";
  if (status === 409) return "Bu e-posta ile kayıtlı bir hesap zaten var.";
  if (status === 400) return "Gönderilen bilgiler geçersiz. Lütfen alanları kontrol edin.";
  if (status === 500) return "Sunucu hatası oluştu. Lütfen tekrar deneyin.";

  const lower = raw.toLowerCase();
  if (lower.includes("failed to fetch") || lower.includes("network request failed")) {
    return "Bağlantı hatası. İnternetinizi ve sunucu adresini kontrol edin.";
  }
  if (!raw || raw === "[object Object]") {
    return "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.";
  }
  return raw;
}

function toAuthError(err: unknown): Error & { status?: number } {
  const e = new Error(extractErrorMessage(err)) as Error & { status?: number };
  const status = (err as { status?: number } | null)?.status;
  if (typeof status === "number") e.status = status;
  return e;
}

export async function login(dto: { email: string; password: string }): Promise<AuthTokens> {
  try {
    return await apiFetchJson<AuthTokens>("/auth/login", {
      method: "POST",
      headers: { "x-client-type": "mobile" },
      body: dto
    });
  } catch (err) {
    throw toAuthError(err);
  }
}

export async function register(dto: { email: string; name: string; birthDate?: string; phone?: string; password: string }): Promise<AuthTokens> {
  try {
    return await apiFetchJson<AuthTokens>("/auth/register", {
      method: "POST",
      headers: { "x-client-type": "mobile" },
      body: dto
    });
  } catch (err) {
    throw toAuthError(err);
  }
}

export async function refresh(refreshTok: string): Promise<AuthTokens> {
  try {
    return await apiFetchJson<AuthTokens>("/auth/refresh", {
      method: "POST",
      headers: { "x-client-type": "mobile" },
      body: { refreshToken: refreshTok }
    });
  } catch (err) {
    throw toAuthError(err);
  }
}

export async function logout(refreshTok?: string | null): Promise<{ success: true }> {
  try {
    return await apiFetchJson<{ success: true }>("/auth/logout", {
      method: "POST",
      headers: { "x-client-type": "mobile" },
      body: refreshTok ? { refreshToken: refreshTok } : {}
    });
  } catch (err) {
    throw toAuthError(err);
  }
}

export async function me(accessTok: string): Promise<{ user: AuthUser | null }> {
  try {
    return await apiFetchJson<{ user: AuthUser | null }>("/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessTok}` }
    });
  } catch (err) {
    throw toAuthError(err);
  }
}

