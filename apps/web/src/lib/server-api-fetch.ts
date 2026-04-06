/**
 * SSR fetch yardımcıları — JSON parse / HTTP hata gövdeleri sayfayı düşürmesin.
 */

export function asArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

/** 2xx + geçerli JSON; aksi halde null */
export async function fetchJsonOrNull<T>(url: string, init?: RequestInit): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const text = await res.text();
  if (!text?.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Dizi beklenen endpoint; hata veya bozuk cevapta [] */
export async function fetchJsonArray<T>(url: string, init?: RequestInit): Promise<T[]> {
  const data = await fetchJsonOrNull<unknown>(url, init);
  return asArray<T>(data);
}
