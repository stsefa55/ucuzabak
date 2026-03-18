"use client";

import { useEffect } from "react";
import { apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../stores/auth-store";

export function AuthBootstrap() {
  const { setSession, clearSession } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const refreshResponse = await apiFetch<{ accessToken: string | null }>("/auth/refresh", {
          method: "POST"
        });

        if (!refreshResponse.accessToken) {
          if (!cancelled) clearSession();
          return;
        }

        const accessToken = refreshResponse.accessToken;
        const me = await apiFetch<{ user: any }>("/auth/me", {
          accessToken
        });

        if (!cancelled && me.user) {
          setSession(accessToken, me.user);
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [setSession, clearSession]);

  return null;
}

