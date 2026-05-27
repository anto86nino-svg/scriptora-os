export interface EditorialWarning {
  type:
    | "emotional_redundancy"
    | "dialogue_perfection"
    | "climax_oversaturation"
    | "character_flattening"
    | "repetitive_symbolism"
    | "weak_subtext"
    | "overwritten_scene";

  severity: "low" | "medium" | "high";

  chapter?: number;

  message: string;

  suggestion: string;
}

export interface EditorialReport {
  emotionalRedundancyScore: number;
  dialogueHumanityScore: number;
  pacingConsistencyScore: number;
  climaxDensityScore: number;
  subtextScore: number;
  characterConsistencyScore: number;

  warnings: EditorialWarning[];
}

const REPETITIVE_PHRASES = [
  "per sempre",
  "non ti lascio",
  "non andartene",
  "ti amo",
  "insieme",
  "sei mia",
  "sei mio",
  "resta",
  "nostro",
  "scegliamo",
];

function countOccurrences(text: string, phrase: string): number {
  const matches = text
    .toLowerCase()
    .match(new RegExp(phrase.toLowerCase(), "g"));

  return matches ? matches.length : 0;
}

export function detectEmotionalRedundancy(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  for (const phrase of REPETITIVE_PHRASES) {
    const count = countOccurrences(text, phrase);

    if (count >= 6) {
      warnings.push({
        type: "emotional_redundancy",
        severity: count >= 10 ? "high" : "medium",

        message: `Phrase "${phrase}" appears ${count} times and may create emotional repetition.`,

        suggestion:
          "Reduce repeated emotional declarations and increase subtext/silence variation.",
      });
    }
  }

  return warnings;
}

export function analyzeNovel(text: string): EditorialReport {
  const warnings = [
      ...detectEmotionalRedundancy(text),
      ...detectDialoguePerfection(text),
      ...detectClimaxOversaturation(text),
      ...detectWeakSubtext(text),
      ...detectCharacterFlattening(text),
      ...detectOverwrittenEndings(text),
      ...detectBreathingImbalance(text),
      ...detectEmotionalMonologues(text),
      ...detectRepetitiveScenePurpose(text),
      ...detectConflictCollapse(text),
      ...detectEmotionalPredictability(text),
      ...detectSymbolicOveruse(text),
      ...detectEmotionalPacingUniformity(text),
      ...detectVoiceHomogenization(text),
      ...detectPrematureEmotionalResolution(text),
      ...detectEmotionalConvenience(text),
      ...detectBehavioralDeficit(text),
      ...detectTonalRepetition(text),
    ];

  const scores = calculateEditorialScores(warnings);

  return {
    emotionalRedundancyScore: scores.emotionalRealismScore,
    dialogueHumanityScore: scores.dialogueHumanityScore,
    pacingConsistencyScore: scores.pacingBalanceScore,
    climaxDensityScore: 0,
    subtextScore: scores.subtextStrengthScore,
    characterConsistencyScore: scores.characterDepthScore,

    warnings: [
      ...detectEmotionalRedundancy(text),
      ...detectDialoguePerfection(text),
      ...detectClimaxOversaturation(text),
      ...detectWeakSubtext(text),
      ...detectCharacterFlattening(text),
      ...detectOverwrittenEndings(text),
      ...detectBreathingImbalance(text),
      ...detectEmotionalMonologues(text),
      ...detectRepetitiveScenePurpose(text),
      ...detectConflictCollapse(text),
      ...detectEmotionalPredictability(text),
      ...detectSymbolicOveruse(text),
      ...detectEmotionalPacingUniformity(text),
      ...detectVoiceHomogenization(text),
      ...detectPrematureEmotionalResolution(text),
      ...detectEmotionalConvenience(text),
      ...detectBehavioralDeficit(text),
      ...detectTonalRepetition(text),
    ],
  };
}

