export type ApiDelayOptions = {
  minMs?: number;
  maxMs?: number;
};

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function withMockDelay<T>(fn: () => T, delay: ApiDelayOptions = { minMs: 250, maxMs: 650 }): Promise<T> {
  const minMs = delay.minMs ?? 250;
  const maxMs = delay.maxMs ?? 650;
  const ms = Math.floor(minMs + Math.random() * Math.max(0, maxMs - minMs));
  await sleep(ms);
  return fn();
}

const DEFAULT_PROD_API_BASE_URL = "https://api.ucuzabak.com/api/v1";

const rawApiBaseUrl =
  // Expo build-time env
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  // eslint-disable-next-line no-undef
  (process.env.NODE_ENV === "production" ? DEFAULT_PROD_API_BASE_URL : "http://192.168.1.4:4000/api/v1");

const LAN_FALLBACK_API_BASE_URL = "http://192.168.1.4:4000/api/v1";

function isLocalhostLike(url: string) {
  const u = url.toLowerCase();
  return u.includes("localhost") || u.includes("127.0.0.1") || u.includes("0.0.0.0");
}

const normalizedApiBaseUrl = (() => {
  const v = rawApiBaseUrl;
  if (!v) return LAN_FALLBACK_API_BASE_URL;
  if (isLocalhostLike(v)) {
    console.log("[MOBILE API DEBUG] localhost-like BASE_URL tespit edildi, LAN fallback'e geçiliyor:", v);
    return LAN_FALLBACK_API_BASE_URL;
  }
  return v;
})();

export const API_BASE_URL = normalizedApiBaseUrl;

console.log("[MOBILE API DEBUG] resolved BASE_URL:", API_BASE_URL);

export type ApiFetchOptions = Omit<RequestInit, "method" | "headers"> & {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
};

export async function apiFetchJson<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(typeof body !== "undefined" ? { "Content-Type": "application/json" } : null),
    ...(extraHeaders ? (extraHeaders as Record<string, string>) : null),
  };

  const url = `${API_BASE_URL}${path}`;
  console.log("[MOBILE API DEBUG] REQUEST URL:", url);

  const res = await fetch(url, {
    method,
    headers,
    body: typeof body === "undefined" ? undefined : JSON.stringify(body),
    ...rest,
  });

  if (!res.ok) {
    let text = "";
    let parsedMessage = "";
    try {
      text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text) as { message?: string | string[] };
          if (Array.isArray(json?.message)) parsedMessage = json.message.join(", ");
          else if (typeof json?.message === "string") parsedMessage = json.message;
        } catch {
          // response plain text olabilir
        }
      }
    } catch {
      // ignore
    }
    const error = new Error(parsedMessage || text || `API error (${res.status})`);
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }

  return (await res.json()) as T;
}

