import type { BookConfig } from "@/types/book";
import {
  detectStaleBeatLoop,
  extractBeatClustersFromText,
} from "@/lib/premium-writing/narrative-beat-engine";
import { scoreSceneProgression } from "@/lib/premium-writing/scene-purpose-validator";
import type { ConstitutionWarning, StoryConstitutionContext, StoryConstitutionRuleId } from "./types";
import type { SCEPhaseConfig } from "./phases";

const PURPOSE_SIGNALS: RegExp[] = [
  /\b(improvvisamente|all'improvviso|quando|dopo|prima che|scoprì|realizzò|capì che)\b/i,
  /\b(ma|però|tuttavia|invece|nonostante)\b/i,
  /\b(disse|chiese|risposte|mentì|confessò|svanì|partì|arrivò)\b/i,
  /\b(suddenly|when|after|before|realized|discovered|but|however|said|asked|left|arrived)\b/i,
];

function scoreParagraphPurpose(paragraph: string): number {
  const signals = PURPOSE_SIGNALS.filter((p) => p.test(paragraph)).length;
  return signals >= 2 ? 72 : signals === 1 ? 52 : 38;
}

function isItalian(language?: string): boolean {
  return (language || "Italian").toLowerCase().startsWith("it");
}

/** RULE 5 — compress duplicate beats and sentences vs prior chapters */
export function applyAntiRepetitionIntervention(text: string, priorText: string): string {
  if (!text.trim() || !priorText.trim()) return text;
  if (!detectStaleBeatLoop(text, priorText)) return text;

  const priorClusters = new Set(extractBeatClustersFromText(priorText));
  const paragraphs = text.split(/\n{2,}/);
  const filtered = paragraphs.filter((p) => {
    const clusters = extractBeatClustersFromText(p);
    const overlap = clusters.filter((c) => priorClusters.has(c));
    return overlap.length === 0 || clusters.length > overlap.length;
  });

  let result =
    filtered.length > 0 && filtered.length < paragraphs.length
      ? filtered.join("\n\n")
      : text;

  const priorLower = priorText.toLowerCase();
  const sentences = result.split(/(?<=[.!?…])\s+/);
  const seen = new Set<string>();
  const kept = sentences.filter((s) => {
    const norm = s.trim().toLowerCase().slice(0, 90);
    if (norm.length < 18) return true;
    if (priorLower.includes(norm)) return false;
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });

  if (kept.length > 0 && kept.length < sentences.length) {
    result = kept.join(" ");
  }
  return result.trim();
}

/** RULE 4 — normalize canonical character name spelling */
export function applyCanonConsistencyIntervention(text: string, config: BookConfig): string {
  let result = text;
  for (const char of config.characters || []) {
    const name = char.name?.trim();
    if (!name || name.length < 3) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const lowerVariant = new RegExp(`\\b${escaped.charAt(0).toLowerCase()}${escaped.slice(1)}\\b`, "g");
    result = result.replace(lowerVariant, name);
  }
  return result;
}

/** RULE 9 — drop paragraphs with no narrative function */
export function applyDeadSceneRemoval(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  if (paragraphs.length <= 1) return text;

  const kept = paragraphs.filter((p) => {
    const trimmed = p.trim();
    if (trimmed.length < 40) return true;
    return scoreParagraphPurpose(trimmed) >= 48 || scoreSceneProgression(trimmed) >= 48;
  });

  if (kept.length === 0 || kept.length === paragraphs.length) return text;
  return kept.join("\n\n").trim();
}

/** Phase 3 — reader retention hook when chapter lacks page-turn */
export function applyReaderSimulationOptimization(text: string, language?: string): string {
  const tail = text.slice(-500);
  const hasHook =
    /\?/.test(tail) ||
    /\b(mistero|segreto|domani|prima che|ancora|mystery|secret|before|still)\b/i.test(tail);
  if (hasHook) return text;

  const hook = isItalian(language)
    ? "Qualcosa stava per cambiare — e lui lo sentiva prima ancora di capirlo."
    : "Something was about to shift — he felt it before he could name it.";
  return `${text.trimEnd()}\n\n${hook}`;
}

/** Phase 3 — weave open promise when critical payoff is absent */
export function applyPayoffOptimization(
  text: string,
  ctx: StoryConstitutionContext,
): string {
  const graph = ctx.memoryGraph;
  if (!graph?.promises?.length) return text;

  const stale = graph.promises.find(
    (p) =>
      (p.status === "open" || p.status === "partial") &&
      p.importance === "critical" &&
      ctx.chapterIndex - p.introducedIn > 4,
  );
  if (!stale) return text;

  const fragment = stale.description.slice(0, 24).toLowerCase();
  if (fragment.length >= 6 && text.toLowerCase().includes(fragment)) return text;

  const line = isItalian(ctx.config.language)
    ? `La domanda su ${stale.label.toLowerCase()} non aveva ancora risposta.`
    : `The question of ${stale.label.toLowerCase()} still had no answer.`;
  return `${text.trimEnd()}\n\n${line}`;
}

/** Phase 3 — forward motion when chapter reads static */
export function applyStoryMomentumOptimization(text: string, language?: string): string {
  const hasMotion =
    /\b(decise|capì|scelse|scoprì|realized|decided|discovered|chose)\b/i.test(text) &&
    /\b(ma|però|rischio|ostacolo|but|risk|obstacle)\b/i.test(text);
  if (hasMotion) return text;

  const line = isItalian(language)
    ? "Da quel momento, ogni scelta avrebbe avuto un prezzo."
    : "From that moment on, every choice would carry a cost.";
  const paragraphs = text.split(/\n{2,}/);
  if (paragraphs.length <= 1) return `${text.trimEnd()}\n\n${line}`;
  paragraphs.splice(Math.max(0, paragraphs.length - 1), 0, line);
  return paragraphs.join("\n\n").trim();
}

/** Phase 3 — late-book pull toward planned ending */
export function applyEndingDestinationOptimization(text: string, ctx: StoryConstitutionContext): string {
  const arch = ctx.config.forgeStoryArchitecture?.trim();
  const ending =
    arch?.match(/Finale[^:\n]*[:\—–-]\s*([^\n]+)/i)?.[1]?.trim() ||
    ctx.blueprint?.emotionalArc?.trim();
  if (!ending) return text;

  const total = Math.max(1, ctx.config.numberOfChapters);
  if (ctx.chapterIndex < Math.floor(total * 0.45)) return text;

  const keywords = ending
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w.length > 5)
    .slice(0, 4);
  if (keywords.some((k) => text.toLowerCase().includes(k.toLowerCase()))) return text;

  const line = isItalian(ctx.config.language)
    ? "La strada che aveva davanti puntava verso un finale che non poteva più evitare."
    : "The road ahead pointed toward an ending he could no longer avoid.";
  return `${text.trimEnd()}\n\n${line}`;
}

