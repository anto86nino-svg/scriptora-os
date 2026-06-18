import type { StoryConstitutionContext, ConstitutionWarning } from "./types";
import { scoreSceneProgression } from "@/lib/premium-writing/scene-purpose-validator";
import { scoreEmotionalRepetition, detectStaleBeatLoop } from "@/lib/premium-writing/narrative-beat-engine";
import { evaluateGenreTruthLock } from "./genre-truth-lock";
import { evaluatePayoffEngine } from "./payoff-engine";
import { evaluateCharacterEvolutionLock } from "./character-evolution-lock";

function hasConflict(text: string): boolean {
  return /\b(ma|però|tuttavia|contro|ostacolo|paura|rischio|but|however|against|conflict|risk)\b/i.test(text);
}

function hasChange(text: string): boolean {
  return /\b(capì|decise|scelse|cambiò|realized|decided|changed|discovered|imparò|learned)\b/i.test(text);
}

function hasObjective(text: string, summary?: string): boolean {
  return Boolean(summary?.trim()) || /\b(voleva|doveva|decise di|needed to|wanted to|must)\b/i.test(text);
}

/** RULE 1 — Scene purpose lock */
function ruleScenePurpose(text: string, summary?: string): ConstitutionWarning[] {
  const warnings: ConstitutionWarning[] = [];
  const objective = hasObjective(text, summary);
  const conflict = hasConflict(text);
  const change = hasChange(text);
  const missing = [!objective && "obiettivo", !conflict && "conflitto", !change && "cambiamento"].filter(Boolean);
  if (missing.length >= 2) {
    warnings.push({
      ruleId: "scene_purpose_lock",
      severity: "warning",
      message: `Scena senza ${missing.join(", ")} sufficiente.`,
      suggestion: "Ogni scena deve cambiare qualcosa con attrito.",
    });
  }
  return warnings;
}

/** RULE 2 — Consequence chain */
function ruleConsequenceChain(text: string): ConstitutionWarning[] {
  const hasEvent = /\b(improvvisamente|quando|dopo|then|when|after|suddenly)\b/i.test(text);
  const hasReaction = /\b(reagì|tremò|si fermò|replied|froze|gasped|paled)\b/i.test(text);
  if (hasEvent && !hasReaction && text.split(/\s+/).length > 150) {
    return [{
      ruleId: "consequence_chain",
      severity: "info",
      message: "Evento senza reazione osservabile sufficiente.",
      suggestion: "Evento → conseguenza → reazione → nuova scelta.",
    }];
  }
  return [];
}

/** RULE 5 — Anti repetition */
function ruleAntiRepetition(text: string, priorText: string): ConstitutionWarning[] {
  const warnings: ConstitutionWarning[] = [];
  if (detectStaleBeatLoop(text, priorText)) {
    warnings.push({
      ruleId: "anti_repetition",
      severity: "warning",
      message: "Beat emotivo duplicato rispetto ai capitoli precedenti.",
      suggestion: "Comprimi, sostituisci o elimina la ripetizione.",
    });
  }
  if (scoreEmotionalRepetition(text, priorText) < 52) {
    warnings.push({
      ruleId: "anti_repetition",
      severity: "warning",
      message: "Ripetizione emotiva elevata.",
    });
  }
  return warnings;
}

/** RULE 6 — Emotional truth */
function ruleEmotionalTruth(text: string): ConstitutionWarning[] {
  const tellDensity = (text.match(/\b(sentì|pensò|era triste|capì che|felt|was sad|realized that)\b/gi) || []).length;
  const showDensity = (text.match(/\b(mani|sguardo|silenzio|passo|trem|hands|eyes|paused|stepped)\b/gi) || []).length;
  if (tellDensity > showDensity + 4 && tellDensity > 6) {
    return [{
      ruleId: "emotional_truth",
      severity: "info",
      message: "Troppe spiegazioni emotive rispetto a comportamento osservabile.",
      suggestion: "Mostra prima di spiegare.",
    }];
  }
  return [];
}

