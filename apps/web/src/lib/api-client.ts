/**
 * API tabanı — tek kaynak: `NEXT_PUBLIC_API_BASE_URL`.
 * Tanımlı değilse yerel Nest varsayılanı kullanılır.
 */

const DEFAULT_API_BASE_URL = "http://localhost:4000/api/v1";

export function getApiBaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;

  // Browser: host makinedeki API adresini kullan (örn. localhost:4000).
  if (typeof window !== "undefined") {
    return v;
  }

  // Server-side rewrite sadece container içinde aktif olmalı.
  // Local `pnpm dev:web` sırasında localhost:4000 korunur.
  const runningInDocker = process.env.RUNNING_IN_DOCKER === "true";
  if (runningInDocker) {
    if (
      v.startsWith("http://localhost:") ||
      v.startsWith("https://localhost:") ||
      v.startsWith("http://127.0.0.1:") ||
      v.startsWith("https://127.0.0.1:")
    ) {
      return v
        .replace("http://localhost:", "http://api:")
        .replace("https://localhost:", "http://api:")
        .replace("http://127.0.0.1:", "http://api:")
        .replace("https://127.0.0.1:", "http://api:");
    }
  }

  return v;
}

/** Harici tam URL veya API sunucusundaki `/uploads/...` yolu (banner vb.). */
export function resolveApiMediaUrl(imageUrl: string): string {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const base = getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
  const p = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return `${base}${p}`;
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface ApiClientOptions {
  method?: HttpMethod;
  body?: unknown;
  accessToken?: string | null;
}

export async function apiFetch<T>(
  path: string,
  { method = "GET", body, accessToken }: ApiClientOptions = {},
): Promise<T> {
  const headersInit: HeadersInit = {};
  if (accessToken) {
    headersInit.Authorization = `Bearer ${accessToken}`;
  }

  const jsonBody =
    body !== undefined && body !== null ? JSON.stringify(body) : undefined;
  if (jsonBody !== undefined) {
    headersInit["Content-Type"] = "application/json";
  }

  const requestUrl = `${getApiBaseUrl()}${path}`;

  const res = await fetch(requestUrl, {
    method,
    headers: headersInit,
    body: jsonBody,
    credentials: "include"
  });

  if (!res.ok) {
    const text = await res.text();
    const error = new Error(text || `API error (${res.status})`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  return (await res.json()) as T;
}
