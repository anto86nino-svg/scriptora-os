import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import type { CharacterMemoryState } from "@/lib/long-book-memory/types";
import type {
  CharacterPsychologyProfile,
  CopingMechanism,
  CoreWound,
} from "./types";

const WOUND_LEXICON: Record<CoreWound, RegExp[]> = {
  abandonment: [/\b(abandon|abbandon|left behind|orphan|solo|alone|deserted|lasciato)\b/i],
  betrayal: [/\b(betray|tradit|tradimento|lied to|ingann|broken trust|fiducia spezzata)\b/i],
  shame: [/\b(shame|vergogna|humiliat|imbarazz|disgrazia|unworthy)\b/i],
  rejection: [/\b(reject|rifiut|not enough|non bast|unwanted|respint)\b/i],
  control: [/\b(control|controllo|dominat|perfection|perfez|must be perfect|ordine assoluto)\b/i],
  inadequacy: [/\b(inadequ|insufficient|failure|falliment|incapace|not worthy|non merita)\b/i],
  loss: [/\b(loss|perdita|grief|lutto|mort|died|perso)\b/i],
  unknown: [],
};

const WOUND_LABELS: Record<CoreWound, string> = {
  abandonment: "abandonment",
  betrayal: "betrayal",
  shame: "shame",
  rejection: "rejection",
  control: "control",
  inadequacy: "inadequacy",
  loss: "loss",
  unknown: "unresolved wound",
};

const COPING_LABELS: Record<CopingMechanism, string> = {
  sarcasm: "sarcasm and deflection",
  avoidance: "emotional avoidance",
  anger: "anger as shield",
  perfectionism: "perfectionism",
  detachment: "detachment",
  "people-pleasing": "people-pleasing",
  control: "control-seeking",
  unknown: "protective distance",
};

