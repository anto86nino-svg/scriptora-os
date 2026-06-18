import { runNarrativeIntelligenceDirector } from "@/lib/writing-engine-v13/narrative-intelligence-director";
import { resolveBookTypeDefinition } from "@/lib/book-type-engine";
import type { BookConfig } from "@/types/book";
import type { ConstitutionWarning, NarrativeDirectorV2Result } from "./types";

export function runNarrativeDirectorV2(
  text: string,
  config: BookConfig,
): NarrativeDirectorV2Result {
  const family = resolveBookTypeDefinition(
    config.genre,
    config.subcategory,
    config.subgenre,
    config.bookTypeId,
  ).family;
  const base = runNarrativeIntelligenceDirector(text, { family, genre: config.genre });
  const warnings: ConstitutionWarning[] = base.signals.map((s) => ({
    ruleId: "story_momentum",
    severity: s.score < 50 ? "warning" as const : "info" as const,
    message: s.message,
  }));

  const lower = text.toLowerCase();
  const tooCollaborative = (lower.match(/\b(va bene|d'accordo|capisco|certo|okay|sure|I agree)\b/g) || []).length;
  if (tooCollaborative > 5) {
    warnings.push({
      ruleId: "consequence_chain",
      severity: "warning",
      message: "Personaggi troppo collaborativi — poca frizione.",
      suggestion: "Aggiungi resistenza, sottotesto o obiettivi in conflitto.",
    });
  }

  const earlyResolution = /\b(tutto risolto|finalmente pace|happy ending|problem solved)\b/i.test(text);
  const arcPosition = config.numberOfChapters > 1 ? 0.5 : 1;
  if (earlyResolution && arcPosition < 0.75) {
    warnings.push({
      ruleId: "payoff_engine",
      severity: "warning",
      message: "Payoff o risoluzione prematura.",
    });
  }

  const flatRhythm = text.split(/\n{2,}/).filter((p) => p.length > 80).length < 3;
  if (flatRhythm && text.split(/\s+/).length > 250) {
    warnings.push({
      ruleId: "story_momentum",
      severity: "info",
      message: "Ritmo piatto — poche variazioni di scena.",
    });
  }

  return {
    score: base.score,
    warnings,
    directives: base.directives,
  };
}

export function buildNarrativeDirectorV2Block(config: BookConfig): string {
  return `NARRATIVE DIRECTOR V2 (invisible governance):
- No static scenes, premature payoffs, or flat escalation.
- Every chapter changes state: tension, knowledge, relationship, or decision.
- Characters resist change until cost forces movement.
Genre family: ${resolveBookTypeDefinition(config.genre, config.subcategory, config.subgenre, config.bookTypeId).family}`;
}
