import { BookConfig, BookBlueprint, Chapter, Genre } from "@/types/book";

type PacingStyle = "slow-burn" | "balanced" | "fast-escalation";
type ProseDensity = "lean" | "balanced" | "lush";
type TensionStyle = "psychological" | "danger-forward" | "relational" | "mystery-loop";
type AudienceBand = "ya" | "new-adult" | "adult" | "crossover";
type BrainId =
  | "DarkRomanceBrain"
  | "ThrillerBrain"
  | "CozyFantasyBrain"
  | "MafiaEmpireBrain"
  | "PsychologicalHorrorBrain"
  | "AcademicEnemiesToLoversBrain"
  | "BookTokViralBrain"
  | "CoreNarrativeBrain";

interface GenreDNAProfile {
  macroGenre: string;
  subgenre: string;
  emotionalIntensity: number;
  pacingStyle: PacingStyle;
  proseDensity: ProseDensity;
  dialogueRatio: number;
  romanceSpeed: number;
  darknessLevel: number;
  tensionStyle: TensionStyle;
  targetAudience: AudienceBand;
  bookTokPotential: number;
  commercialCategory: string;
  readerExpectations: string[];
}

interface CharacterPsychologySnapshot {
  name: string;
  role: string;
  traumaPattern: string;
  attachmentStyle: string;
  defenseMechanisms: string[];
  jealousyBehavior: string;
  angerResponse: string;
  intimacyTolerance: string;
  manipulationTendency: string;
  speechRhythm: string;
  vulnerabilityThreshold: string;
}

interface CommercialMomentumReport {
  confidence: "low" | "medium" | "high";
  weakHooks: boolean;
  pacingCollapseRisk: boolean;
  curiosityPressure: "low" | "medium" | "high" | "unknown";
  emotionalStagnationRisk: boolean;
  repetitiveSceneGoalRisk: boolean;
  earlyPayoffRisk: boolean;
  chapterEndingStrength: "weak" | "medium" | "strong" | "unknown";
  dropRisk: "low" | "medium" | "high" | "unknown";
}

interface AIPatternReport {
  confidence: "low" | "medium" | "high";
  repetitiveSentenceRhythmRisk: boolean;
  aiSafePhrasingRisk: boolean;
  expositionOverloadRisk: boolean;
  metaphorSaturationRisk: boolean;
  dialogueSymmetryRisk: boolean;
}

export interface NarrativeTelemetrySnapshot {
  genreDNA: {
    macroGenre: string;
    subgenre: string;
    emotionalIntensity: number;
    pacingStyle: PacingStyle;
    proseDensity: ProseDensity;
    tensionStyle: TensionStyle;
    bookTokPotential: number;
    commercialCategory: string;
    brains: BrainId[];
  };
  scores: {
    tensionScore: number;
    emotionalRealismScore: number;
    aiRiskScore: number;
    pacingPressure: number;
    subtextDensity: number;
    commercialMomentumScore: number;
    readerDropRiskEstimate: number;
  };
  flags: {
    momentumConfidence: CommercialMomentumReport["confidence"];
    aiPatternConfidence: AIPatternReport["confidence"];
    weakHookRisk: boolean;
    earlyPayoffRisk: boolean;
    pacingCollapseRisk: boolean;
  };
}

const GENRE_DNA_DEFAULT: GenreDNAProfile = {
  macroGenre: "narrative",
  subgenre: "general",
  emotionalIntensity: 6,
  pacingStyle: "balanced",
  proseDensity: "balanced",
  dialogueRatio: 0.45,
  romanceSpeed: 0.4,
  darknessLevel: 0.4,
  tensionStyle: "relational",
  targetAudience: "adult",
  bookTokPotential: 0.6,
  commercialCategory: "Commercial Fiction",
  readerExpectations: [
    "compulsive readability",
    "emotionally coherent character behavior",
    "chapter endings with forward pull",
  ],
};

