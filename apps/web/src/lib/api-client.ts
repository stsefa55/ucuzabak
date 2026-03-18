const PRODUCTION_API_BASE_URL = "https://api.ucuzabak.com/api/v1";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production" ? PRODUCTION_API_BASE_URL : "http://localhost:4000/api/v1");

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface ApiClientOptions {
  method?: HttpMethod;
  body?: unknown;
  accessToken?: string | null;
  // For SSR/server components you can pass cookies from headers if needed later.
}

export async function apiFetch<T>(
  path: string,
  { method = "GET", body, accessToken }: ApiClientOptions = {},
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include" // to send refresh_token cookie when needed
  });

  if (!res.ok) {
    const text = await res.text();
    const error = new Error(text || `API error (${res.status})`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  return (await res.json()) as T;
}