/** RULE 7 — Page turn */
function rulePageTurn(text: string): ConstitutionWarning[] {
  const signals =
    (text.match(/\?/g) || []).length +
    (text.match(/\b(mistero|segreto|domani|prima che|mystery|secret|before|tomorrow)\b/gi) || []).length;
  if (signals < 1 && text.split(/\s+/).length > 200) {
    return [{
      ruleId: "page_turn_check",
      severity: "warning",
      message: "Capitolo senza curiosità/tensione/domanda aperta evidente.",
      suggestion: "Aggiungi page-turn: rischio, mistero o promessa.",
    }];
  }
  return [];
}

/** RULE 9 — Dead scenes */
function ruleDeadScenes(text: string): ConstitutionWarning[] {
  const progression = scoreSceneProgression(text);
  if (progression < 48) {
    return [{
      ruleId: "remove_dead_scenes",
      severity: "warning",
      message: "Scene a basso impatto — il libro potrebbe non cambiare.",
      suggestion: "Taglia filler o converti in azione con conseguenza.",
    }];
  }
  return [];
}

/** RULE 10 — Story momentum */
function ruleStoryMomentum(text: string, summary?: string): ConstitutionWarning[] {
  const advancesPlot = hasChange(text) || hasConflict(text);
  const deepensCharacter = /\b(ferita|paura|desiderio|wound|fear|desire)\b/i.test(text);
  if (!advancesPlot && !deepensCharacter && text.split(/\s+/).length > 180) {
    return [{
      ruleId: "story_momentum",
      severity: "warning",
      message: "Capitolo statico — né trama né personaggio avanzano.",
    }];
  }
  if (!summary?.trim() && text.split(/\s+/).length > 100) {
    return [{
      ruleId: "story_momentum",
      severity: "info",
      message: "Blueprint summary assente — difficile verificare direzione.",
    }];
  }
  return [];
}

/** RULE 4 — Canon supremacy (light heuristic on names) */
function ruleCanonSupremacy(text: string, ctx: StoryConstitutionContext): ConstitutionWarning[] {
  const warnings: ConstitutionWarning[] = [];
  const bible = (ctx.config.characterBibleText || "").toLowerCase();
  const names = (ctx.config.characters || []).map((c) => c.name?.toLowerCase()).filter((n): n is string => Boolean(n && n.length >= 3));
  if (!names.length || !bible) return warnings;

  for (const name of names) {
    if (bible.includes(name) && !text.toLowerCase().includes(name)) {
      const altPresent = names.some((n) => n !== name && text.toLowerCase().includes(n));
      if (altPresent) {
        warnings.push({
          ruleId: "canon_supremacy",
          severity: "warning",
          message: "Possibile drift nomi rispetto al cast canon.",
        });
        break;
      }
    }
  }
  return warnings;
}

/** RULE 14 — Ending destination */
function ruleEndingDestination(ctx: StoryConstitutionContext): ConstitutionWarning[] {
  const arch = ctx.config.forgeStoryArchitecture?.trim();
  const ending =
    arch?.match(/Finale[^:\n]*[:\—–-]\s*([^\n]+)/i)?.[1]?.trim() ||
    arch?.match(/ending[^:\n]*[:\—–-]\s*([^\n]+)/i)?.[1]?.trim() ||
    ctx.blueprint?.emotionalArc?.trim();
  if (!ending) return [];
  return [{
    ruleId: "ending_destination_lock",
    severity: "info",
    message: `Destinazione finale: ${ending.slice(0, 120)}`,
    suggestion: "Ogni capitolo deve avvicinare a questo finale, non allontanare.",
  }];
}

export function evaluateStoryConstitutionRules(
  text: string,
  ctx: StoryConstitutionContext,
): ConstitutionWarning[] {
  const prior = ctx.priorText || ctx.previousChapters.map((c) => c.content).join("\n");
  return [
    ...ruleScenePurpose(text, ctx.outlineSummary),
    ...ruleConsequenceChain(text),
    ...ruleCanonSupremacy(text, ctx),
    ...ruleAntiRepetition(text, prior),
    ...ruleEmotionalTruth(text),
    ...rulePageTurn(text),
    ...ruleDeadScenes(text),
    ...ruleStoryMomentum(text, ctx.outlineSummary),
    ...evaluateCharacterEvolutionLock(text, ctx.config, ctx.chapterIndex),
    ...evaluatePayoffEngine(text, ctx.memoryGraph, ctx.chapterIndex),
    ...evaluateGenreTruthLock(text, ctx.config),
    ...ruleEndingDestination(ctx),
  ];
}