const DNA_BY_GENRE: Partial<Record<Genre, GenreDNAProfile>> = {
  "dark-romance": {
    macroGenre: "romance",
    subgenre: "dark romance",
    emotionalIntensity: 9,
    pacingStyle: "slow-burn",
    proseDensity: "lush",
    dialogueRatio: 0.55,
    romanceSpeed: 0.25,
    darknessLevel: 0.85,
    tensionStyle: "relational",
    targetAudience: "new-adult",
    bookTokPotential: 0.92,
    commercialCategory: "Romance > Dark",
    readerExpectations: [
      "dangerous attraction",
      "interrupted intimacy",
      "heavy subtext and emotional push-pull",
      "possessive chemistry with delayed payoff",
    ],
  },
  thriller: {
    macroGenre: "thriller",
    subgenre: "psychological thriller",
    emotionalIntensity: 8,
    pacingStyle: "fast-escalation",
    proseDensity: "lean",
    dialogueRatio: 0.4,
    romanceSpeed: 0.1,
    darknessLevel: 0.72,
    tensionStyle: "mystery-loop",
    targetAudience: "adult",
    bookTokPotential: 0.8,
    commercialCategory: "Thriller & Suspense",
    readerExpectations: [
      "escalating danger",
      "uncertainty loops",
      "rapid pacing and paranoia layering",
      "high-pressure chapter endings",
    ],
  },
  fantasy: {
    macroGenre: "fantasy",
    subgenre: "cozy fantasy",
    emotionalIntensity: 6,
    pacingStyle: "balanced",
    proseDensity: "lush",
    dialogueRatio: 0.45,
    romanceSpeed: 0.35,
    darknessLevel: 0.3,
    tensionStyle: "relational",
    targetAudience: "crossover",
    bookTokPotential: 0.76,
    commercialCategory: "Fantasy > Cozy",
    readerExpectations: [
      "soft immersion and atmospheric prose",
      "relationship warmth",
      "low-aggression conflict with emotional comfort",
    ],
  },
};

function mergeDNA(genre: Genre, subcategory?: string): GenreDNAProfile {
  const byGenre = DNA_BY_GENRE[genre];
  const base = { ...GENRE_DNA_DEFAULT, ...(byGenre || {}) };
  const sub = String(subcategory || "").toLowerCase();

  if (sub.includes("mafia")) {
    base.subgenre = "mafia empire romance";
    base.darknessLevel = Math.max(base.darknessLevel, 0.82);
    base.bookTokPotential = Math.max(base.bookTokPotential, 0.9);
  }
  if (sub.includes("academic") || sub.includes("enemies")) {
    base.subgenre = "academic enemies to lovers";
    base.dialogueRatio = Math.max(base.dialogueRatio, 0.58);
    base.romanceSpeed = 0.22;
  }
  if (sub.includes("horror")) {
    base.subgenre = "psychological horror";
    base.darknessLevel = Math.max(base.darknessLevel, 0.9);
    base.tensionStyle = "psychological";
  }

  return base;
}

function pickBrains(dna: GenreDNAProfile): BrainId[] {
  const brains: BrainId[] = ["CoreNarrativeBrain", "BookTokViralBrain"];
  const sub = dna.subgenre.toLowerCase();
  if (sub.includes("dark romance")) brains.push("DarkRomanceBrain");
  if (sub.includes("thriller")) brains.push("ThrillerBrain");
  if (sub.includes("cozy")) brains.push("CozyFantasyBrain");
  if (sub.includes("mafia")) brains.push("MafiaEmpireBrain");
  if (sub.includes("horror")) brains.push("PsychologicalHorrorBrain");
  if (sub.includes("academic") || sub.includes("enemies")) brains.push("AcademicEnemiesToLoversBrain");
  return Array.from(new Set(brains));
}

function buildCharacterPsychologyMemory(config: BookConfig): CharacterPsychologySnapshot[] {
  const raw = Array.isArray((config as any).characters) ? (config as any).characters : [];
  return raw
    .filter((c: any) => String(c?.name || "").trim().length > 0)
    .map((c: any) => ({
      name: `${c.name || ""} ${c.surname || ""}`.trim(),
      role: c.role || "primary",
      traumaPattern: c.wound || "not explicitly stated",
      attachmentStyle: guessAttachmentStyle(c),
      defenseMechanisms: guessDefenses(c),
      jealousyBehavior: inferJealousyPattern(c),
      angerResponse: inferAngerResponse(c),
      intimacyTolerance: inferIntimacyTolerance(c),
      manipulationTendency: inferManipulationPattern(c),
      speechRhythm: inferSpeechRhythm(c),
      vulnerabilityThreshold: inferVulnerabilityThreshold(c),
    }));
}

function guessAttachmentStyle(character: any): string {
  const personality = String(character?.personality || "").toLowerCase();
  if (/(avoid|fredd|distan|cold|guarded)/.test(personality)) return "avoidant";
  if (/(ansia|need|aband|possess|gelos)/.test(personality)) return "anxious";
  return "mixed-secure";
}

