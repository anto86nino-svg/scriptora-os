import type { V13Context, V13Result, V13Signal } from "./types";

export function runReaderAddictionEngine(text: string, ctx: V13Context = {}): V13Result {
  const signals: V13Signal[] = [];
  const last = text.trim().split(/\n{2,}/).filter(Boolean).slice(-1)[0] || "";

  const hasHookEnding = /\?|ma\b|però\b|non ancora|qualcosa|silenzio|porta|ombra|instead|but|not yet|something/i.test(last);
  const tooExplainedEnding = /\b(in conclusione|da questo capiamo|morale|lesson|in summary|therefore)\b/i.test(last);

  if (!hasHookEnding && ctx.family === "narrative") {
    signals.push({ id: "weak_page_turn", score: 48, message: "Finale poco compulsivo: manca domanda, tensione o residuo emotivo." });
  }

  if (tooExplainedEnding) {
    signals.push({ id: "overexplained_ending", score: 50, message: "Finale troppo spiegato: lascia più eco e meno morale." });
  }

  return {
    score: Math.max(35, 93 - signals.length * 16),
    signals,
    directives: [
      "End with emotional residue, open loop, image, question, cost, or unresolved pressure.",
      "Never close a chapter with a flat moral if the reader should continue.",
      ctx.family === "nonfiction"
        ? "For nonfiction: end with a practical next step plus a question that makes the reader continue."
        : "For fiction: end before emotional explanation becomes too complete.",
    ],
  };
}