const PERFECT_DIALOGUE_PATTERNS = [
  "l'amore è",
  "sei la mia",
  "per sempre",
  "sei tutto",
  "mi hai salvato",
  "senza di te",
  "destino",
  "anime spezzate",
  "ceneri",
  "oscurità",
];

export function detectDialoguePerfection(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let poeticDensity = 0;

  for (const pattern of PERFECT_DIALOGUE_PATTERNS) {
    poeticDensity += countOccurrences(text, pattern);
  }

  if (poeticDensity >= 12) {
    warnings.push({
      type: "dialogue_perfection",
      severity: poeticDensity >= 20 ? "high" : "medium",

      message:
        "Dialogue may feel overly polished, poetic, or emotionally over-explained.",

      suggestion:
        "Add interruptions, silence, imperfect responses, and more natural emotional avoidance.",
    });
  }

  return warnings;
}

const CLIMAX_PATTERNS = [
  "ti amo",
  "per sempre",
  "non ti lascio",
  "resta con me",
  "sei mia",
  "sei mio",
  "non vivere senza",
  "scelgo te",
  "famiglia",
  "nostro futuro",
];

export function detectClimaxOversaturation(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let climaxDensity = 0;

  for (const pattern of CLIMAX_PATTERNS) {
    climaxDensity += countOccurrences(text, pattern);
  }

  if (climaxDensity >= 15) {
    warnings.push({
      type: "climax_oversaturation",
      severity: climaxDensity >= 25 ? "high" : "medium",

      message:
        "Too many emotional climax declarations may reduce narrative impact.",

      suggestion:
        "Reduce repeated emotional payoffs and leave more unresolved emotional tension.",
    });
  }

  return warnings;
}

const SUBTEXT_KILLER_PATTERNS = [
  "la verità è",
  "ho capito che",
  "adesso so",
  "significa che",
  "quello che provo",
  "l'amore è",
  "ho imparato",
  "finalmente capisco",
  "mi sento come",
  "questo significa",
];

export function detectWeakSubtext(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let expositionDensity = 0;

  for (const pattern of SUBTEXT_KILLER_PATTERNS) {
    expositionDensity += countOccurrences(text, pattern);
  }

  if (expositionDensity >= 10) {
    warnings.push({
      type: "weak_subtext",
      severity: expositionDensity >= 18 ? "high" : "medium",

      message:
        "Narrative may over-explain emotions instead of allowing subtext and silence.",

      suggestion:
        "Reduce explicit emotional interpretation and allow gestures, pauses, and implication to carry meaning.",
    });
  }

  return warnings;
}

const FLATTENING_PATTERNS = [
  "andrà tutto bene",
  "sono qui per te",
  "non ti lascerò",
  "insieme possiamo",
  "ti aiuterò",
  "non sei solo",
  "ti capisco",
  "scegliamo insieme",
  "ti proteggerò",
  "fidati di me",
];

export function detectCharacterFlattening(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let emotionalSupportDensity = 0;

  for (const pattern of FLATTENING_PATTERNS) {
    emotionalSupportDensity += countOccurrences(text, pattern);
  }

  if (emotionalSupportDensity >= 10) {
    warnings.push({
      type: "character_flattening",
      severity: emotionalSupportDensity >= 18 ? "high" : "medium",

      message:
        "Characters may feel overly emotionally supportive or psychologically simplified.",

      suggestion:
        "Reintroduce contradiction, emotional resistance, fear, selfishness, and unresolved interpersonal tension.",
    });
  }

  return warnings;
}

const OVERWRITTEN_ENDING_PATTERNS = [
  "per la prima volta",
  "capì che",
  "adesso sapeva",
  "questa era la vera",
  "l'amore più vero",
  "da quel momento",
  "finalmente comprese",
  "non era più",
  "perché finalmente",
  "e in quel momento",
];