function guessDefenses(character: any): string[] {
  const wound = String(character?.wound || "").toLowerCase();
  const defenses: string[] = [];
  if (/trad|betray|abandon|rifiut/.test(wound)) defenses.push("emotional-withdrawal");
  if (/control|controll|power/.test(wound)) defenses.push("control-seeking");
  if (/humili|vergogn|shame/.test(wound)) defenses.push("deflection-through-humor");
  if (!defenses.length) defenses.push("topic-avoidance");
  return defenses;
}

function inferJealousyPattern(character: any): string {
  return /(possess|gelos|territorial)/i.test(String(character?.personality || ""))
    ? "territorial-protective"
    : "internalized-quiet";
}

function inferAngerResponse(character: any): string {
  return /(explosive|impulsive|hot)/i.test(String(character?.personality || ""))
    ? "sharp-outburst"
    : "cold-retreat";
}

function inferIntimacyTolerance(character: any): string {
  return /(avoid|closed|fredd)/i.test(String(character?.personality || ""))
    ? "low-until-trust"
    : "guarded-but-responsive";
}

function inferManipulationPattern(character: any): string {
  return /(strateg|control|calculat)/i.test(String(character?.personality || ""))
    ? "strategic-pressure"
    : "minimal-overt-manipulation";
}

function inferSpeechRhythm(character: any): string {
  return /(sharp|dry|ironic|sarcast)/i.test(String(character?.personality || ""))
    ? "short-cutting-lines"
    : "mixed-with-pauses";
}

function inferVulnerabilityThreshold(character: any): string {
  return String(character?.wound || "").trim() ? "high" : "medium";
}

function analyzeCommercialMomentum(text: string): CommercialMomentumReport {
  const sample = String(text || "").trim();
  const words = sample.split(/\s+/).filter(Boolean).length;
  if (words < 120) {
    return {
      confidence: "low",
      weakHooks: false,
      pacingCollapseRisk: false,
      curiosityPressure: "unknown",
      emotionalStagnationRisk: false,
      repetitiveSceneGoalRisk: false,
      earlyPayoffRisk: false,
      chapterEndingStrength: "unknown",
      dropRisk: "unknown",
    };
  }

  const lower = text.toLowerCase();
  const questionCount = (text.match(/\?/g) || []).length;
  const ending = text.trim().slice(-240).toLowerCase();
  const weakEnding = /(everything was fine|all was well|in conclusione|in summary|the end)/.test(ending);
  const introspectionDensity = (lower.match(/feel|felt|sent|pens|think|thought/g) || []).length;
  const actionDensity = (lower.match(/door|run|step|looked|grab|turned|walked|said|asked|rise|fell/g) || []).length;
  const curiosityPressure = questionCount >= 4 ? "high" : questionCount >= 2 ? "medium" : "low";
  const confidence: CommercialMomentumReport["confidence"] = words > 400 ? "high" : "medium";

  return {
    confidence,
    weakHooks: /it was a normal day|once upon a time|this chapter will/i.test(text),
    pacingCollapseRisk: introspectionDensity > actionDensity * 1.8,
    curiosityPressure,
    emotionalStagnationRisk: /(i feel|mi sento)/i.test(text) && !/(but|ma|yet|però|however)/i.test(text),
    repetitiveSceneGoalRisk: /(again|di nuovo|once more).{0,60}(same|stesso)/i.test(text),
    earlyPayoffRisk: /(immediately confessed|subito confess|resolved instantly|risolto subito)/i.test(text),
    chapterEndingStrength: weakEnding ? "weak" : curiosityPressure === "high" ? "strong" : "medium",
    dropRisk: weakEnding || curiosityPressure === "low" ? "high" : "medium",
  };
}

function detectAIPatterns(text: string): AIPatternReport {
  const sample = String(text || "").trim();
  const words = sample.split(/\s+/).filter(Boolean).length;
  if (words < 120) {
    return {
      confidence: "low",
      repetitiveSentenceRhythmRisk: false,
      aiSafePhrasingRisk: false,
      expositionOverloadRisk: false,
      metaphorSaturationRisk: false,
      dialogueSymmetryRisk: false,
    };
  }

  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const lengths = sentences.slice(0, 40).map((s) => s.split(/\s+/).length);
  const avg = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const variance = lengths.length
    ? lengths.reduce((acc, n) => acc + Math.pow(n - avg, 2), 0) / lengths.length
    : 0;
  const lower = text.toLowerCase();
  const confidence: AIPatternReport["confidence"] = words > 400 ? "high" : "medium";

  return {
    confidence,
    repetitiveSentenceRhythmRisk: variance < 18,
    aiSafePhrasingRisk: /(in this chapter|delve into|it is important to note|in conclusione)/i.test(text),
    expositionOverloadRisk: (lower.match(/feel|emotion|thought|realized|capii|sentii/g) || []).length > 28,
    metaphorSaturationRisk: (lower.match(/like a|as if|come se|metaphor|simile/g) || []).length > 16,
    dialogueSymmetryRisk: /(he said.*she said.*he said.*she said|lui disse.*lei disse.*lui disse.*lei disse)/i.test(lower),
  };
}

