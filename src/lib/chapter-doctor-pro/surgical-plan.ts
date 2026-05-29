import { analyzeNovel } from "@/lib/EditorialIntelligence";
import { evaluateBestsellerChapter } from "@/lib/bestseller-intelligence";
import { WRITING_BRAINS } from "@/lib/book-intelligence/brains";
import { SURGICAL_EDIT_V1_ACTION_SET } from "@/lib/surgical-edit-engine/constants";
import type { BookProject } from "@/types/book";
import type { SurgicalInterventionPlan } from "./types";

function openingWords(text: string, max = 120): string {
  return text.split(/\s+/).slice(0, max).join(" ");
}

function endingChars(text: string, max = 320): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(-max);
}

function genreDirectives(brainId?: string): string[] {
  if (!brainId) return [];
  const brain = WRITING_BRAINS[brainId as keyof typeof WRITING_BRAINS];
  if (!brain) return [];

  if (brain.domain === "nonfiction") {
    if (/horticultural|manual|practical/.test(brainId)) {
      return [
        "Prioritize clarity, practical progression, troubleshooting, and usefulness.",
        "Cut motivational fluff; keep actionable specificity.",
      ];
    }
    if (/self-help/.test(brainId)) {
      return [
        "Strengthen emotional transformation arc and relatable authority.",
        "Replace generic advice with credible, specific insight.",
      ];
    }
    return ["Reinforce genre utility, authority, and reader payoff."];
  }

  if (/dark-romance|romance/.test(brainId)) {
    return [
      "Preserve attraction delay, yearning, possessive psychology, and tension.",
      "Never resolve emotional friction too early.",
    ];
  }
  if (/thriller|crime|mystery/.test(brainId)) {
    return ["Escalate paranoia and pacing.", "Delay payoff; sharpen escalation beats."];
  }
  if (/psychological|literary/.test(brainId)) {
    return ["Increase subtext and behavioral ambiguity.", "Reduce explicit emotional statements."];
  }

  return [`Apply ${brain.label} commercial structure: ${brain.bestsellerMode}.`];
}

