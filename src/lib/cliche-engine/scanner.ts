import { CLICHE_LIBRARY } from "./library";
import type { ClicheHit, ClicheScanResult, ClicheSeverity } from "./types";

const REWRITE_SEVERITIES = new Set<ClicheSeverity>(["HIGH", "CRITICAL"]);

function excerptAround(text: string, start: number, len: number): string {
  const from = Math.max(0, start - 40);
  const to = Math.min(text.length, start + len + 40);
  return text.slice(from, to).replace(/\s+/g, " ").trim();
}

export function scanCliches(text: string, genre?: string): ClicheScanResult {
  const source = String(text || "");
  const hits: ClicheHit[] = [];
  const seen = new Set<string>();

  const genreBoost = genre
    ? CLICHE_LIBRARY.filter(e => {
        const g = genre.toLowerCase();
        if (/romance|dark-romance/.test(g)) return e.category === "Romance" || e.category === "Dialogue";
        if (/thriller|mystery|crime/.test(g)) return e.category === "Thriller" || e.category === "Dialogue";
        if (/fantasy|sci-fi/.test(g)) return e.category === "Fantasy";
        if (/self-help|productivity|psychology|spirituality/.test(g)) return e.category === "Self Help" || e.category === "Motivation";
        if (/business|productivity/.test(g)) return e.category === "Business";
        return true;
      })
    : CLICHE_LIBRARY;

  for (const entry of genreBoost) {
    entry.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = entry.pattern.exec(source)) !== null) {
      const key = `${entry.label}:${match.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({
        label: entry.label,
        matched: match[0],
        category: entry.category,
        severity: entry.severity,
        excerpt: excerptAround(source, match.index, match[0].length),
        startIndex: match.index,
      });
    }
  }

  hits.sort((a, b) => a.startIndex - b.startIndex);

  const words = source.split(/\s+/).filter(Boolean).length || 1;
  const criticalCount = hits.filter(h => h.severity === "CRITICAL").length;
  const highCount = hits.filter(h => h.severity === "HIGH").length;
  const density = Math.round((hits.length / words) * 1000 * 10) / 10;

  return {
    hits,
    density,
    criticalCount,
    highCount,
    requiresRewrite: hits.some(h => REWRITE_SEVERITIES.has(h.severity)),
  };
}