export function buildNarrativeIntelligenceSystemBlock(config: BookConfig): string {
  const dna = mergeDNA(config.genre, (config as any).subcategory);
  const brains = pickBrains(dna);
  return `NARRATIVE INTELLIGENCE SYSTEM (COMPACT LAYER):
GENRE DNA:
- Macro genre: ${dna.macroGenre}
- Subgenre: ${dna.subgenre}
- Emotional intensity: ${dna.emotionalIntensity}/10
- Pacing style: ${dna.pacingStyle}
- Prose density: ${dna.proseDensity}
- Dialogue ratio target: ~${Math.round(dna.dialogueRatio * 100)}%
- Romance speed: ${Math.round(dna.romanceSpeed * 100)}/100 (slow = delayed payoff)
- Darkness level: ${Math.round(dna.darknessLevel * 100)}/100
- Tension style: ${dna.tensionStyle}
- Target audience: ${dna.targetAudience}
- BookTok potential target: ${Math.round(dna.bookTokPotential * 100)}/100
- Commercial category: ${dna.commercialCategory}
- Reader expectations: ${dna.readerExpectations.join("; ")}

PRIMARY BEHAVIOR RULES:
- Delay emotional payoff; avoid instant confessions.
- Prefer behavioral emotion + subtext over explicit explanation.
- Keep dialogue asymmetrical and psychologically credible.
- Preserve premium prose; avoid artificial roughness.

GENRE-SPECIFIC WRITING BRAINS ACTIVE:
- ${brains.join(", ")}

AI-PATTERN CONTROL:
- Vary cadence naturally (not mechanically).
- Avoid AI-safe phrasing and metaphor stacking.
- Reduce emotional overexplanation.

COMMERCIAL MOMENTUM:
- Maintain unresolved pressure and curiosity loops.
- End sections with forward pull (not forced cliffhanger spam).`;
}

export function buildNarrativeIntelligenceRuntimeBlock(params: {
  config: BookConfig;
  blueprint: BookBlueprint;
  previousChapters: Chapter[];
  chapterIndex: number;
  currentText?: string;
}): string {
  const { config, previousChapters, chapterIndex, currentText } = params;
  const dna = mergeDNA(config.genre, (config as any).subcategory);
  const psychology = buildCharacterPsychologyMemory(config);
  const commercial = analyzeCommercialMomentum(currentText || "");
  const aiPatterns = detectAIPatterns(currentText || "");
  const prevLen = previousChapters.length;
  const chapterPosition = `${chapterIndex + 1}/${Math.max(1, config.numberOfChapters)}`;

  const psychBlock = psychology.length
    ? psychology
        .slice(0, 6)
        .map((p, i) => `${i + 1}. ${p.name} (${p.role})
- trauma: ${p.traumaPattern}
- attachment: ${p.attachmentStyle}
- defenses: ${p.defenseMechanisms.join(", ")}
- jealousy: ${p.jealousyBehavior}
- anger: ${p.angerResponse}
- intimacy tolerance: ${p.intimacyTolerance}
- manipulation tendency: ${p.manipulationTendency}
- speech rhythm: ${p.speechRhythm}
- vulnerability threshold: ${p.vulnerabilityThreshold}`)
        .join("\n")
    : "No explicit character bible. Infer stable psychology from previous chapters and preserve consistency.";

  return `NARRATIVE RUNTIME CONTROLS:
- Chapter position: ${chapterPosition}
- Previous chapters available for continuity: ${prevLen}
- Target tension architecture: ${dna.tensionStyle}
- Desired prose pressure: ${dna.pacingStyle} / ${dna.proseDensity}

CHARACTER PSYCHOLOGY MEMORY (PERSISTENT):
${psychBlock}

COMMERCIAL MOMENTUM ENGINE:
- Confidence: ${commercial.confidence}
- Hook weakness risk: ${commercial.weakHooks}
- Pacing collapse risk: ${commercial.pacingCollapseRisk}
- Curiosity pressure: ${commercial.curiosityPressure}
- Emotional stagnation risk: ${commercial.emotionalStagnationRisk}
- Repetitive scene-goal risk: ${commercial.repetitiveSceneGoalRisk}
- Early payoff risk: ${commercial.earlyPayoffRisk}
- Chapter ending strength: ${commercial.chapterEndingStrength}
- Reader drop risk: ${commercial.dropRisk}

AI-PATTERN DETECTOR:
- Confidence: ${aiPatterns.confidence}
- Repetitive rhythm risk: ${aiPatterns.repetitiveSentenceRhythmRisk}
- AI-safe phrasing risk: ${aiPatterns.aiSafePhrasingRisk}
- Emotional exposition overload risk: ${aiPatterns.expositionOverloadRisk}
- Metaphor saturation risk: ${aiPatterns.metaphorSaturationRisk}
- Dialogue symmetry risk: ${aiPatterns.dialogueSymmetryRisk}

CONDITIONAL CORRECTIONS (ONLY IF CONFIDENCE IS MEDIUM/HIGH):
- Early payoff risk: add delay, interruption, and denial beats.
- Stagnation risk: introduce concrete choice, conflict, or reveal.
- Rhythm risk: vary sentence cadence naturally.
- Exposition overload: replace explanation with action/subtext.
- Weak ending: end on unresolved consequence or volatile pivot.`;
}

