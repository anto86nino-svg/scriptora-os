import type { V13Context, V13Result, V13Signal } from "./types";

export function runTruthOfGenreEngine(text: string, ctx: V13Context = {}): V13Result {
  const signals: V13Signal[] = [];
  const g = [ctx.genre, ctx.bookTypeId, ctx.family].join(" ").toLowerCase();

  if (/dark-romance/.test(g) && !/\b(potere|pericolo|controllo|proibito|rischio|gelosia|danger|forbidden|control)\b/i.test(text)) {
    signals.push({ id: "weak_dark_romance_truth", score: 52, message: "Dark romance senza sufficiente frizione morale/potere/pericolo." });
  }

  if (/thriller|crime|mystery/.test(g) && !/\b(indizio|minaccia|sospetto|segreto|rischio|clue|threat|secret|suspect)\b/i.test(text)) {
    signals.push({ id: "weak_thriller_truth", score: 50, message: "Thriller/crime senza indizio, minaccia o pressione investigativa percepibile." });
  }

  if (/self-help|nonfiction|manual/.test(g) && !/\b(esercizio|passo|strumento|metodo|checklist|framework|azione|step|method)\b/i.test(text)) {
    signals.push({ id: "weak_practical_value", score: 48, message: "Nonfiction/manuale senza abbastanza valore pratico applicabile." });
  }

  if (/history|storia|biography|memoir/.test(g) && !/\b(epoca|luogo|contesto|dettaglio|memoria|città|era|place|texture)\b/i.test(text)) {
    signals.push({ id: "weak_context_texture", score: 56, message: "Libro storico/memoir con poca texture concreta del contesto." });
  }

  return {
    score: Math.max(35, 94 - signals.length * 14),
    signals,
    directives: [
      "Honor the true promise of the genre, not just its label.",
      "Genre must shape scene pressure, examples, rhythm, reader expectation, and payoff.",
    ],
  };
}
