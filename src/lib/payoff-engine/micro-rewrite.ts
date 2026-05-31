import type { PayoffAnalysis } from "./types";

const PAYOFF_CLOSURE_SNIPPETS: Array<{ test: RegExp; snippet: string }> = [
  {
    test: /\bpromis/i,
    snippet:
      " She finally understood the promise would not land tonight — only sharpen before it broke.",
  },
  {
    test: /\b(?:noticed|saw|found|spotted|discovered|incontrò|vide|trovò)/i,
    snippet:
      " The detail finally revealed itself — not as closure, but as a question that tightened the scene.",
  },
  {
    test: /\b(?:if|quando|when)\b/i,
    snippet: " At last the condition resolved into pressure, unanswered but impossible to ignore.",
  },
];

function snippetForSetup(setup: string): string {
  for (const { test, snippet } of PAYOFF_CLOSURE_SNIPPETS) {
    if (test.test(setup)) return snippet.trim();
  }
  return "At last the thread tightened — revealed enough to carry the scene forward.";
}

function findInsertionPoint(text: string, setup: string): number {
  const frag = setup.toLowerCase().slice(0, 30);
  const idx = text.toLowerCase().indexOf(frag);
  if (idx < 0) return -1;
  const dot = text.indexOf(".", idx);
  return dot >= 0 ? dot + 1 : text.length;
}

/** Injects a same-chapter payoff beat when setup lacks closure (Payoff Engine). */
export function applyPayoffMicroRewrite(text: string, analysis: PayoffAnalysis): string {
  if (!analysis.missingPayoffCount) return text;

  let next = text;
  for (const beat of analysis.beats.filter(b => b.status === "missing_payoff")) {
    const pos = findInsertionPoint(next, beat.setup);
    if (pos < 0) continue;

    const after = next.slice(pos, pos + 220);
    if (/\b(?:finally|at last|finalmente|revealed|understood|realized|paid off|resolved)\b/i.test(after)) {
      continue;
    }

    const snippet = snippetForSetup(beat.setup);
    next = `${next.slice(0, pos)} ${snippet}${next.slice(pos)}`;
  }

  return next.replace(/\s{2,}/g, " ").trim();
}
