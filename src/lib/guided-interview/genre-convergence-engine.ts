import type { GuidedInterviewState } from "./types";
import type { EditorialBookMode, EditorialComponentScore } from "./book-understanding-engine";
import { scoreEditorialTextQuality } from "./book-understanding-engine";
import { sanitizeDnaText } from "./dna-cleaner";

export type GenreConvergenceId =
  | "thriller"
  | "fantasy"
  | "poetry"
  | "sci-fi"
  | "crime"
  | "dark-romance"
  | "romance"
  | "horror"
  | "nonfiction"
  | "general-fiction";

export type GenreCompletionProfile = {
  id: GenreConvergenceId;
  label: string;
  requiredSignals: string[];
  optionalSignals: string[];
  exitSignals: string[];
  skipWhenCoreStrong: string[];
  blindSpotPriority: string[];
};

export type GenreConvergenceReport = {
  profileId: GenreConvergenceId;
  profile: GenreCompletionProfile;
  coreQuartetStrong: boolean;
  exitSignalsMet: boolean;
  saturated: boolean;
  loopDetected: boolean;
  genreAwareConfidence: number;
  effectiveRelevantKeys: string[];
  effectiveBlindSpots: string[];
};

export type ForgeConvergenceTracking = {
  lastQuestionKeys: string[];
  lastBlindSpots: string[];
  stagnantCycles: number;
};

const COMPONENT_MIN = 0.72;
const CORE_STRONG_MIN = 0.52;
const OVERALL_EXIT_MIN = 0.95;
const SATURATION_CYCLE_THRESHOLD = 2;

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