const PERFECT_RESOLUTION_PATTERNS = [
  /\b(i understand now|i love you|capisco tutto|ti amo|everything is fine|tutto va bene|forgive me|mi perdoni)\b/i,
  /\b(i finally understand|finalmente capisco|we're okay|siamo a posto)\b/i,
];

function inferWound(text: string): CoreWound {
  for (const [wound, patterns] of Object.entries(WOUND_LEXICON) as [CoreWound, RegExp[]][]) {
    if (wound === "unknown") continue;
    if (patterns.some(p => p.test(text))) return wound;
  }
  return "unknown";
}

function inferCoping(source: string): CopingMechanism {
  const lower = source.toLowerCase();
  if (/\b(sarcasm|sarcastic|iron|deflect|schiva)\b/.test(lower)) return "sarcasm";
  if (/\b(avoid|evit|withdraw|distance|distacc|silence|silenz)\b/.test(lower)) return "avoidance";
  if (/\b(anger|rabbia|explos|furious|coller)\b/.test(lower)) return "anger";
  if (/\b(perfect|perfez|control|controllo|order)\b/.test(lower)) return "perfectionism";
  if (/\b(please|compiac|appease|accontent)\b/.test(lower)) return "people-pleasing";
  if (/\b(detach|fredd|cold|numb|intorpid)\b/.test(lower)) return "detachment";
  return "unknown";
}

function buildBehavioralDirectives(profile: Omit<CharacterPsychologyProfile, "behavioralDirectives" | "forbiddenPatterns">): string[] {
  const directives: string[] = [
    `Under stress, ${profile.name} must NOT become emotionally perfect or instantly healed.`,
    `Show ${profile.copingLabel} before vulnerability — hesitation, deflection, silence, half-confession.`,
  ];

  if (profile.coreWound === "abandonment") {
    directives.push("Fear of being left → test loyalty, pull back first, or overcompensate then retreat.");
  }
  if (profile.coreWound === "betrayal") {
    directives.push("Trust is earned slowly — suspicion, double-checking, indirect questions.");
  }
  if (profile.coreWound === "rejection") {
    directives.push("Desire to be chosen → seek proof, misread signals, self-sabotage near intimacy.");
  }

  return directives.slice(0, 5);
}

function buildForbiddenPatterns(wound: CoreWound, coping: CopingMechanism): string[] {
  const base = [
    "Instant mutual understanding under conflict",
    "Therapist-style emotional clarity in dialogue",
    "Named feelings resolved in one paragraph",
  ];
  if (wound === "abandonment" || wound === "rejection") {
    base.push("Immediate 'I love you' without fear cost");
  }
  if (coping === "avoidance" || coping === "detachment") {
    base.push("Long vulnerable monologue without physical retreat or subject change");
  }
  return base;
}

function chapterCorpusForCharacter(name: string, chapters: Chapter[]): string {
  const lower = name.toLowerCase();
  return chapters
    .map(ch => `${ch.content}\n${(ch.subchapters || []).map(s => s.content).join("\n")}`)
    .filter(text => text.toLowerCase().includes(lower))
    .join("\n");
}

function detectVoiceViolations(name: string, chapters: Chapter[]): string[] {
  const corpus = chapterCorpusForCharacter(name, chapters);
  if (!corpus) return [];
  const violations: string[] = [];
  for (const pattern of PERFECT_RESOLUTION_PATTERNS) {
    if (pattern.test(corpus)) {
      violations.push(`${name} shows premature emotional resolution — preserve wound-driven friction.`);
      break;
    }
  }
  return violations;
}

export function buildCharacterPsychologyProfiles(input: {
  config: BookConfig;
  blueprint: BookBlueprint | null;
  chapters: Chapter[];
  characterStates?: CharacterMemoryState[];
  existing?: CharacterPsychologyProfile[];
}): CharacterPsychologyProfile[] {
  const cast: Array<{
    name: string;
    role?: string;
    woundText: string;
    fear: string;
    desire: string;
    contradiction: string;
    copingText: string;
    source: CharacterPsychologyProfile["source"];
    confidence: CharacterPsychologyProfile["confidence"];
  }> = [];

  for (const c of input.config.characters || []) {
    const name = [c.name, c.surname].filter(Boolean).join(" ").trim();
    if (!name) continue;
    cast.push({
      name,
      role: c.role,
      woundText: c.traumaProfile || c.personality || "",
      fear: "",
      desire: "",
      contradiction: "",
      copingText: c.personality || "",
      source: "config",
      confidence: c.traumaProfile ? "medium" : "low",
    });
  }

  for (const c of input.blueprint?.blueprintIntegrity?.characterMemoryEngine || []) {
    if (!c.canonicalName) continue;
    cast.push({
      name: c.canonicalName,
      role: c.role,
      woundText: [c.emotionalWounds, c.traumaMarkers].filter(Boolean).join(". "),
      fear: c.coreFear || "",
      desire: c.coreDesire || c.secretNeed || "",
      contradiction: c.internalContradiction || "",
      copingText: [c.angerStyle, c.lieStyle, c.emotionalOpennessLevel, c.personalityProfile].filter(Boolean).join(". "),
      source: "blueprint",
      confidence: c.coreFear && c.coreDesire ? "high" : "medium",
    });
  }

  const deduped = new Map<string, typeof cast[number]>();
  for (const item of cast) {
    const key = item.name.toLowerCase();
    const prev = deduped.get(key);
    if (!prev || (item.confidence === "high" && prev.confidence !== "high")) {
      deduped.set(key, item);
    }
  }

  const written = input.chapters.filter(ch => ch.content.trim().length > 50);
  let lastChapter = written.length;

  return [...deduped.values()].slice(0, 12).map(entry => {
    const existing = input.existing?.find(p => p.name.toLowerCase() === entry.name.toLowerCase());
    const corpus = chapterCorpusForCharacter(entry.name, written);
    const combinedText = [entry.woundText, entry.fear, entry.desire, entry.contradiction, corpus.slice(0, 2000)].join(" ");

    const coreWound = inferWound(combinedText);
    const copingMechanism = inferCoping(entry.copingText || combinedText);

    const fear =
      entry.fear.trim() ||
      (coreWound === "abandonment"
        ? "being abandoned or left behind"
        : coreWound === "betrayal"
          ? "being betrayed again"
          : coreWound === "rejection"
            ? "not being chosen"
            : coreWound === "shame"
              ? "being exposed or humiliated"
              : "vulnerability");

    const desire =
      entry.desire.trim() ||
      (coreWound === "abandonment"
        ? "to be chosen and stay"
        : coreWound === "control"
          ? "to feel safe through control"
          : "connection without losing self");

    const contradiction =
      entry.contradiction.trim() ||
      (copingMechanism === "avoidance"
        ? "wants intimacy but pushes people away"
        : copingMechanism === "anger"
          ? "wants closeness but attacks when hurt"
          : "wants trust but expects the worst");

    const partial: Omit<CharacterPsychologyProfile, "behavioralDirectives" | "forbiddenPatterns"> = {
      name: entry.name,
      role: entry.role,
      coreWound,
      woundLabel: WOUND_LABELS[coreWound],
      fear,
      desire,
      copingMechanism,
      copingLabel: COPING_LABELS[copingMechanism],
      contradiction,
      confidence: entry.confidence,
      source: entry.source,
      lastUpdatedChapter: lastChapter || existing?.lastUpdatedChapter,
    };

    const voiceViolations = detectVoiceViolations(entry.name, written);

    return {
      ...partial,
      behavioralDirectives: [
        ...buildBehavioralDirectives(partial),
        ...voiceViolations,
      ],
      forbiddenPatterns: buildForbiddenPatterns(coreWound, copingMechanism),
    };
  });
}

export function buildCharacterPsychologyPromptBlock(profiles: CharacterPsychologyProfile[]): string {
  if (!profiles.length) return "";

  return `CHARACTER PSYCHOLOGY ENGINE V2 — ACT LIKE A HUMAN EDITOR
Characters must behave from wound + fear + desire — NOT from plot convenience.

${profiles
  .map(
    p => `${p.name}${p.role ? ` (${p.role})` : ""}:
  Wound: ${p.woundLabel}
  Fear: ${p.fear}
  Desire: ${p.desire}
  Coping: ${p.copingLabel}
  Contradiction: ${p.contradiction}
  Behavior rules:
${p.behavioralDirectives.map(d => `  • ${d}`).join("\n")}
  NEVER:
${p.forbiddenPatterns.map(f => `  • ${f}`).join("\n")}`,
  )
  .join("\n\n")}

MANDATORY: wounded characters hesitate, deflect, and fear before clarity. No instant healing dialogue.`;
}