export function planSurgicalInterventions(input: {
  chapterText: string;
  project: BookProject;
  chapterIndex: number;
}): SurgicalInterventionPlan[] {
  const { chapterText, project, chapterIndex } = input;
  const text = String(chapterText || "").trim();
  if (!text) return [];

  const report = analyzeNovel(text);
  const bestseller = evaluateBestsellerChapter({
    content: text,
    chapterIndex,
    totalChapters: project.chapters.length,
    chapterTitle: project.chapters[chapterIndex]?.title,
    genre: project.config.genre,
    bookIntelligence: project.config.bookIntelligence,
  });

  const plans: SurgicalInterventionPlan[] = [];
  const warningTypes = new Set(report.warnings.map(w => w.type));
  const brainId = project.config.bookIntelligence?.layers?.writingBrainId;

  if (bestseller.scores.hookStrength < 62) {
    plans.push({
      id: "hook-strengthening",
      label: "Hook Strengthening",
      priority: "high",
      directive: `First ~120 words: increase intrigue without changing POV/voice. Opening sample: "${openingWords(text, 40)}…"`,
      detectedReason: "Opening hook under commercial threshold",
    });
  }

  if (
    report.dialogueHumanityScore < 72 ||
    warningTypes.has("dialogue_perfection")
  ) {
    plans.push({
      id: "dialogue-roughening",
      label: "Dialogue Roughening",
      priority: "high",
      directive: "Add interruption, hesitation, contradiction, imperfect speech. No therapy-dialogue.",
      detectedReason: "Dialogue reads too polished or emotionally resolved",
    });
  }

  if (
    report.emotionalRedundancyScore < 72 ||
    warningTypes.has("emotional_redundancy")
  ) {
    plans.push({
      id: "emotional-compression",
      label: "Emotional Compression",
      priority: "high",
      directive: "Replace telling with body language, distance, micro-actions. Same meaning, less explanation.",
      detectedReason: "Overexplained emotion detected",
    });
  }

  if (report.subtextScore < 70 || warningTypes.has("weak_subtext")) {
    plans.push({
      id: "subtext-injection",
      label: "Subtext Injection",
      priority: "medium",
      directive: "Layer hidden meaning; reduce explicit emotional statements.",
      detectedReason: "Subtext strength below target",
    });
  }

  if (
    warningTypes.has("climax_oversaturation") ||
    bestseller.scores.emotionalMomentum < 58
  ) {
    plans.push({
      id: "tension-preservation",
      label: "Tension Preservation",
      priority: "medium",
      directive: "Delay emotional payoff; preserve friction, desire, push/pull.",
      detectedReason: "Premature resolution or collapsed conflict",
    });
  }

  if (/romance|dark-romance/.test(String(brainId || project.config.genre)) && bestseller.scores.bingeability < 65) {
    plans.push({
      id: "slow-burn-tension",
      label: "Slow Burn Tension",
      priority: "high",
      directive: "Increase unresolved emotional friction. Delay reassurance, availability, and explicit confession.",
      detectedReason: "Romance slow-burn tension under threshold",
    });
  }

  if (
    warningTypes.has("overwritten_scene") ||
    (chapterIndex === project.chapters.length - 1 && bestseller.scores.hookStrength > 70 && report.subtextScore < 65)
  ) {
    plans.push({
      id: "ending-compression",
      label: "Ending Compression",
      priority: "medium",
      directive: "Trim overwritten closure. Preserve impact through implication, not explanation.",
      detectedReason: "Ending resolves or explains too much",
    });
  }

  if (
    report.pacingConsistencyScore < 72 ||
    warningTypes.has("overwritten_scene") ||
    warningTypes.has("repetitive_symbolism") ||
    bestseller.scores.commercialPacing < 60
  ) {
    plans.push({
      id: "pacing-compression",
      label: "Pacing Compression",
      priority: "medium",
      directive: "Compress repetition and drag; increase forward momentum.",
      detectedReason: "Pacing or repetition risk",
    });
  }

  if (bestseller.scores.bingeability < 62 || warningTypes.has("overwritten_scene")) {
    plans.push({
      id: "cliffhanger-optimization",
      label: "Cliffhanger Optimization",
      priority: "medium",
      directive: `Sharpen chapter close without new plot. Ending sample: "…${endingChars(text, 80)}"`,
      detectedReason: "Weak forward pull at chapter end",
    });
  }

  const genreNotes = genreDirectives(brainId);
  if (genreNotes.length > 0) {
    plans.push({
      id: "genre-specific",
      label: "Genre-Specific Editing",
      priority: "low",
      directive: genreNotes.join(" "),
      detectedReason: `Brain-aware editing (${brainId || project.config.genre})`,
    });
  }

  const priorityRank = { high: 0, medium: 1, low: 2 };
  return plans.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]).slice(0, 6);
}

/** V1 — five surgical actions only */
export function planSurgicalInterventionsV1(input: {
  chapterText: string;
  project: BookProject;
  chapterIndex: number;
}): SurgicalInterventionPlan[] {
  return planSurgicalInterventions(input).filter((plan) => SURGICAL_EDIT_V1_ACTION_SET.has(plan.id));
}

export function buildSurgicalEditDirectiveBlock(input: {
  chapterText: string;
  project: BookProject;
  chapterIndex: number;
}): string {
  const plans = planSurgicalInterventionsV1(input);
  if (plans.length === 0) {
    return [
      "SURGICAL EDIT ENGINE V1 — DEVELOPMENTAL EDITOR DIRECTIVES",
      "Improve what the author wrote. Never rewrite the chapter.",
      "Apply at most one precision move: dialogue friction, emotional show-don't-tell, pacing trim, or ending compression.",
      "Max 25% modification. Preserve author voice, POV, canon, Story Bible.",
    ].join("\n");
  }

  const lines = [
    "SURGICAL EDIT ENGINE V1 — DEVELOPMENTAL EDITOR DIRECTIVES",
    "TARGETED INTERVENTIONS ONLY. Max 25% modification per chapter.",
    "Improve what the author wrote — do NOT replace the chapter.",
    "Preserve author voice, POV, canon, character memory, and Story Bible.",
    "Never regenerate. Never rewrite whole paragraphs unless unavoidable for a single surgical fix.",
    "",
    ...plans.map(
      (p, i) =>
        `${i + 1}. [${p.label}] (${p.priority})\n   Detected: ${p.detectedReason}\n   Directive: ${p.directive}`,
    ),
  ];

  return lines.join("\n");
}
