import { apiFetch } from "./api-client";
import type { UserInfo } from "../stores/auth-store";

export type BootstrapAuthResult =
  | { ok: true; accessToken: string; user: UserInfo }
  | { ok: false };

/**
 * Tek uçuşlu oturum yenileme: React 18 Strict Mode'da effect'in iki kez çalışması
 * aynı anda iki /auth/refresh isteği göndermesin (ilk istek token'ı rotate edince
 * ikincisi başarısız olur ve oturum silinirdi).
 */
let inflight: Promise<BootstrapAuthResult> | null = null;

export function bootstrapAuthFromRefreshCookie(): Promise<BootstrapAuthResult> {
  if (!inflight) {
    inflight = (async (): Promise<BootstrapAuthResult> => {
      try {
        const refreshResponse = await apiFetch<{ accessToken: string | null }>("/auth/refresh", {
          method: "POST"
        });
        if (!refreshResponse.accessToken) {
          return { ok: false };
        }
        const accessToken = refreshResponse.accessToken;
        const me = await apiFetch<{ user: UserInfo | null }>("/auth/me", { accessToken });
        if (!me.user) {
          return { ok: false };
        }
        return { ok: true, accessToken, user: me.user };
      } catch {
        return { ok: false };
      }
    })().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}