function blob(state: GuidedInterviewState): string {
  const ex = state.extracted || {};
  const msgs = state.messages.filter((m) => m.role === "user").map((m) => m.content);
  return [
    ...msgs,
    state.selectedGenre,
    ex.genreDNA,
    ex.genre,
    ex.subgenre,
    ex.promise,
    ex.centralConflict,
    ex.readerTransformation,
    ex.targetReader,
    ex.emotionalTone,
    ex.setting,
    ex.protagonistWound,
    ex.narrativeDrive,
  ]
    .map(clean)
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

const PROFILES: Record<GenreConvergenceId, GenreCompletionProfile> = {
  thriller: {
    id: "thriller",
    label: "Thriller",
    requiredSignals: ["genre", "conflict", "promise", "reader", "mystery", "stakes"],
    optionalSignals: ["tone", "transformation", "atmosphere"],
    exitSignals: ["genre", "conflict", "promise", "reader", "mystery", "stakes"],
    skipWhenCoreStrong: ["protagonist", "wound", "ending", "atmosphere"],
    blindSpotPriority: ["conflict", "genre", "promise", "reader", "transformation"],
  },
  crime: {
    id: "crime",
    label: "Crime",
    requiredSignals: ["genre", "conflict", "promise", "reader", "mystery", "stakes"],
    optionalSignals: ["tone", "transformation", "atmosphere"],
    exitSignals: ["genre", "conflict", "promise", "reader", "mystery", "stakes"],
    skipWhenCoreStrong: ["protagonist", "wound", "ending", "atmosphere"],
    blindSpotPriority: ["conflict", "genre", "promise", "reader"],
  },
  fantasy: {
    id: "fantasy",
    label: "Fantasy",
    requiredSignals: ["genre", "conflict", "promise", "reader", "world", "objective"],
    optionalSignals: ["tone", "transformation", "protagonist", "stakes"],
    exitSignals: ["genre", "world", "conflict", "objective", "reader"],
    skipWhenCoreStrong: ["wound", "ending", "atmosphere"],
    blindSpotPriority: ["conflict", "genre", "promise", "reader", "transformation"],
  },
  "sci-fi": {
    id: "sci-fi",
    label: "Sci-Fi",
    requiredSignals: ["genre", "concept", "conflict", "promise", "reader", "techRule", "humanCost"],
    optionalSignals: ["tone", "transformation", "world"],
    exitSignals: ["genre", "concept", "techRule", "conflict", "humanCost", "reader"],
    skipWhenCoreStrong: ["protagonist", "wound", "ending", "atmosphere"],
    blindSpotPriority: ["conflict", "genre", "promise", "reader", "transformation"],
  },
  poetry: {
    id: "poetry",
    label: "Poesia",
    requiredSignals: ["genre", "theme", "tone", "emotionalExperience", "reader"],
    optionalSignals: ["promise", "transformation", "atmosphere"],
    exitSignals: ["genre", "theme", "tone", "emotionalExperience", "reader"],
    skipWhenCoreStrong: ["conflict", "protagonist", "wound", "ending", "stakes", "mystery"],
    blindSpotPriority: ["tone", "theme", "reader", "transformation"],
  },
  "dark-romance": {
    id: "dark-romance",
    label: "Dark Romance",
    requiredSignals: ["genre", "conflict", "promise", "reader", "transformation", "tone"],
    optionalSignals: ["protagonist", "wound", "ending", "atmosphere"],
    exitSignals: ["genre", "conflict", "promise", "reader", "transformation", "tone"],
    skipWhenCoreStrong: [],
    blindSpotPriority: ["conflict", "protagonist", "wound", "transformation", "ending"],
  },
  romance: {
    id: "romance",
    label: "Romance",
    requiredSignals: ["genre", "conflict", "promise", "reader", "transformation", "tone"],
    optionalSignals: ["protagonist", "wound", "ending", "atmosphere"],
    exitSignals: ["genre", "conflict", "promise", "reader", "transformation", "tone"],
    skipWhenCoreStrong: [],
    blindSpotPriority: ["conflict", "protagonist", "transformation", "ending"],
  },
  horror: {
    id: "horror",
    label: "Horror",
    requiredSignals: ["genre", "conflict", "promise", "reader", "stakes", "tone"],
    optionalSignals: ["mystery", "protagonist", "wound", "ending", "atmosphere"],
    exitSignals: ["genre", "conflict", "promise", "reader", "stakes", "tone"],
    skipWhenCoreStrong: ["wound"],
    blindSpotPriority: ["conflict", "genre", "promise", "reader", "transformation"],
  },
  nonfiction: {
    id: "nonfiction",
    label: "Nonfiction",
    requiredSignals: ["genre", "conflict", "promise", "reader", "transformation"],
    optionalSignals: ["tone", "concept"],
    exitSignals: ["genre", "conflict", "promise", "reader", "transformation"],
    skipWhenCoreStrong: [],
    blindSpotPriority: ["conflict", "promise", "transformation", "reader"],
  },
  "general-fiction": {
    id: "general-fiction",
    label: "Narrativa",
    requiredSignals: ["genre", "conflict", "promise", "reader", "transformation", "tone"],
    optionalSignals: ["protagonist", "wound", "ending", "atmosphere"],
    exitSignals: ["genre", "conflict", "promise", "reader", "transformation"],
    skipWhenCoreStrong: ["wound"],
    blindSpotPriority: ["conflict", "genre", "promise", "reader", "transformation"],
  },
};

export function detectGenreConvergenceProfile(
  state: GuidedInterviewState,
  mode: EditorialBookMode,
): GenreConvergenceId {
  const text = blob(state);

  if (mode === "poetry" || /poesia|poetico|versi|raccolta poetica|lirica|nostalgia/.test(text)) {
    return "poetry";
  }
  if (mode === "nonfiction") return "nonfiction";

  if (/sci[- ]?fi|fantascienza|distopia|cyberpunk|spazio|astronave|tecnolog|memor.*cancell|cancell.*memor|cancell.*ricord|ricord.*cancell/.test(text)) {
    return "sci-fi";
  }
  if (
    /omicidio|delitto|crimine|giallo|noir|detective|stanza chiusa|assassinio|indagine.*omicid/.test(text) &&
    !/thriller psicologico/.test(text)
  ) {
    return "crime";
  }
  if (/thriller|suspense|indagine|mistero|non avrebbe dovuto trovare|verità nascosta|paranoia/.test(text)) {
    return "thriller";
  }
  if (/fantasy|regno|magia|città che non|mondo.*regol|epic|drago|regno decadente/.test(text)) {
    return "fantasy";
  }
  if (/dark romance|slow burn.*pericol|ossessione.*morale/.test(text)) return "dark-romance";
  if (/horror|gotico|inquietante|paura/.test(text)) return "horror";
  if (/romance|amore|relazione/.test(text)) return "romance";

  return "general-fiction";
}

function scoreSignal(texts: Array<string | undefined>): EditorialComponentScore {
  const evidence = texts.map(clean).filter(Boolean);
  if (!evidence.length) return { score: 0, weak: true, evidence: [] };
  const scores = evidence.map(scoreEditorialTextQuality);
  const score = Math.max(...scores);
  return { score, weak: score < COMPONENT_MIN, evidence };
}

function scorePattern(text: string, patterns: RegExp[], minLength = 24): EditorialComponentScore {
  const t = clean(text).toLowerCase();
  if (!t || t.length < minLength) return { score: 0, weak: true, evidence: [] };
  const hits = patterns.filter((p) => p.test(t)).length;
  const base = scoreEditorialTextQuality(t);
  const score = hits > 0 ? Math.max(base, Math.min(0.92, 0.68 + hits * 0.08)) : base;
  return { score, weak: score < COMPONENT_MIN, evidence: hits ? [t.slice(0, 120)] : [] };
}

/** Genre-specific signal components layered on editorial components. */
export function buildGenreSignalComponents(state: GuidedInterviewState): Record<string, EditorialComponentScore> {
  const ex = state.extracted || {};
  const text = blob(state);
  const conflictBlob = [ex.centralConflict, ex.narrativeDrive, ex.promise, text].join(" ");
  const conceptBlob = [ex.genreDNA, ex.promise, ex.centralConflict, state.messages.find((m) => m.role === "user")?.content].join(" ");

  return {
    mystery: scorePattern(
      conflictBlob,
      [
        /mistero|segreto|scoprire|indagine|non avrebbe dovuto|verità|colpevole|file|prova|stanza chiusa|impossibile|omicidio|delitto/,
      ],
    ),
    stakes: scorePattern(
      conflictBlob,
      [/pericolo|rischio|posta in gioco|minaccia|costa|silenzi|trappola|annient|distrugg|paura/],
    ),
    world: scorePattern(
      [ex.setting, ex.genreDNA, ex.emotionalTone, text].join(" "),
      [/mondo|regno|città|foresta|magia|regol|legge|atmosfera|luogo|ambient|esiste|sospes|decadent/],
      18,
    ),
    objective: scorePattern(
      [ex.promise, ex.centralConflict, ex.readerTransformation].join(" "),
      [/obiettivo|desiderio|salvare|scoprire|impedire|ritrovare|sopravvivere|prezzo|destino|costo/],
      20,
    ),
    theme: scorePattern(
      [ex.promise, ex.genreDNA, ex.centralConflict, ex.emotionalTone].join(" "),
      [/nostalgia|memoria|tema|dolore|verità|immagine|silenzio|tempo|amore|perdita|ritorno/],
      16,
    ),
    emotionalExperience: scorePattern(
      [ex.readerTransformation, ex.emotionalTone, ex.promise].join(" "),
      [/attravers|malincon|tenerezza|rinascita|emotiv|sentire|resta addosso|esperienza|respiro|liric/],
      16,
    ),
    techRule: scorePattern(
      conceptBlob,
      [/tecnolog|memori|invenzione|regola|sistema|impiant|chip|algoritm|distopi|cancell|manipol/],
      18,
    ),
    humanCost: scorePattern(
      [ex.readerTransformation, ex.centralConflict, ex.promise].join(" "),
      [/conseguenz|umana|identità|perdere|costo|libertà|verità|anima|coscienza|dolore/],
      18,
    ),
    concept: scoreSignal([ex.genreDNA, ex.promise, ex.centralConflict, state.messages.find((m) => m.role === "user")?.content]),
  };
}

export function hasCoreQuartetStrong(components: Record<string, EditorialComponentScore>): boolean {
  const keys = ["genre", "conflict", "promise", "reader"];
  return keys.every((k) => (components[k]?.score ?? 0) >= CORE_STRONG_MIN);
}

function averageScore(keys: string[], components: Record<string, EditorialComponentScore>): number {
  const scores = keys.map((k) => components[k]?.score ?? 0).filter((s) => s > 0);
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}

export function computeGenreAwareConfidence(
  components: Record<string, EditorialComponentScore>,
  profile: GenreCompletionProfile,
  coreQuartetStrong: boolean,
): number {
  const requiredAvg = averageScore(profile.requiredSignals, components);
  const optionalAvg = averageScore(profile.optionalSignals, components);

  if (coreQuartetStrong) {
    const weighted = requiredAvg * 0.88 + optionalAvg * 0.12;
    if (requiredAvg >= COMPONENT_MIN) return Math.min(0.99, Math.max(0.95, weighted));
    return Math.min(0.94, requiredAvg * 0.9 + optionalAvg * 0.1);
  }

  return Math.min(0.94, requiredAvg * 0.82 + optionalAvg * 0.18);
}

export function exitSignalsSatisfied(
  components: Record<string, EditorialComponentScore>,
  profile: GenreCompletionProfile,
): boolean {
  return profile.exitSignals.every((key) => (components[key]?.score ?? 0) >= COMPONENT_MIN);
}

export function resolveEffectiveRelevantKeys(
  profile: GenreCompletionProfile,
  coreQuartetStrong: boolean,
): string[] {
  if (!coreQuartetStrong) return [...profile.requiredSignals, ...profile.optionalSignals];
  return profile.requiredSignals.filter((k) => !profile.skipWhenCoreStrong.includes(k));
}

export function resolveEffectiveBlindSpots(
  profile: GenreCompletionProfile,
  components: Record<string, EditorialComponentScore>,
  coreQuartetStrong: boolean,
  modeBlindSpots: string[],
): string[] {
  const spots: string[] = [];

  for (const key of profile.blindSpotPriority) {
    const componentKey = BLIND_SPOT_TO_COMPONENT[key] ?? key;
    if (profile.skipWhenCoreStrong.includes(componentKey) && coreQuartetStrong) continue;
    if ((components[componentKey]?.score ?? 0) < COMPONENT_MIN) spots.push(key);
  }

  for (const spot of modeBlindSpots) {
    const componentKey = BLIND_SPOT_TO_COMPONENT[spot] ?? spot;
    if (profile.skipWhenCoreStrong.includes(componentKey) && coreQuartetStrong) continue;
    if (!spots.includes(spot) && (components[componentKey]?.score ?? 0) < COMPONENT_MIN) {
      spots.push(spot);
    }
  }

  return spots;
}

const BLIND_SPOT_TO_COMPONENT: Record<string, string> = {
  conflict: "conflict",
  genre: "genre",
  promise: "promise",
  reader: "reader",
  transformation: "transformation",
  protagonist: "protagonist",
  wound: "wound",
  ending: "ending",
  atmosphere: "atmosphere",
  tone: "tone",
  theme: "theme",
  method: "genre",
};

export function detectSaturation(
  state: GuidedInterviewState,
  components: Record<string, EditorialComponentScore>,
  profile: GenreCompletionProfile,
): boolean {
  if (!hasCoreQuartetStrong(components)) return false;
  const requiredStrong = profile.requiredSignals.filter(
    (k) => (components[k]?.score ?? 0) >= COMPONENT_MIN,
  ).length;
  const ratio = requiredStrong / Math.max(1, profile.requiredSignals.length);
  const userTurns = state.messages.filter((m) => m.role === "user").length;
  return ratio >= 0.83 && userTurns >= 3 && exitSignalsSatisfied(components, profile);
}

export function detectUnderstandingLoop(tracking?: ForgeConvergenceTracking): boolean {
  if (!tracking) return false;
  return tracking.stagnantCycles >= SATURATION_CYCLE_THRESHOLD;
}

export function updateConvergenceTracking(
  tracking: ForgeConvergenceTracking | undefined,
  questionKey: string,
  blindSpots: string[],
): ForgeConvergenceTracking {
  const prev = tracking ?? { lastQuestionKeys: [], lastBlindSpots: [], stagnantCycles: 0 };
  const blindSpotKey = blindSpots.slice(0, 2).join("|");
  const prevBlindSpotKey = prev.lastBlindSpots.slice(0, 2).join("|");
  const sameArea =
    prev.lastQuestionKeys.slice(-2).includes(questionKey) ||
    (blindSpotKey.length > 0 && blindSpotKey === prevBlindSpotKey);

  return {
    lastQuestionKeys: [...prev.lastQuestionKeys.slice(-5), questionKey],
    lastBlindSpots: blindSpots.slice(0, 4),
    stagnantCycles: sameArea ? prev.stagnantCycles + 1 : 0,
  };
}

export function evaluateGenreConvergence(
  state: GuidedInterviewState,
  mode: EditorialBookMode,
  baseComponents: Record<string, EditorialComponentScore>,
  modeBlindSpots: string[],
): GenreConvergenceReport {
  const profileId = detectGenreConvergenceProfile(state, mode);
  const profile = PROFILES[profileId];
  const genreSignals = buildGenreSignalComponents(state);
  const components = { ...baseComponents, ...genreSignals };

  const coreQuartetStrong = hasCoreQuartetStrong(components);
  const exitSignalsMet = exitSignalsSatisfied(components, profile);
  const saturated = detectSaturation(state, components, profile);
  const loopDetected = detectUnderstandingLoop(state.forgeConvergence);
  const genreAwareConfidence = computeGenreAwareConfidence(components, profile, coreQuartetStrong);
  const effectiveRelevantKeys = resolveEffectiveRelevantKeys(profile, coreQuartetStrong);
  const effectiveBlindSpots = resolveEffectiveBlindSpots(
    profile,
    components,
    coreQuartetStrong,
    modeBlindSpots,
  );

  if (saturated || loopDetected) {
    return {
      profileId,
      profile,
      coreQuartetStrong,
      exitSignalsMet,
      saturated: true,
      loopDetected,
      genreAwareConfidence: Math.max(genreAwareConfidence, OVERALL_EXIT_MIN),
      effectiveRelevantKeys,
      effectiveBlindSpots: loopDetected ? effectiveBlindSpots.slice(1) : [],
    };
  }

  return {
    profileId,
    profile,
    coreQuartetStrong,
    exitSignalsMet,
    saturated,
    loopDetected,
    genreAwareConfidence,
    effectiveRelevantKeys,
    effectiveBlindSpots,
  };
}

export function genreAwareCanExplainBook(
  components: Record<string, EditorialComponentScore>,
  profile: GenreCompletionProfile,
  mode: EditorialBookMode,
  coreQuartetStrong = false,
): boolean {
  if (mode === "poetry") {
    return profile.exitSignals.every((k) => (components[k]?.score ?? 0) >= COMPONENT_MIN);
  }

  const toneOk =
    (components.tone?.score ?? 0) >= COMPONENT_MIN ||
    (components.atmosphere?.score ?? 0) >= COMPONENT_MIN ||
    profile.id === "thriller" ||
    profile.id === "crime" ||
    profile.id === "sci-fi";

  if (exitSignalsSatisfied(components, profile)) return toneOk;

  if (coreQuartetStrong) {
    const exitHits = profile.exitSignals.filter(
      (k) => (components[k]?.score ?? 0) >= COMPONENT_MIN,
    ).length;
    const exitRatio = exitHits / Math.max(1, profile.exitSignals.length);
    if (exitRatio >= 0.83) return toneOk;
  }

  return false;
}

export function genreAwareReadyForUnderstanding(
  convergence: GenreConvergenceReport,
  components: Record<string, EditorialComponentScore>,
  contradictionsResolved: boolean,
): boolean {
  if (!contradictionsResolved) return false;

  if (convergence.saturated || convergence.exitSignalsMet) {
    return convergence.genreAwareConfidence >= OVERALL_EXIT_MIN;
  }

  if (convergence.coreQuartetStrong && convergence.genreAwareConfidence >= OVERALL_EXIT_MIN) {
    const exitHits = convergence.profile.exitSignals.filter(
      (k) => (components[k]?.score ?? 0) >= COMPONENT_MIN,
    ).length;
    const exitRatio = exitHits / Math.max(1, convergence.profile.exitSignals.length);
    if (exitRatio >= 0.83) return true;
  }

  const requiredStrong = convergence.profile.requiredSignals.every(
    (k) => (components[k]?.score ?? 0) >= COMPONENT_MIN,
  );
  return requiredStrong && convergence.genreAwareConfidence >= OVERALL_EXIT_MIN;
}

export function getProfileForId(id: GenreConvergenceId): GenreCompletionProfile {
  return PROFILES[id];
}
