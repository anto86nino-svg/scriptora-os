import type { V13Context, V13Result, V13Signal } from "./types";

export function runEmotionalMomentumEngine(text: string, ctx: V13Context = {}): V13Result {
  const signals: V13Signal[] = [];
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  const introspective = paragraphs.filter(p => /\b(sentiva|pensava|capiva|ricordava|felt|thought|realized|remembered)\b/i.test(p)).length;
  const action = paragraphs.filter(p => /\b(prese|aprì|guardò|camminò|chiuse|toccò|moved|opened|looked|walked)\b/i.test(p)).length;
  const questions = (text.match(/\?/g) || []).length;

  if (paragraphs.length > 4 && introspective > action + 3) {
    signals.push({ id: "too_introspective", score: 46, message: "Troppa introspezione rispetto ad azione, gesto o scena." });
  }

  if (questions === 0 && /thriller|mystery|crime|romance|dark/i.test([ctx.genre, ctx.bookTypeId].join(" "))) {
    signals.push({ id: "low_curiosity_residue", score: 54, message: "Manca residuo di curiosità o tensione aperta." });
  }

  const score = Math.max(35, 94 - signals.length * 14);

  return {
    score,
    signals,
    directives: [
      "Alternate tension, gesture, silence, reveal, decision, and new friction.",
      "Do not let emotional energy stay flat for more than two paragraphs.",
      "After a payoff, introduce cost, consequence, or a sharper question.",
    ],
  };
}