export function detectOverwrittenEndings(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let endingDensity = 0;

  for (const pattern of OVERWRITTEN_ENDING_PATTERNS) {
    endingDensity += countOccurrences(text, pattern);
  }

  if (endingDensity >= 8) {
    warnings.push({
      type: "overwritten_scene",
      severity: endingDensity >= 14 ? "high" : "medium",

      message:
        "Scene endings may over-explain emotional meaning or stay too long after the emotional climax.",

      suggestion:
        "End scenes earlier. Preserve ambiguity, silence, and emotional residue instead of explaining the final emotional takeaway.",
    });
  }

  return warnings;
}

const BREATHING_PATTERNS = [
  "respirò",
  "silenzio",
  "caffè",
  "camminò",
  "guardò fuori",
  "pioggia",
  "finestra",
  "cucina",
  "giornata",
  "luce",
];

export function detectBreathingImbalance(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let breathingMoments = 0;

  for (const pattern of BREATHING_PATTERNS) {
    breathingMoments += countOccurrences(text, pattern);
  }

  const textLength = text.split(" ").length;

  const breathingRatio = breathingMoments / Math.max(textLength, 1);

  if (breathingRatio < 0.0008) {
    warnings.push({
      type: "weak_subtext",
      severity: "medium",

      message:
        "Narrative may lack quiet moments, emotional breathing space, or grounded daily-life texture.",

      suggestion:
        "Add pauses, ordinary actions, environmental stillness, and non-performative intimacy to restore pacing balance.",
    });
  }

  return warnings;
}

const EMOTIONAL_MONOLOGUE_PATTERNS = [
  "ho paura",
  "mi sento",
  "non posso",
  "non riesco",
  "sono rotto",
  "sono spezzato",
  "quello che provo",
  "mi distrugge",
  "non sono abbastanza",
  "non so come",
];

export function detectEmotionalMonologues(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let monologueDensity = 0;

  for (const pattern of EMOTIONAL_MONOLOGUE_PATTERNS) {
    monologueDensity += countOccurrences(text, pattern);
  }

  if (monologueDensity >= 12) {
    warnings.push({
      type: "emotional_redundancy",
      severity: monologueDensity >= 20 ? "high" : "medium",

      message:
        "Characters may be verbally over-processing emotions instead of expressing them through behavior and subtext.",

      suggestion:
        "Reduce emotional self-explanations and replace some dialogue with physical action, silence, interruption, or avoidance.",
    });
  }

  return warnings;
}

const SCENE_PURPOSE_PATTERNS = [
  "resta",
  "non lasciarmi",
  "scegli me",
  "ti amo",
  "insieme",
  "mi salvi",
  "ho paura",
  "non sono abbastanza",
  "non andartene",
  "per sempre",
];

export function detectRepetitiveScenePurpose(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let repeatedPurposeDensity = 0;

  for (const pattern of SCENE_PURPOSE_PATTERNS) {
    repeatedPurposeDensity += countOccurrences(text, pattern);
  }

  if (repeatedPurposeDensity >= 25) {
    warnings.push({
      type: "emotional_redundancy",
      severity: repeatedPurposeDensity >= 40 ? "high" : "medium",

      message:
        "Multiple scenes may be delivering the same emotional purpose or relational payoff.",

      suggestion:
        "Differentiate scene goals. Replace repeated emotional confirmations with conflict, tension shifts, silence, action, or unresolved emotional movement.",
    });
  }

  return warnings;
}

const CONFLICT_COLLAPSE_PATTERNS = [
  "andrà tutto bene",
  "mi fido di te",
  "non litigheremo",
  "insieme possiamo",
  "ti credo",
  "hai ragione",
  "mi dispiace",
  "ti perdono",
  "scegliamo insieme",
  "non voglio perderti",
];

export function detectConflictCollapse(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let reassuranceDensity = 0;

  for (const pattern of CONFLICT_COLLAPSE_PATTERNS) {
    reassuranceDensity += countOccurrences(text, pattern);
  }

  if (reassuranceDensity >= 15) {
    warnings.push({
      type: "character_flattening",
      severity: reassuranceDensity >= 25 ? "high" : "medium",

      message:
        "Narrative conflict may be resolving too quickly through excessive reassurance and emotional agreement.",

      suggestion:
        "Preserve friction, misunderstanding, emotional asymmetry, hesitation, and unresolved interpersonal tension.",
    });
  }

  return warnings;
}

