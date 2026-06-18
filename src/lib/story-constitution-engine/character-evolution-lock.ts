import type { BookCharacter, BookConfig } from "@/types/book";
import type { ConstitutionWarning } from "./types";

export function evaluateCharacterEvolutionLock(
  text: string,
  config: BookConfig,
  chapterIndex: number,
): ConstitutionWarning[] {
  const warnings: ConstitutionWarning[] = [];
  const characters = Array.isArray(config.characters) ? config.characters : [];
  const protagonist = characters.find((c) => /protagon/i.test(c.role || "")) || characters[0];
  if (!protagonist?.name) return warnings;

  const namePattern = new RegExp(
    `\\b${protagonist.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "i",
  );
  if (!namePattern.test(text) && chapterIndex > 0) {
    warnings.push({
      ruleId: "character_evolution",
      severity: "warning",
      message: `Protagonista «${protagonist.name}» assente nel capitolo.`,
    });
  }

  const drift = detectCharacterTruthDrift(text, protagonist);
  warnings.push(...drift);

  return warnings;
}

function detectCharacterTruthDrift(text: string, character: BookCharacter): ConstitutionWarning[] {
  const warnings: ConstitutionWarning[] = [];
  const lower = text.toLowerCase();

  if (character.personalLanguage && character.emotionalTriggers) {
    const trigger = character.emotionalTriggers.toLowerCase().slice(0, 12);
    if (trigger.length >= 5 && lower.includes(trigger)) {
      const tooCalm = /\b(va tutto bene|non importa|tranquill[oa]|it's fine|I'm okay)\b/i.test(text);
      if (tooCalm) {
        warnings.push({
          ruleId: "character_truth",
          severity: "warning",
          message: `«${character.name}» reagisce in modo troppo calmo rispetto ai trigger definiti.`,
          suggestion: "Mostra difese, evitamento o reazione corporea coerente con la ferita.",
        });
      }
    }
  }

  return warnings;
}

export function buildCharacterEvolutionLockBlock(config: BookConfig): string {
  const characters = Array.isArray(config.characters) ? config.characters : [];
  if (!characters.length) return "";

  const lines = characters.slice(0, 6).map((c) => {
    const name = c.name || "Character";
    return `- ${name}: wound=${c.wound || "—"} | desire=${c.externalDesire || "—"} | fear=${c.vulnerability || c.secret || "—"} | voice=${c.personalLanguage || "—"}`;
  });

  return `CHARACTER EVOLUTION LOCK:
Track initial wound/desire/fear. Allow evolution or regression — never stasis without cause.
${lines.join("\n")}`;
}