export function applySCEAutoInterventions(
  text: string,
  ctx: StoryConstitutionContext,
  phaseConfig: SCEPhaseConfig,
  warnings: ConstitutionWarning[],
): { text: string; interventionsApplied: StoryConstitutionRuleId[]; optimizationsApplied: StoryConstitutionRuleId[] } {
  if (phaseConfig.measureOnly) {
    return { text, interventionsApplied: [], optimizationsApplied: [] };
  }

  const warningRules = new Set(warnings.map((w) => w.ruleId));
  const priorText = ctx.priorText || ctx.previousChapters.map((c) => c.content).join("\n");
  let result = text;
  const interventionsApplied: StoryConstitutionRuleId[] = [];
  const optimizationsApplied: StoryConstitutionRuleId[] = [];

  const hasWarning = (rule: StoryConstitutionRuleId) => warningRules.has(rule);

  if (phaseConfig.autoInterventionRules.includes("anti_repetition") && hasWarning("anti_repetition")) {
    const next = applyAntiRepetitionIntervention(result, priorText);
    if (next !== result) {
      result = next;
      interventionsApplied.push("anti_repetition");
    }
  }

  if (phaseConfig.autoInterventionRules.includes("canon_supremacy") && hasWarning("canon_supremacy")) {
    const next = applyCanonConsistencyIntervention(result, ctx.config);
    if (next !== result) {
      result = next;
      interventionsApplied.push("canon_supremacy");
    }
  }

  if (phaseConfig.autoInterventionRules.includes("remove_dead_scenes") && hasWarning("remove_dead_scenes")) {
    const next = applyDeadSceneRemoval(result);
    if (next !== result) {
      result = next;
      interventionsApplied.push("remove_dead_scenes");
    }
  }

  if (
    phaseConfig.narrativeOptimizationRules.includes("reader_attention") &&
    (hasWarning("reader_attention") || hasWarning("page_turn_check"))
  ) {
    const next = applyReaderSimulationOptimization(result, ctx.config.language);
    if (next !== result) {
      result = next;
      optimizationsApplied.push("reader_attention");
    }
  }

  if (phaseConfig.narrativeOptimizationRules.includes("payoff_engine") && hasWarning("payoff_engine")) {
    const next = applyPayoffOptimization(result, ctx);
    if (next !== result) {
      result = next;
      optimizationsApplied.push("payoff_engine");
    }
  }

  if (phaseConfig.narrativeOptimizationRules.includes("story_momentum") && hasWarning("story_momentum")) {
    const next = applyStoryMomentumOptimization(result, ctx.config.language);
    if (next !== result) {
      result = next;
      optimizationsApplied.push("story_momentum");
    }
  }

  if (phaseConfig.narrativeOptimizationRules.includes("ending_destination_lock")) {
    const next = applyEndingDestinationOptimization(result, ctx);
    if (next !== result) {
      result = next;
      optimizationsApplied.push("ending_destination_lock");
    }
  }

  return { text: result, interventionsApplied, optimizationsApplied };
}
