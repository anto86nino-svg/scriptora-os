import type { V13Context, V13Result, V13Signal } from "./types";

export function runNarrativeIntelligenceDirector(text: string, ctx: V13Context = {}): V13Result {
  const signals: V13Signal[] = [];
  const normalized = text.toLowerCase();

  const hasConsequence = /\b(per questo|da quel momento|decise|capì|scelse|conseguenza|therefore|decided|because of this)\b/i.test(text);
  const hasConflict = /\b(ma|però|tuttavia|contro|ostacolo|paura|rischio|but|however|risk|conflict)\b/i.test(text);
  const hasForwardMotion = /\b(adesso|poi|dopo|quindi|next|then|after)\b/i.test(text);

  if (!hasConsequence) signals.push({ id: "weak_consequence", score: 48, message: "Il capitolo rischia di non cambiare abbastanza lo stato del libro." });
  if (!hasConflict) signals.push({ id: "weak_conflict", score: 52, message: "Serve più attrito, opposizione o pressione narrativa/argomentativa." });
  if (!hasForwardMotion) signals.push({ id: "weak_motion", score: 58, message: "La progressione può sembrare statica." });

  const repeatedFinally = (normalized.match(/\bfinalmente\b/g) || []).length;
  if (repeatedFinally > 2) signals.push({ id: "too_much_resolution", score: 50, message: "Troppa sensazione di chiusura emotiva anticipata." });

  const score = Math.max(35, 92 - signals.length * 12);

  return {
    score,
    signals,
    directives: [
      "Every chapter must change something: knowledge, tension, decision, relationship, method, or reader capability.",
      "Avoid beautiful but static pages. Every section must create consequence.",
      ctx.family === "nonfiction"
        ? "For nonfiction: each section must advance the reader from confusion to usable clarity."
        : "For narrative: every scene needs desire, obstacle, friction, surprise, and consequence.",
    ],
  };
}