export function getNarrativeTelemetrySnapshot(params: {
  config: BookConfig;
  currentText?: string;
}): NarrativeTelemetrySnapshot {
  const { config, currentText } = params;
  const dna = mergeDNA(config.genre, (config as any).subcategory);
  const brains = pickBrains(dna);
  const commercial = analyzeCommercialMomentum(currentText || "");
  const ai = detectAIPatterns(currentText || "");
  const text = String(currentText || "");
  const words = text.split(/\s+/).filter(Boolean).length;
  const quoteCount = (text.match(/[“”"«»]/g) || []).length;
  const subtextDensity = Math.min(100, Math.round((quoteCount / Math.max(1, words)) * 1200));
  const tensionScore = Math.round((dna.emotionalIntensity * 7 + dna.darknessLevel * 30 + (commercial.earlyPayoffRisk ? -18 : 8)));
  const emotionalRealismScore = Math.max(0, Math.min(100, Math.round(76 - (ai.expositionOverloadRisk ? 20 : 0) - (ai.dialogueSymmetryRisk ? 12 : 0) + (subtextDensity > 10 ? 8 : 0))));
  const aiRiskScore = Math.max(0, Math.min(100, (ai.repetitiveSentenceRhythmRisk ? 22 : 0) + (ai.aiSafePhrasingRisk ? 24 : 0) + (ai.expositionOverloadRisk ? 28 : 0) + (ai.metaphorSaturationRisk ? 18 : 0) + (ai.dialogueSymmetryRisk ? 18 : 0)));
  const pacingPressure = Math.max(0, Math.min(100, Math.round((dna.pacingStyle === "fast-escalation" ? 78 : dna.pacingStyle === "slow-burn" ? 52 : 64) - (commercial.pacingCollapseRisk ? 20 : 0))));
  const commercialMomentumScore = Math.max(0, Math.min(100, Math.round(74 + (commercial.curiosityPressure === "high" ? 14 : commercial.curiosityPressure === "low" ? -18 : 0) + (commercial.chapterEndingStrength === "strong" ? 10 : commercial.chapterEndingStrength === "weak" ? -16 : 0))));
  const readerDropRiskEstimate = Math.max(0, Math.min(100, Math.round(commercial.dropRisk === "high" ? 72 : commercial.dropRisk === "medium" ? 38 : commercial.dropRisk === "low" ? 18 : 30)));

  return {
    genreDNA: {
      macroGenre: dna.macroGenre,
      subgenre: dna.subgenre,
      emotionalIntensity: dna.emotionalIntensity,
      pacingStyle: dna.pacingStyle,
      proseDensity: dna.proseDensity,
      tensionStyle: dna.tensionStyle,
      bookTokPotential: dna.bookTokPotential,
      commercialCategory: dna.commercialCategory,
      brains,
    },
    scores: {
      tensionScore,
      emotionalRealismScore,
      aiRiskScore,
      pacingPressure,
      subtextDensity,
      commercialMomentumScore,
      readerDropRiskEstimate,
    },
    flags: {
      momentumConfidence: commercial.confidence,
      aiPatternConfidence: ai.confidence,
      weakHookRisk: commercial.weakHooks,
      earlyPayoffRisk: commercial.earlyPayoffRisk,
      pacingCollapseRisk: commercial.pacingCollapseRisk,
    },
  };
}