const PREDICTABLE_EMOTION_PATTERNS = [
  "ti capisco",
  "hai ragione",
  "lo so",
  "mi dispiace",
  "non volevo ferirti",
  "sono qui",
  "va tutto bene",
  "non sei solo",
  "ti credo",
  "ti amo anch'io",
];

export function detectEmotionalPredictability(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let predictabilityDensity = 0;

  for (const pattern of PREDICTABLE_EMOTION_PATTERNS) {
    predictabilityDensity += countOccurrences(text, pattern);
  }

  if (predictabilityDensity >= 18) {
    warnings.push({
      type: "dialogue_perfection",
      severity: predictabilityDensity >= 30 ? "high" : "medium",

      message:
        "Character emotional responses may feel overly predictable, emotionally optimized, or dramatically convenient.",

      suggestion:
        "Introduce contradiction, delayed reactions, emotional avoidance, defensive humor, silence, or behavioral inconsistency.",
    });
  }

  return warnings;
}

const SYMBOLIC_OVERUSE_PATTERNS = [
  "oscurità",
  "ceneri",
  "sangue",
  "respiro",
  "occhi",
  "vuoto",
  "luce",
  "anime",
  "silenzio",
  "tempesta",
];

export function detectSymbolicOveruse(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let symbolicDensity = 0;

  for (const pattern of SYMBOLIC_OVERUSE_PATTERNS) {
    symbolicDensity += countOccurrences(text, pattern);
  }

  if (symbolicDensity >= 30) {
    warnings.push({
      type: "repetitive_symbolism",
      severity: symbolicDensity >= 50 ? "high" : "medium",

      message:
        "Certain symbolic imagery may be repeating too often and losing emotional impact.",

      suggestion:
        "Reduce repeated symbolic motifs and diversify emotional imagery with more grounded physical detail and environmental specificity.",
    });
  }

  return warnings;
}

const HIGH_INTENSITY_PATTERNS = [
  "tremava",
  "ansimò",
  "dolore",
  "paura",
  "desiderio",
  "lacrime",
  "ossessione",
  "bisogno",
  "bruciava",
  "ferita",
];

export function detectEmotionalPacingUniformity(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let intensityDensity = 0;

  for (const pattern of HIGH_INTENSITY_PATTERNS) {
    intensityDensity += countOccurrences(text, pattern);
  }

  const wordCount = text.split(" ").length;

  const intensityRatio = intensityDensity / Math.max(wordCount, 1);

  if (intensityRatio >= 0.0035) {
    warnings.push({
      type: "climax_oversaturation",
      severity: intensityRatio >= 0.006 ? "high" : "medium",

      message:
        "Narrative emotional intensity may remain too constant without tonal variation or recovery space.",

      suggestion:
        "Introduce quieter chapters, emotional restraint, mundane interactions, humor, environmental focus, or emotional asymmetry to restore pacing dynamics.",
    });
  }

  return warnings;
}

const VOICE_HOMOGENIZATION_PATTERNS = [
  "sussurrò",
  "mormorò",
  "lentamente",
  "dolcemente",
  "oscurità",
  "silenzio",
  "paura",
  "bisogno",
  "destino",
  "respiro",
];

export function detectVoiceHomogenization(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let voiceDensity = 0;

  for (const pattern of VOICE_HOMOGENIZATION_PATTERNS) {
    voiceDensity += countOccurrences(text, pattern);
  }

  if (voiceDensity >= 45) {
    warnings.push({
      type: "dialogue_perfection",
      severity: voiceDensity >= 70 ? "high" : "medium",

      message:
        "Character voices may be blending together with overly similar emotional vocabulary and cadence.",

      suggestion:
        "Differentiate character speech patterns, emotional expression styles, vocabulary, rhythm, and behavioral responses.",
    });
  }

  return warnings;
}

