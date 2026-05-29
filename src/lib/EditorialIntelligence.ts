import { Genre } from "@/types/book";
import { detectBookIntelligence } from "@/lib/book-intelligence";

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

export interface EditorialGenreProfile {
  genre: Genre;
  label: string;
  expectations: string[];
  scoreWeights: {
    hook: number;
    clarity: number;
    originality: number;
    emotionalImpact: number;
    pacing: number;
  };
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

const EDITORIAL_GENRE_PROFILES: Partial<Record<Genre, EditorialGenreProfile>> = {
  "self-help": {
    genre: "self-help",
    label: "Self-help",
    expectations: [
      "Strong conceptual clarity and an immediately compelling promise.",
      "Memorable insight rather than generic advice.",
      "Practical specificity with examples readers can apply.",
      "Low repetition and a confident, authentic voice."
    ],
    scoreWeights: {
      hook: 0.17,
      clarity: 0.17,
      originality: 0.22,
      emotionalImpact: 0.14,
      pacing: 0.15,
    },
  },
  "business": {
    genre: "business",
    label: "Business",
    expectations: [
      "Clear commercial framing and actionable reasoning.",
      "Credible examples or case studies that ground the argument.",
      "A strong authorial voice with practical authority.",
      "Concise structure that avoids generic management platitudes."
    ],
    scoreWeights: {
      hook: 0.15,
      clarity: 0.18,
      originality: 0.16,
      emotionalImpact: 0.13,
      pacing: 0.15,
    },
  },
  "productivity": {
    genre: "productivity",
    label: "Productivity",
    expectations: [
      "A clear opening promise backed by useful mechanics.",
      "Specific, memorable routines rather than vague motivation.",
      "Smart sequencing of ideas with practical next steps.",
      "A confident tone that feels expert and human, not generic."
    ],
    scoreWeights: {
      hook: 0.18,
      clarity: 0.19,
      originality: 0.16,
      emotionalImpact: 0.12,
      pacing: 0.15,
    },
  },
  "psychology": {
    genre: "psychology",
    label: "Psychology",
    expectations: [
      "Psychological nuance and grounded emotional reasoning.",
      "Clear, evidence-aware voice that remains accessible.",
      "Ideas presented with nuance, not pop-psychology generalities.",
      "A strong authorial perspective that feels both credible and empathetic."
    ],
    scoreWeights: {
      hook: 0.14,
      clarity: 0.18,
      originality: 0.18,
      emotionalImpact: 0.14,
      pacing: 0.14,
    },
  },
  "education": {
    genre: "education",
    label: "Education",
    expectations: [
      "Clear learning outcomes and structured progression.",
      "Concrete examples, explanations, and accessible pacing.",
      "A strong sense of why each section matters for the reader.",
      "Precise definitions and less generic teaching language."
    ],
    scoreWeights: {
      hook: 0.14,
      clarity: 0.2,
      originality: 0.15,
      emotionalImpact: 0.12,
      pacing: 0.14,
    },
  },
  "health": {
    genre: "health",
    label: "Health",
    expectations: [
      "Practical credibility and relatable wellbeing guidance.",
      "Specific examples or evidence rather than broad wellness slogans.",
      "A calm, trustworthy tone that supports the reader's confidence.",
      "Clear structure and a grounded, actionable style."
    ],
    scoreWeights: {
      hook: 0.14,
      clarity: 0.19,
      originality: 0.14,
      emotionalImpact: 0.12,
      pacing: 0.14,
    },
  },
  "health-medicine": {
    genre: "health-medicine",
    label: "Health",
    expectations: [
      "Practical credibility and relatable wellbeing guidance.",
      "Specific examples or evidence rather than broad wellness slogans.",
      "A calm, trustworthy tone that supports the reader's confidence.",
      "Clear structure and a grounded, actionable style."
    ],
    scoreWeights: {
      hook: 0.14,
      clarity: 0.19,
      originality: 0.14,
      emotionalImpact: 0.12,
      pacing: 0.14,
    },
  },
  "spirituality": {
    genre: "spirituality",
    label: "Spirituality",
    expectations: [
      "Clear spiritual promise with grounded language.",
      "Concrete practice or insight rather than abstract clichés.",
      "Emotional resonance without losing practical clarity.",
      "A distinct voice that feels wise and present."
    ],
    scoreWeights: {
      hook: 0.14,
      clarity: 0.16,
      originality: 0.16,
      emotionalImpact: 0.17,
      pacing: 0.13,
    },
  },
  "memoir": {
    genre: "memoir",
    label: "Memoir",
    expectations: [
      "Authentic scenes with emotional specificity.",
      "A strong personal voice that feels grounded and honest.",
      "Meaningful reflection rooted in concrete experience.",
      "Clear pacing and narrative shape rather than loose memoir fragments."
    ],
    scoreWeights: {
      hook: 0.16,
      clarity: 0.16,
      originality: 0.16,
      emotionalImpact: 0.18,
      pacing: 0.14,
    },
  },
  "romance": {
    genre: "romance",
    label: "Romance",
    expectations: [
      "Strong chemistry and a clear attraction/conflict balance.",
      "Emotion shown through behavior, not only through talk.",
      "Tension that keeps desire and stakes alive.",
      "Subtext that makes the relationship feel specific and urgent."
    ],
    scoreWeights: {
      hook: 0.16,
      clarity: 0.14,
      originality: 0.16,
      emotionalImpact: 0.2,
      pacing: 0.16,
    },
  },
  "dark-romance": {
    genre: "dark-romance",
    label: "Dark Romance",
    expectations: [
      "Dangerous chemistry and emotional friction.",
      "Controlled emotional pacing with push/pull tension.",
      "Subtext and conflict that keep the romance from resolving too fast.",
      "A sense of risk and emotional ambiguity rather than tidy reassurance."
    ],
    scoreWeights: {
      hook: 0.16,
      clarity: 0.12,
      originality: 0.16,
      emotionalImpact: 0.2,
      pacing: 0.18,
    },
  },
  "thriller": {
    genre: "thriller",
    label: "Thriller",
    expectations: [
      "Escalating suspense and clear stakes.",
      "Information withheld with smart reveals.",
      "Momentum that keeps the reader moving chapter to chapter.",
      "A sense of danger and urgency without losing coherence."
    ],
    scoreWeights: {
      hook: 0.2,
      clarity: 0.12,
      originality: 0.14,
      emotionalImpact: 0.15,
      pacing: 0.2,
    },
  },
  "fantasy": {
    genre: "fantasy",
    label: "Fantasy",
    expectations: [
      "Immersive world detail and consistent concept logic.",
      "Emotional stakes tied to the world and characters.",
      "Mystery that feels grounded in the setting.",
      "Sensory specificity that makes the world feel distinct."
    ],
    scoreWeights: {
      hook: 0.15,
      clarity: 0.14,
      originality: 0.18,
      emotionalImpact: 0.15,
      pacing: 0.16,
    },
  },
  "sci-fi": {
    genre: "sci-fi",
    label: "Sci-Fi",
    expectations: [
      "Clear concept and believable world rules.",
      "Emotional stakes that connect to the speculative idea.",
      "Specific technological or futuristic detail.",
      "A balance between plot momentum and idea clarity."
    ],
    scoreWeights: {
      hook: 0.18,
      clarity: 0.16,
      originality: 0.18,
      emotionalImpact: 0.14,
      pacing: 0.16,
    },
  },
  "mystery": {
    genre: "mystery",
    label: "Mystery",
    expectations: [
      "A compelling question or secret at the center of the story.",
      "Clues and suspense that feel purposefully layered.",
      "Character motivation that explains the investigation.",
      "A controlled reveal that preserves intrigue and payoff."
    ],
    scoreWeights: {
      hook: 0.18,
      clarity: 0.14,
      originality: 0.16,
      emotionalImpact: 0.14,
      pacing: 0.18,
    },
  },
  "crime": {
    genre: "crime",
    label: "Crime",
    expectations: [
      "Threat and authority that feel real and structured.",
      "A clear procedural or moral axis for the conflict.",
      "Behavioral detail and stakes rooted in crime world reality.",
      "Tension that is driven by risk, consequences, and choice."
    ],
    scoreWeights: {
      hook: 0.16,
      clarity: 0.14,
      originality: 0.15,
      emotionalImpact: 0.16,
      pacing: 0.18,
    },
  },
  "literary-fiction": {
    genre: "literary-fiction",
    label: "Literary Fiction",
    expectations: [
      "Language with precision and emotional specificity.",
      "Depth of ideas without losing narrative grip.",
      "A strong authorial voice and thematic coherence.",
      "Scenes that resonate through detail, mood, and subtext."
    ],
    scoreWeights: {
      hook: 0.14,
      clarity: 0.16,
      originality: 0.2,
      emotionalImpact: 0.18,
      pacing: 0.14,
    },
  },
  "manual": {
    genre: "manual",
    label: "Manual",
    expectations: [
      "Straightforward guidance and easy-to-follow structure.",
      "Useful, concrete examples and clear language.",
      "A helpful tone that feels practical rather than preachy.",
      "A strong sense of what the reader can do next."
    ],
    scoreWeights: {
      hook: 0.14,
      clarity: 0.2,
      originality: 0.13,
      emotionalImpact: 0.12,
      pacing: 0.14,
    },
  },
  "default": {
    genre: "self-help",
    label: "General",
    expectations: [
      "A clear editorial focus and readable pacing.",
      "Stronger specificity instead of generic phrasing.",
      "A sense that the manuscript has a distinct voice.",
      "Editorial coherence that matches the material's category."
    ],
    scoreWeights: {
      hook: 0.15,
      clarity: 0.15,
      originality: 0.15,
      emotionalImpact: 0.15,
      pacing: 0.15,
    },
  },
};

export function getEditorialGenreProfile(genre: Genre): EditorialGenreProfile {
  return EDITORIAL_GENRE_PROFILES[genre] || EDITORIAL_GENRE_PROFILES["default"]!;
}

function editorialWarningPenalty(type: EditorialWarning["type"]): number {
  switch (type) {
    case "emotional_redundancy":
      return 1;
    case "dialogue_perfection":
      return 1;
    case "climax_oversaturation":
      return 1;
    case "weak_subtext":
      return 1;
    case "character_flattening":
      return 1;
    case "repetitive_symbolism":
      return 1;
    case "overwritten_scene":
      return 1;
    default:
      return 1;
  }
}

export function calculateEditorialChapterScore(
  params: {
    wordCount: number;
    paragraphs: number;
    avgSentenceWords: number;
    longSentenceRatio: number;
    repeatDensity: number;
    openingWords: number;
    quoteMarks: number;
    warningTypes: string[];
    genre: Genre;
  }
): number {
  const {
    wordCount,
    paragraphs,
    avgSentenceWords,
    longSentenceRatio,
    repeatDensity,
    openingWords,
    quoteMarks,
    warningTypes,
    genre,
  } = params;

  const profile = getEditorialGenreProfile(genre).scoreWeights;
  const lengthScore =
    wordCount < 400 ? -3 : wordCount < 700 ? -1 : wordCount > 5200 ? -3 : 2;
  const sentenceScore = avgSentenceWords <= 18 ? 2 : avgSentenceWords <= 24 ? 1 : avgSentenceWords <= 28 ? 0 : -1;
  const paragraphScore = paragraphs >= Math.max(3, Math.floor(wordCount / 650)) ? 1 : genre === "self-help" ? 0 : -1;
  const repeatScore = repeatDensity < 0.03 ? 2 : repeatDensity < 0.055 ? 1 : repeatDensity < 0.08 ? 0 : -1;
  const openingScore = openingWords < 110 ? 2 : openingWords < 140 ? 0 : openingWords < 165 ? -1 : -2;
  const dialogueScore = quoteMarks >= 8 ? 2 : quoteMarks >= 4 ? 1 : 0;
  const sentenceFlowScore = Math.max(-2, Math.min(2, Math.round((0.22 - longSentenceRatio) * 8)));
  const selfHelpBonus =
    genre === "self-help" && repeatDensity < 0.055 && openingWords <= 150 && paragraphs >= Math.max(2, Math.floor(wordCount / 700))
      ? 1
      : 0;
  const fantasyBonus =
    genre === "fantasy" && repeatDensity < 0.25 && longSentenceRatio < 0.28
      ? 1
      : 0;

  const baseScore = 65;
  const weightedSum =
    lengthScore * profile.clarity +
    sentenceScore * profile.clarity +
    sentenceFlowScore * profile.clarity +
    paragraphScore * profile.clarity +
    repeatScore * profile.originality +
    openingScore * profile.hook +
    dialogueScore * profile.emotionalImpact;

  const warningPenalty = Math.min(
    warningTypes.reduce((sum, type) => {
      return sum + editorialWarningPenalty(type as EditorialWarning["type"]);
    }, 0),
    6
  );

  const score =
    baseScore +
    weightedSum * 1.45 -
    warningPenalty * (1 + profile.pacing * 0.22) +
    selfHelpBonus;

  return Math.max(35, Math.min(98, Math.round(score)));
}

export function detectEditorialGenre(text: string): Genre {
  const lower = text.toLowerCase();
  const wordCount = (text.match(/[\p{L}\p{N}]+/gu) || []).length;
  const quoteCount = (text.match(/[“”"]/g) || []).length;
  const dramaSignals = [
    /\b(dark romance|dark-romance|ossessione|passione pericolosa|attrazione pericolosa|amore proibito|chemistry|tensione erotica)\b/i,
    /\b(amore|relazione|romance|love|cuore|bacio|incontro romantico)\b/i,
  ];
  const thrillerSignals = [
    /\b(thriller|suspense|murder|killer|kidnap|investigation|investigazione|detective|police|hunt|caccia|segreto|shadow|omicidio)\b/i,
  ];
  const fantasySignals = [
    /\b(fantasy|magic|magia|kingdom|reame|wizard|wizardry|dragon|portal|myth|mythic|sorcery)\b/i,
  ];
  const scifiSignals = [
    /\b(scifi|sci-fi|science fiction|space|alien|robot|cyborg|futuristic|futuro|AI|intelligenza artificiale|technology|tecnologia)\b/i,
  ];
  const mysterySignals = [
    /\b(mystery|mistero|clue|enigma|detective|indagine|whodunit|sospetto)\b/i,
  ];
  const crimeSignals = [
    /\b(crime|criminal|mafia|gang|noir|cartel|mob|police procedural|polizia|poliziotto|detective|omicidio|furto|rapina)\b/i,
  ];
  const nonfictionSignals = [
    /\b(self-help|self help|mindset|personal growth|cambiamento|abitudine|habit|motivation|motivazione|marketing|business|sales|azienda|cliente|vendite|mercato|health|wellness|salute|medicina|therapy|terapia|educazione|education|learning|imparare|guide|manual|tutorial|istruzioni)\b/i,
  ];
  const memoirSignals = [
    /\b(memoir|memoria|ricordo|vita reale|autobiography|autobiografico|my story|mia storia|il mio)\b/i,
  ];
  const spiritualitySignals = [
    /\b(spirituality|spirituale|sacred|sacrale|faith|fede|meditation|meditazione|soul|anima|energia|chakra|rituale)\b/i,
  ];
  const psychologySignals = [
    /\b(psychology|psicologia|therapy|terapia|trauma|cognitive|emotional|emozionale|mind|mente|neuroscience|neuroscienza)\b/i,
  ];
  const productivitySignals = [
    /\b(productivity|produttività|efficiency|efficienza|focus|obiettivi|goals|time management|gestione del tempo|routine|habits|abitudini)\b/i,
  ];
  const educationSignals = [
    /\b(education|educazione|learning|apprendimento|lesson|lezione|course|corso|study|studiare|teaching|insegnare)\b/i,
  ];
  const healthSignals = [
    /\b(health|wellness|wellbeing|salute|fitness|nutrition|dieta|doctor|medico|medicina|medical|nutrizione)\b/i,
  ];
  const horticultureSignals = [
    /\b(garden|giardin|orto|coltiv|pomod|horticultur|agricol|potatura|compost|ortaggi|frutteto|vigna)\b/i,
  ];

  if (crimeSignals.some((pattern) => pattern.test(lower)) && !fantasySignals.some((pattern) => pattern.test(lower))) return "crime";
  if (thrillerSignals.some((pattern) => pattern.test(lower)) && quoteCount < 50) return "thriller";
  if (fantasySignals.some((pattern) => pattern.test(lower))) return "fantasy";
  if (scifiSignals.some((pattern) => pattern.test(lower))) return "sci-fi";
  if (mysterySignals.some((pattern) => pattern.test(lower)) && !thrillerSignals.some((pattern) => pattern.test(lower))) return "mystery";
  if (dramaSignals.some((pattern) => pattern.test(lower)) && !crimeSignals.some((pattern) => pattern.test(lower))) return "romance";
  if (spiritualitySignals.some((pattern) => pattern.test(lower))) return "spirituality";
  if (psychologySignals.some((pattern) => pattern.test(lower))) return "psychology";
  if (productivitySignals.some((pattern) => pattern.test(lower))) return "productivity";
  if (educationSignals.some((pattern) => pattern.test(lower))) return "education";
  if (horticultureSignals.some((pattern) => pattern.test(lower))) return "gardening";
  if (healthSignals.some((pattern) => pattern.test(lower))) return "health";
  if (memoirSignals.some((pattern) => pattern.test(lower)) && quoteCount < 40) return "memoir";
  if (nonfictionSignals.some((pattern) => pattern.test(lower)) && wordCount < 12000) return "self-help";
  if (quoteCount > 20 && /\b(chapter|capitolo|prologue|epilogue|section|sezione)\b/i.test(lower)) return "mystery";

  const intel = detectBookIntelligence({ idea: text.slice(0, 4000) });
  if (intel.confidence >= 0.55) return intel.resolvedGenre;

  return "manual";
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
  const warnings = collectEditorialWarnings(text);
  const scores = calculateEditorialScores(warnings);

  return {
    emotionalRedundancyScore: scores.emotionalRealismScore,
    dialogueHumanityScore: scores.dialogueHumanityScore,
    pacingConsistencyScore: scores.pacingBalanceScore,
    climaxDensityScore: calculateClimaxDensityScore(text),
    subtextScore: scores.subtextStrengthScore,
    characterConsistencyScore: scores.characterDepthScore,
    warnings,
  };
}

function collectEditorialWarnings(text: string): EditorialWarning[] {
  return [
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

function countClimaxPatternHits(text: string): number {
  let hits = 0;
  for (const pattern of CLIMAX_PATTERNS) {
    hits += countOccurrences(text, pattern);
  }
  return hits;
}

/** 0–100 density index from climax declaration patterns (higher = more saturated). */
export function calculateClimaxDensityScore(text: string): number {
  const hits = countClimaxPatternHits(text);
  if (hits === 0) return 0;

  const wordCount = Math.max(1, (text.match(/[\p{L}\p{N}]+/gu) || []).length);
  const perThousand = (hits / wordCount) * 1000;
  const raw = hits * 2.2 + perThousand * 3.5;
  return clampScore(Math.round(raw));
}

export function detectClimaxOversaturation(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  const climaxDensity = countClimaxPatternHits(text);

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
    `Climax Density: ${report.climaxDensityScore}/100`,
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
