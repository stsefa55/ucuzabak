"use client";

import { useEffect } from "react";
import { bootstrapAuthFromRefreshCookie } from "../../lib/bootstrap-auth-session";
import { syncGuestFavoritesToAccount } from "../../lib/guest-favorites-sync";
import { useAuthStore } from "../../stores/auth-store";

export function AuthBootstrap() {
  const { setSession, clearSession } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    void bootstrapAuthFromRefreshCookie().then(async (result) => {
      if (cancelled) return;
      if (result.ok) {
        setSession(result.accessToken, result.user);
        await syncGuestFavoritesToAccount(result.accessToken);
      } else {
        clearSession();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [setSession, clearSession]);

  return null;
}