const PREMATURE_RESOLUTION_PATTERNS = [
  "ti amo",
  "mi fido di te",
  "non ho più paura",
  "ti perdono",
  "per sempre",
  "sei tutto",
  "siamo insieme",
  "non dubito più",
  "siamo salvi",
  "va tutto bene",
];

export function detectPrematureEmotionalResolution(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let resolutionDensity = 0;

  for (const pattern of PREMATURE_RESOLUTION_PATTERNS) {
    resolutionDensity += countOccurrences(text, pattern);
  }

  if (resolutionDensity >= 18) {
    warnings.push({
      type: "climax_oversaturation",
      severity: resolutionDensity >= 30 ? "high" : "medium",

      message:
        "Emotional payoff and relational resolution may be happening too frequently or too early, weakening long-term tension.",

      suggestion:
        "Delay reassurance, preserve uncertainty, and maintain emotional asymmetry longer to strengthen narrative tension and reader obsession.",
    });
  }

  return warnings;
}

const EMOTIONAL_CONVENIENCE_PATTERNS = [
  "anche io",
  "ti amo anch'io",
  "hai ragione",
  "lo sento anche io",
  "mi capisci",
  "siamo uguali",
  "non sei solo",
  "provo la stessa cosa",
  "non devi spiegarti",
  "ti credo subito",
];

export function detectEmotionalConvenience(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let convenienceDensity = 0;

  for (const pattern of EMOTIONAL_CONVENIENCE_PATTERNS) {
    convenienceDensity += countOccurrences(text, pattern);
  }

  if (convenienceDensity >= 14) {
    warnings.push({
      type: "dialogue_perfection",
      severity: convenienceDensity >= 24 ? "high" : "medium",

      message:
        "Emotional interactions may resolve too conveniently with overly synchronized vulnerability and mutual understanding.",

      suggestion:
        "Introduce emotional mismatch, hesitation, misunderstanding, delayed reactions, or conflicting desires to preserve realism and tension.",
    });
  }

  return warnings;
}

const INTERNALIZED_EMOTION_PATTERNS = [
  "mi sento",
  "ho paura",
  "provo",
  "capisco",
  "odio",
  "amo",
  "non riesco",
  "sono ferito",
  "mi distrugge",
  "mi fa male",
];

const BEHAVIORAL_PATTERNS = [
  "accese",
  "camminò",
  "guardò fuori",
  "si voltò",
  "prese il bicchiere",
  "chiuse gli occhi",
  "si irrigidì",
  "si passò una mano",
  "aprì la finestra",
  "rimase immobile",
];

export function detectBehavioralDeficit(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let internalizedCount = 0;
  let behavioralCount = 0;

  for (const pattern of INTERNALIZED_EMOTION_PATTERNS) {
    internalizedCount += countOccurrences(text, pattern);
  }

  for (const pattern of BEHAVIORAL_PATTERNS) {
    behavioralCount += countOccurrences(text, pattern);
  }

  if (
    internalizedCount >= 15 &&
    behavioralCount < internalizedCount * 0.45
  ) {
    warnings.push({
      type: "weak_subtext",
      severity: internalizedCount >= 30 ? "high" : "medium",

      message:
        "Characters may be verbalizing emotions too directly instead of expressing them through behavior and physicality.",

      suggestion:
        "Replace some emotional exposition with gesture, silence, movement, environmental interaction, or physical contradiction.",
    });
  }

  return warnings;
}

const TONAL_REPETITION_PATTERNS = [
  "silenzio",
  "oscurità",
  "vuoto",
  "dolore",
  "respiro",
  "paura",
  "ferita",
  "bisogno",
  "desiderio",
  "tremava",
];

