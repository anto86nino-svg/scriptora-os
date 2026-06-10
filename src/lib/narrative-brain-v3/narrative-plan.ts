import type { BookConfig } from "@/types/book";
import { detectBookIntelligence } from "@/lib/book-intelligence";
import { buildAuthorStyleFromPro, defaultBestsellerProConfig } from "@/lib/bestseller-pro-config";
import type { NarrativeGenerationPlan } from "./types";

function genreSlug(genre?: string): string {
  return String(genre || "fiction").toLowerCase().replace(/\s+/g, "-");
}

export function buildNarrativeGenerationPlan(config: BookConfig): NarrativeGenerationPlan {
  const intel = detectBookIntelligence({
    idea: config.subtitle || config.title,
    genre: config.genre,
    subcategory: config.subcategory,
    tone: config.tone,
    language: config.language,
  });

  const g = genreSlug(config.genre);
  const sub = String(config.subcategory || intel.subcategory || intel.report.layers.subgenre || "").toLowerCase();
  const pro = defaultBestsellerProConfig(config.genre);
  const authorDna = [config.authorStyle, config.tone, buildAuthorStyleFromPro(pro)].filter(Boolean).join("; ");

  const base: NarrativeGenerationPlan = {
    genre: intel.resolvedGenre || config.genre,
    subgenre: sub || intel.report.layers.subgenre,
    targetReader: intel.report.layers.readerExpectations[0] || config.tone || "engaged adult readers",
    marketplaceLane: intel.report.layers.commercialStructure || "commercial fiction",
    toneDirective: authorDna || intel.report.tone,
    narrativePromise: config.subtitle || intel.report.layers.archetype || "deliver the genre promise with emotional cost",
    tensionLevel: "moderate",
    pacingDirective: "balanced escalation — each scene advances plot or deepens character",
    dialogueDirective: "distinct voices — no therapist-speak, no identical cadence",
    subtextLevel: "balanced",
    forbiddenPatterns: [
      "Therapist-style emotional clarity in dialogue",
      "Instant mutual understanding under conflict",
      "Named feelings resolved in one paragraph",
      "Prompt leakage, UI text, debug labels",
    ],
    mandatoryPatterns: [
      "Each scene has a clear objective and obstacle",
      "Characters contradict themselves at least once under pressure",
      "Show emotion through gesture, silence, or deflection before naming it",
    ],
    hookStrengthTarget: 72,
    curiosityDensityTarget: 65,
  };

  if (/dark-romance|dark.?romance/.test(g)) {
    return {
      ...base,
      tensionLevel: "extreme",
      pacingDirective: "slow-burn attraction, delayed trust, sharp dialogue, vulnerability earned late",
      dialogueDirective: "sharp, subtext-heavy, push-pull — desire before safety",
      subtextLevel: "heavy",
      romanceRules: [
        "Attraction immediate — trust never immediate",
        "Vulnerability costs something every time",
        "Healing is partial, never complete in one scene",
        "Power imbalance and moral grey stay visible",
      ],
      forbiddenPatterns: [
        ...base.forbiddenPatterns,
        "Instant 'I love you' without fear cost",
        "Emotional healing in a single conversation",
        "Both characters emotionally available at the same speed",
      ],
      hookStrengthTarget: 78,
      curiosityDensityTarget: 70,
    };
  }

  if (/romance|romantasy/.test(g)) {
    return {
      ...base,
      tensionLevel: "high",
      pacingDirective: "attrito prima della tenerezza — payoff ritardati",
      dialogueDirective: "natural but guarded — each character protects a wound",
      subtextLevel: "heavy",
      romanceRules: [
        "Desire and frustration coexist",
        "Confession never arrives clean on first attempt",
        "Physical proximity ≠ emotional safety",
      ],
      forbiddenPatterns: [
        ...base.forbiddenPatterns,
        "Love confession without prior resistance",
        "Couple resolves core wound in one chapter",
      ],
    };
  }

  if (/thriller|crime|mystery|noir|suspense/.test(g)) {
    return {
      ...base,
      tensionLevel: "high",
      pacingDirective: "information progression — each scene reveals or withholds strategically",
      dialogueDirective: "economical, loaded, evasive — characters hide as much as they say",
      subtextLevel: "heavy",
      thrillerRules: [
        "Every scene ends with a question or risk",
        "Revelations are graduated — never dump all clues",
        "Cliffhanger or pivot in final beat when possible",
        "Clear scene objective: learn, escape, confront, conceal",
      ],
      hookStrengthTarget: 80,
      curiosityDensityTarget: 75,
    };
  }

  if (/fantasy|sci-fi|urban-fantasy/.test(g)) {
    return {
      ...base,
      tensionLevel: "moderate",
      pacingDirective: "worldbuilding woven through conflict — comfort and wonder balanced with stakes",
      dialogueDirective: "voice distinct by culture, class, and wound — not exposition dumps",
      subtextLevel: "balanced",
      fantasyRules: [
        "World rules stay consistent with established canon",
        "Wonder through sensory detail, not encyclopedia",
        "Conflicts have moral texture, not binary evil",
      ],
    };
  }

  if (/cozy/.test(sub)) {
    return {
      ...base,
      tensionLevel: "low",
      pacingDirective: "moderate tension, high comfort, soft conflicts with human warmth",
      subtextLevel: "light",
      mandatoryPatterns: [
        ...base.mandatoryPatterns,
        "Reader must feel safe even when curious",
        "Stakes are personal, not catastrophic",
      ],
    };
  }

  if (/self-help|business|education|productivity/.test(g)) {
    return {
      ...base,
      tensionLevel: "low",
      pacingDirective: "clear progression — insight before action, example before abstraction",
      dialogueDirective: "conversational authority — not clinical, not preachy",
      subtextLevel: "light",
      forbiddenPatterns: [
        ...base.forbiddenPatterns,
        "Fiction bleed into non-fiction",
        "Vague motivational filler",
      ],
    };
  }

  return base;
}

export function formatNarrativePlanBlock(plan: NarrativeGenerationPlan): string {
  const lines = [
    "NARRATIVE BRAIN V3 — GENERATION STRATEGY (invisible to reader — obey strictly):",
    `Genre: ${plan.genre}${plan.subgenre ? ` / ${plan.subgenre}` : ""}`,
    `Target reader: ${plan.targetReader}`,
    `Marketplace lane: ${plan.marketplaceLane}`,
    `Narrative promise: ${plan.narrativePromise}`,
    `Tone: ${plan.toneDirective}`,
    `Tension: ${plan.tensionLevel} | Pacing: ${plan.pacingDirective}`,
    `Dialogue: ${plan.dialogueDirective}`,
    `Subtext level: ${plan.subtextLevel}`,
  ];

  if (plan.romanceRules?.length) {
    lines.push("ROMANCE TENSION RULES:", ...plan.romanceRules.map((r) => `• ${r}`));
  }
  if (plan.thrillerRules?.length) {
    lines.push("THRILLER PROGRESSION RULES:", ...plan.thrillerRules.map((r) => `• ${r}`));
  }
  if (plan.fantasyRules?.length) {
    lines.push("FANTASY WORLD RULES:", ...plan.fantasyRules.map((r) => `• ${r}`));
  }

  lines.push(
    "MANDATORY:",
    ...plan.mandatoryPatterns.map((p) => `• ${p}`),
    "FORBIDDEN:",
    ...plan.forbiddenPatterns.map((p) => `• ${p}`),
  );

  return lines.join("\n");
}
