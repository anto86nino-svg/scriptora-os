import { CLICHE_LIBRARY } from "./library";
import type { ClicheHit, ClicheScanResult } from "./types";
import { scanCliches } from "./scanner";

function findEntry(label: string) {
  return CLICHE_LIBRARY.find(e => e.label === label);
}

function rewriteMatch(matched: string, rewrite?: string): string {
  if (!rewrite) {
    return matched.replace(/\b(?:very|really|just|simply)\b/gi, "").trim() || matched;
  }
  if (matched[0] === matched[0]?.toUpperCase()) {
    return rewrite.charAt(0).toUpperCase() + rewrite.slice(1);
  }
  return rewrite;
}

export function rewriteCliches(text: string, hits?: ClicheHit[], genre?: string): string {
  let next = String(text || "");
  const targets =
    hits?.filter(h => h.severity === "HIGH" || h.severity === "CRITICAL") ||
    scanCliches(next, genre).hits.filter(h => h.severity === "HIGH" || h.severity === "CRITICAL");

  if (!targets.length) return next;

  const ordered = [...targets].sort((a, b) => b.startIndex - a.startIndex);
  for (const hit of ordered) {
    const entry = findEntry(hit.label);
    if (!entry) continue;
    entry.pattern.lastIndex = 0;
    next = next.replace(entry.pattern, (matched) => rewriteMatch(matched, entry.rewrite));
  }

  return next.replace(/\s{2,}/g, " ").replace(/ \./g, ".").trim();
}

export function autoRewriteCliches(text: string, genre?: string): { content: string; scan: ClicheScanResult; rewritten: boolean } {
  let content = text;
  let scan = scanCliches(content, genre);
  let rewritten = false;

  if (scan.requiresRewrite) {
    content = rewriteCliches(content, scan.hits, genre);
    rewritten = true;
    scan = scanCliches(content, genre);
  }

  return { content, scan, rewritten };
}