export function detectTonalRepetition(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  let tonalDensity = 0;

  for (const pattern of TONAL_REPETITION_PATTERNS) {
    tonalDensity += countOccurrences(text, pattern);
  }

  const wordCount = text.split(" ").length;

  const tonalRatio = tonalDensity / Math.max(wordCount, 1);

  if (tonalRatio >= 0.0045) {
    warnings.push({
      type: "repetitive_symbolism",
      severity: tonalRatio >= 0.007 ? "high" : "medium",

      message:
        "Narrative tone may remain emotionally monochromatic for too long without tonal contrast or emotional texture variation.",

      suggestion:
        "Introduce tonal contrast through humor, coldness, ordinary interaction, conflict, detachment, environmental realism, or emotionally neutral scenes.",
    });
  }

  return warnings;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

export function calculateEditorialScores(
  warnings: EditorialWarning[]
) {
  let emotionalRedundancyPenalty = 0;
  let dialoguePenalty = 0;
  let climaxPenalty = 0;
  let subtextPenalty = 0;
  let characterPenalty = 0;

  for (const warning of warnings) {
    const severityWeight =
      warning.severity === "high" ? 12 : 6;

    switch (warning.type) {
      case "emotional_redundancy":
        emotionalRedundancyPenalty += severityWeight;
        break;

      case "dialogue_perfection":
        dialoguePenalty += severityWeight;
        break;

      case "climax_oversaturation":
        climaxPenalty += severityWeight;
        break;

      case "weak_subtext":
        subtextPenalty += severityWeight;
        break;

      case "character_flattening":
        characterPenalty += severityWeight;
        break;
    }
  }

  return {
    emotionalRealismScore: clampScore(
      100 - emotionalRedundancyPenalty
    ),

    dialogueHumanityScore: clampScore(
      100 - dialoguePenalty
    ),

    pacingBalanceScore: clampScore(
      100 - climaxPenalty
    ),

    subtextStrengthScore: clampScore(
      100 - subtextPenalty
    ),

    characterDepthScore: clampScore(
      100 - characterPenalty
    ),
  };
}

export function generateEditorialReport(
  report: EditorialReport
): string {
  const rankedWarnings = rankEditorialIssues(report.warnings);

  const criticalWarnings = rankedWarnings.filter(
    (w) => w.severity === "high"
  );

  const moderateWarnings = report.warnings.filter(
    (w) => w.severity === "medium"
  );

  const strengths: string[] = [];

  if (report.dialogueHumanityScore >= 80) {
    strengths.push(
      "Dialogue maintains strong emotional realism."
    );
  }

  if (report.subtextScore >= 80) {
    strengths.push(
      "Narrative preserves effective subtext and emotional implication."
    );
  }

  if (report.characterConsistencyScore >= 80) {
    strengths.push(
      "Characters maintain strong psychological consistency."
    );
  }

  const lines = [
    "EDITORIAL ANALYSIS",
    "",
    `Emotional Realism: ${report.emotionalRedundancyScore}/100`,
    `Dialogue Humanity: ${report.dialogueHumanityScore}/100`,
    `Pacing Balance: ${report.pacingConsistencyScore}/100`,
    `Subtext Strength: ${report.subtextScore}/100`,
    `Character Depth: ${report.characterConsistencyScore}/100`,
    "",
  ];

  if (strengths.length > 0) {
    lines.push("STRENGTHS:");

    for (const strength of strengths) {
      lines.push(`- ${strength}`);
    }

    lines.push("");
  }

  if (criticalWarnings.length > 0) {
    lines.push("CRITICAL ISSUES:");

    for (const warning of criticalWarnings) {
      lines.push(`- ${warning.message}`);
    }

    lines.push("");
  }

  if (moderateWarnings.length > 0) {
    lines.push("EDITORIAL RECOMMENDATIONS:");

    for (const warning of moderateWarnings) {
      lines.push(`- ${warning.suggestion}`);
    }
  }

  return lines.join("\n");
}

function getWarningPriorityScore(
  warning: EditorialWarning
): number {
  let score = 0;

  switch (warning.severity) {
    case "high":
      score += 100;
      break;

    case "medium":
      score += 60;
      break;

    case "low":
      score += 30;
      break;
  }

  switch (warning.type) {
    case "character_flattening":
      score += 40;
      break;

    case "dialogue_perfection":
      score += 35;
      break;

    case "climax_oversaturation":
      score += 35;
      break;

    case "weak_subtext":
      score += 30;
      break;

    case "emotional_redundancy":
      score += 25;
      break;

    case "repetitive_symbolism":
      score += 15;
      break;

    case "overwritten_scene":
      score += 20;
      break;
  }

  return score;
}

export function rankEditorialIssues(
  warnings: EditorialWarning[]
): EditorialWarning[] {
  return [...warnings].sort(
    (a, b) =>
      getWarningPriorityScore(b) -
      getWarningPriorityScore(a)
  );
}

export interface NarrativeArcAnalysis {
  openingStrength: number;
  midpointStrength: number;
  climaxStrength: number;
  endingStrength: number;

  pacingDropRisk: "low" | "medium" | "high";

  structuralWarning?: string;
}

function splitNarrativeSections(text: string) {
  const words = text.split(/\s+/);

  const sectionSize = Math.floor(words.length / 4);

  return {
    opening: words.slice(0, sectionSize).join(" "),
    midpoint: words.slice(sectionSize, sectionSize * 2).join(" "),
    climax: words.slice(sectionSize * 2, sectionSize * 3).join(" "),
    ending: words.slice(sectionSize * 3).join(" "),
  };
}

function calculateSectionIntensity(text: string): number {
  const intensityPatterns = [
    "paura",
    "desiderio",
    "amore",
    "sangue",
    "tremava",
    "ferita",
    "bisogno",
    "silenzio",
    "respiro",
    "dolore",
  ];

  let intensity = 0;

  for (const pattern of intensityPatterns) {
    intensity += countOccurrences(text, pattern);
  }

  return intensity;
}

export function analyzeNarrativeArc(
  text: string
): NarrativeArcAnalysis {
  const sections = splitNarrativeSections(text);

  const openingStrength =
    calculateSectionIntensity(sections.opening);

  const midpointStrength =
    calculateSectionIntensity(sections.midpoint);

  const climaxStrength =
    calculateSectionIntensity(sections.climax);

  const endingStrength =
    calculateSectionIntensity(sections.ending);

  let pacingDropRisk: "low" | "medium" | "high" =
    "low";

  let structuralWarning = "";

  if (
    midpointStrength <
    openingStrength * 0.55
  ) {
    pacingDropRisk = "high";

    structuralWarning =
      "Midpoint tension drops significantly compared to opening momentum.";
  } else if (
    endingStrength >
    climaxStrength * 1.4
  ) {
    pacingDropRisk = "medium";

    structuralWarning =
      "Ending may continue too long after the primary emotional climax.";
  }

  return {
    openingStrength,
    midpointStrength,
    climaxStrength,
    endingStrength,

    pacingDropRisk,

    structuralWarning,
  };
}

export interface ChapterTensionData {
  chapterIndex: number;
  intensityScore: number;
  warning?: string;
}

function splitIntoChapters(text: string): string[] {
  return text
    .split(/chapter\s+\d+|capitolo\s+\d+/i)
    .filter((c) => c.trim().length > 200);
}

export function generateChapterTensionMap(
  text: string
): ChapterTensionData[] {
  const chapters = splitIntoChapters(text);

  return chapters.map((chapter, index) => {
    const intensityPatterns = [
      "paura",
      "desiderio",
      "amore",
      "sangue",
      "ferita",
      "tremava",
      "silenzio",
      "bisogno",
      "respiro",
      "ossessione",
    ];

    let intensity = 0;

    for (const pattern of intensityPatterns) {
      intensity += countOccurrences(chapter, pattern);
    }

    let warning = "";

    if (intensity < 8) {
      warning =
        "Chapter may lack emotional momentum or narrative tension.";
    }

    if (intensity > 45) {
      warning =
        "Chapter may be emotionally oversaturated without recovery space.";
    }

    return {
      chapterIndex: index + 1,
      intensityScore: intensity,
      warning,
    };
  });
}
