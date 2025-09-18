import { FunctionDef, Struct } from "./types.js";

export function parseSearchQuery(query: string | undefined): string[] {
  if (!query) return [];
  const terms = query.trim().split(/[,\s]+/g).map(t => t.trim().toLowerCase()).filter(Boolean);
  return terms;
}

export function fuzzyMatch(term: string, text: string, threshold = 0.8, termMinLength = 4): boolean {
  if (!term || !text) return false;
  const t = term.toLowerCase();
  const s = text.toLowerCase();
  if (s.includes(t)) return true;
  const words = s.split(/\s+/g);
  for (const w of words) {
    if (t.length >= termMinLength && w.length >= termMinLength) {
      const common = [...t].filter(c => w.includes(c)).length;
      const sim = common / Math.max(t.length, w.length);
      if (sim >= threshold) return true;
    }
  }
  return false;
}

export function calculateFunctionMatchScore(terms: string[], fn: FunctionDef, matchAllTags = false): number {
  let score = 0;
  for (const term of terms) {
    let termScore = 0;
    if (fn.name) {
      if (fn.name.toLowerCase().includes(term)) termScore += 100;
      else if (fuzzyMatch(term, fn.name)) termScore += 80;
    }
    if (fn.tags && fn.tags.size > 0) {
      for (const tag of fn.tags) {
        const tagLower = String(tag).toLowerCase();
        if (tagLower.includes(term)) {
          termScore += matchAllTags ? 25 : 50; if (!matchAllTags) break;
        } else if (fuzzyMatch(term, tagLower)) {
          termScore += matchAllTags ? 20 : 40; if (!matchAllTags) break;
        }
      }
    }
    if (fn.description) {
      const d = fn.description.toLowerCase();
      if (d.includes(term)) termScore += 10; else if (fuzzyMatch(term, d)) termScore += 8;
    }
    score += termScore;
  }
  return score;
}

export function calculateStructMatchScore(terms: string[], st: Struct, matchAllTags = false): number {
  let score = 0;
  for (const term of terms) {
    let termScore = 0;
    if (st.name) {
      if (st.name.toLowerCase().includes(term)) termScore += 100;
      else if (fuzzyMatch(term, st.name)) termScore += 80;
    }
    if (st.tags && (st.tags as Set<string>).size > 0) {
      for (const tag of st.tags as Set<string>) {
        const tagLower = String(tag).toLowerCase();
        if (tagLower.includes(term)) {
          termScore += matchAllTags ? 25 : 50; if (!matchAllTags) break;
        } else if (fuzzyMatch(term, tagLower)) {
          termScore += matchAllTags ? 20 : 40; if (!matchAllTags) break;
        }
      }
    }
    if (st.description) {
      const d = st.description.toLowerCase();
      if (d.includes(term)) termScore += 10; else if (fuzzyMatch(term, d)) termScore += 8;
    }
    score += termScore;
  }
  return score;
}

export function paginateResults<T>(items: T[], limit: number, offset: number): { data: T[]; total: number; next?: number } {
  const total = items.length;
  if (offset >= total) return { data: [], total: 0 };
  const end = Math.min(offset + limit, total);
  const next = end < total ? end : undefined;
  return { data: items.slice(offset, end), total, next };
}


