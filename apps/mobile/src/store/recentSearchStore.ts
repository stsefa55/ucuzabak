const MAX_RECENTS = 8;

let recentTerms: string[] = [];

function normalizeTerm(t: string) {
  return t.trim().replace(/\s+/g, " ");
}

export function getRecentSearchTerms() {
  return recentTerms.slice();
}

export function addRecentSearchTerm(term: string) {
  const normalized = normalizeTerm(term);
  if (!normalized) return getRecentSearchTerms();

  const next = [normalized, ...recentTerms.filter((x) => x.toLowerCase() !== normalized.toLowerCase())].slice(0, MAX_RECENTS);
  recentTerms = next;
  return getRecentSearchTerms();
}

export function clearRecentSearchTerms() {
  recentTerms = [];
}

