const STORAGE_KEY = "searchHistory";
const MAX_ITEMS = 4;

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function addToSearchHistory(query: string) {
  const q = String(query).trim();
  if (!q) return;
  try {
    const list = getSearchHistory().filter((item) => item !== q);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([q, ...list].slice(0, MAX_ITEMS)));
  } catch {
    // ignore
  }
}

export function clearSearchHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
