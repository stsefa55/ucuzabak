import * as SecureStore from "expo-secure-store";

type Tokens = { accessToken: string; refreshToken: string };

let accessToken: string | null = null;
let refreshToken: string | null = null;
const listeners = new Set<() => void>();

const ACCESS_KEY = "ucuzabak.accessToken";
const REFRESH_KEY = "ucuzabak.refreshToken";

function notify() {
  for (const l of listeners) l();
}

export function getAuthAccessToken() {
  return accessToken;
}

export function getAuthRefreshToken() {
  return refreshToken;
}

export function setAuthTokens(tokens: Tokens) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  // Async olarak secure store'a yaz.
  void SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken).catch(() => undefined);
  void SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken).catch(() => undefined);
  notify();
}

export function clearAuthTokens() {
  accessToken = null;
  refreshToken = null;
  void SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => undefined);
  void SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined);
  notify();
}

export function subscribeAuthTokens(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let initPromise: Promise<void> | null = null;
async function initAuthSession() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const [storedAccess, storedRefresh] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY)
      ]);

      let changed = false;
      if (storedAccess && storedAccess !== accessToken) {
        accessToken = storedAccess;
        changed = true;
      }
      if (storedRefresh && storedRefresh !== refreshToken) {
        refreshToken = storedRefresh;
        changed = true;
      }

      if (changed) notify();
    } catch {
      // SecureStore okuyamazsa sadece guest kalırız.
    }
  })();

  return initPromise;
}

export function waitForAuthSessionReady() {
  return initAuthSession();
}

// App açıldığında otomatik init.
void initAuthSession();

