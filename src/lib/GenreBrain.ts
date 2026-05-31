import type { BookConfig, Chapter } from "@/types/book";
import { adaptSupremeToGenreBrainProfile } from "@/lib/genre-brain-supreme";

export const GENRE_BRAIN_STORAGE_KEY = "scriptora-genre-brain-enabled";

export type GenreBrainId = "romance" | "thriller" | "fantasy" | "crime" | "nonfiction" | "default";

export type GenreBrainRefinementStep =
  | "dialogueIntent"
  | "plainEmotion"
  | "perfectDialogue"
  | "explainedEmotion"
  | "bodyBeat"
  | "therapistClarity"
  | "poetryBalance"
  | "humanWritingV2"
  | "tension";

export type GenreBrainWeights = {
  tensionSensitivity: number;
  emotionalPacing: number;
  dialogueRealism: number;
  poeticDensityTolerance: number;
  introspectionAmount: number;
  subtextLevel: number;
};

export type GenreBrainProfile = {
  id: GenreBrainId;
  label: string;
  enabled: boolean;
  maxChangePercent: number;
  stepWeights: Record<GenreBrainRefinementStep, number>;
  weights: GenreBrainWeights;
  pacingStyle: "longing" | "suspense" | "immersive" | "danger" | "clarity" | "neutral";
  notes: string[];
};

export type GenreBrainContext = {
  config?: Partial<BookConfig>;
  previousChapters?: Array<Pick<Chapter, "title" | "content">>;
  genreBrainEnabled?: boolean;
};

const DEFAULT_STEP_WEIGHTS: Record<GenreBrainRefinementStep, number> = {
  dialogueIntent: 1,
  plainEmotion: 1,
  perfectDialogue: 1,
  explainedEmotion: 1,
  bodyBeat: 1,
  therapistClarity: 1,
  poetryBalance: 1,
  humanWritingV2: 1,
  tension: 1,
};

const NEUTRAL_WEIGHTS: GenreBrainWeights = {
  tensionSensitivity: 0,
  emotionalPacing: 0,
  dialogueRealism: 0,
  poeticDensityTolerance: 0,
  introspectionAmount: 0,
  subtextLevel: 0,
};

function clampInfluence(value: number): number {
  return Math.max(-0.15, Math.min(0.15, value));
}

function weighted(value: number): number {
  return 1 + clampInfluence(value);
}

function profile(
  id: GenreBrainId,
  label: string,
  maxChangePercent: number,
  weights: GenreBrainWeights,
  stepInfluence: Partial<Record<GenreBrainRefinementStep, number>>,
  pacingStyle: GenreBrainProfile["pacingStyle"],
  notes: string[],
): GenreBrainProfile {
  const stepWeights = { ...DEFAULT_STEP_WEIGHTS };
  for (const [step, influence] of Object.entries(stepInfluence) as Array<[GenreBrainRefinementStep, number]>) {
    stepWeights[step] = weighted(influence);
  }

  return {
    id,
    label,
    enabled: true,
    maxChangePercent,
    stepWeights,
    weights: Object.fromEntries(
      Object.entries(weights).map(([key, value]) => [key, clampInfluence(value)]),
    ) as GenreBrainWeights,
    pacingStyle,
    notes,
  };
}

const PROFILES: Record<GenreBrainId, GenreBrainProfile> = {
  romance: profile(
    "romance",
    "Romance Brain",
    14.5,
    {
      tensionSensitivity: 0.15,
      emotionalPacing: 0.12,
      dialogueRealism: 0.12,
      poeticDensityTolerance: 0.04,
      introspectionAmount: 0.05,
      subtextLevel: 0.15,
    },
    {
      dialogueIntent: 0.12,
      plainEmotion: 0.08,
      perfectDialogue: 0.1,
      explainedEmotion: 0.08,
      bodyBeat: 0.04,
      therapistClarity: 0.12,
      humanWritingV2: 0.15,
      tension: 0.15,
    },
    "longing",
    ["longing", "delayed payoff", "micro-resistance", "chemistry without instant resolution"],
  ),
  thriller: profile(
    "thriller",
    "Thriller Brain",
    13,
    {
      tensionSensitivity: 0.12,
      emotionalPacing: -0.08,
      dialogueRealism: 0.04,
      poeticDensityTolerance: -0.12,
      introspectionAmount: -0.15,
      subtextLevel: 0.1,
    },
    {
      dialogueIntent: -0.08,
      plainEmotion: -0.08,
      perfectDialogue: -0.04,
      explainedEmotion: 0.15,
      bodyBeat: 0.15,
      poetryBalance: 0.15,
      humanWritingV2: 0.1,
      tension: 0.12,
    },
    "suspense",
    ["danger", "suspicious detail", "behavior over monologue", "pace protection"],
  ),
  fantasy: profile(
    "fantasy",
    "Fantasy Brain",
    14,
    {
      tensionSensitivity: 0.05,
      emotionalPacing: 0.02,
      dialogueRealism: 0.08,
      poeticDensityTolerance: 0.12,
      introspectionAmount: 0.04,
      subtextLevel: 0.08,
    },
    {
      dialogueIntent: 0.02,
      perfectDialogue: 0.08,
      explainedEmotion: 0.05,
      bodyBeat: 0.08,
      therapistClarity: 0.15,
      poetryBalance: -0.1,
      tension: 0.05,
    },
    "immersive",
    ["mythic atmosphere", "sensory world coherence", "less modern therapy speech"],
  ),
  crime: profile(
    "crime",
    "Crime / Mafia Brain",
    13.5,
    {
      tensionSensitivity: 0.12,
      emotionalPacing: -0.08,
      dialogueRealism: 0.1,
      poeticDensityTolerance: -0.08,
      introspectionAmount: -0.12,
      subtextLevel: 0.15,
    },
    {
      dialogueIntent: 0.08,
      plainEmotion: -0.08,
      perfectDialogue: 0.08,
      explainedEmotion: 0.12,
      bodyBeat: 0.12,
      therapistClarity: 0.15,
      poetryBalance: 0.08,
      humanWritingV2: 0.14,
      tension: 0.12,
    },
    "danger",
    ["hierarchy tension", "threat under dialogue", "restraint over vulnerability"],
  ),
  nonfiction: profile(
    "nonfiction",
    "Self-help / Nonfiction Brain",
    6,
    {
      tensionSensitivity: -0.15,
      emotionalPacing: -0.15,
      dialogueRealism: -0.15,
      poeticDensityTolerance: -0.15,
      introspectionAmount: -0.15,
      subtextLevel: -0.15,
    },
    {
      dialogueIntent: -0.15,
      plainEmotion: -0.15,
      perfectDialogue: -0.15,
      explainedEmotion: -0.15,
      bodyBeat: -0.15,
      therapistClarity: 0.05,
      poetryBalance: 0.08,
      tension: -0.15,
    },
    "clarity",
    ["clarity", "usefulness", "minimal humanizer intervention", "no accidental romance-humanizing"],
  ),
  default: profile(
    "default",
    "Default Genre Brain",
    14.5,
    NEUTRAL_WEIGHTS,
    {},
    "neutral",
    ["neutral weighting", "Humanizer V2 remains primary"],
  ),
};

export function isGenreBrainEnabled(context: GenreBrainContext = {}): boolean {
  if (context.genreBrainEnabled === false) return false;
  if (context.genreBrainEnabled === true) return true;

  try {
    if (import.meta.env.VITE_SCRIPTORA_GENRE_BRAIN === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(GENRE_BRAIN_STORAGE_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return true;
  }
}

export function setGenreBrainEnabled(enabled: boolean) {
  try {
    localStorage.setItem(GENRE_BRAIN_STORAGE_KEY, enabled ? "on" : "off");
    window.dispatchEvent(new Event("scriptora-genre-brain-change"));
  } catch {
    // Generation must keep working even when storage is unavailable.
  }
}

export function detectGenreBrainId(config?: Partial<BookConfig>): GenreBrainId {
  const writingBrainId = String(config?.bookIntelligence?.layers?.writingBrainId || "");
  if (writingBrainId) {
    if (/dark-romance|romance|slow-burn|enemies-to-lovers|paranormal/.test(writingBrainId)) return "romance";
    if (/thriller|psychological|horror|dystopian/.test(writingBrainId)) return "thriller";
    if (/fantasy|epic|ya|sci-fi|cozy-mystery|mystery/.test(writingBrainId)) return "fantasy";
    if (/crime|mafia/.test(writingBrainId)) return "crime";
    if (/self-help|productivity|psychology|memoir|business|spirituality|education|manual|horticultural|fitness|health|finance|parenting|study|biography|cookbook|technical|practical/.test(writingBrainId)) {
      return "nonfiction";
    }
  }

  const genre = String(config?.genre || "").toLowerCase();
  const category = String(config?.category || "").toLowerCase();
  const subcategory = String(config?.subcategory || "").toLowerCase();
  const combined = `${genre} ${category} ${subcategory}`;

  if (/\b(dark-romance|romance|romantic|love story|slow burn)\b/.test(combined)) return "romance";
  if (/\b(mafia|crime|criminal|noir|gang|cartel|mob|detective|police procedural)\b/.test(combined)) return "crime";
  if (/\b(thriller|suspense|mystery|horror|psychological)\b/.test(combined)) return "thriller";
  if (/\b(fantasy|portal|epic|urban fantasy|fairy|myth|mythic)\b/.test(combined)) return "fantasy";
  if (
    /\b(self-help|non-fiction|nonfiction|business|philosophy|manual|guide|education|productivity|health|fitness|cookbook|technical)\b/.test(
      combined,
    )
  ) {
    return "nonfiction";
  }

  return "default";
}

export function resolveGenreBrainProfile(context: GenreBrainContext = {}): GenreBrainProfile {
  const id = detectGenreBrainId(context.config);
  const selected = PROFILES[id] || PROFILES.default;
  const base = isGenreBrainEnabled(context)
    ? selected
    : {
        ...PROFILES.default,
        id,
        label: `${selected.label} (off)`,
        enabled: false,
        maxChangePercent: 14.5,
        notes: ["GenreBrain disabled: neutral Humanizer V2 weighting only."],
      };
  return adaptSupremeToGenreBrainProfile(base, context.config);
}

export function stepWeight(profile: GenreBrainProfile, step: GenreBrainRefinementStep): number {
  return profile.enabled ? profile.stepWeights[step] || 1 : 1;
}

export function stepBudget(profile: GenreBrainProfile, step: GenreBrainRefinementStep): number {
  const profileBudget = profile.enabled ? profile.maxChangePercent : 14.5;
  return Math.min(profileBudget, 14.5 * stepWeight(profile, step));
}

export function orderedRefinementSteps(profile: GenreBrainProfile): GenreBrainRefinementStep[] {
  const base: GenreBrainRefinementStep[] = [
    "humanWritingV2",
    "dialogueIntent",
    "plainEmotion",
    "perfectDialogue",
    "explainedEmotion",
    "bodyBeat",
    "therapistClarity",
    "poetryBalance",
    "tension",
  ];

  if (!profile.enabled) return base;

  return base
    .map((step, index) => ({ step, index, weight: stepWeight(profile, step) }))
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .map((entry) => entry.step);
}

export function poetryRunLimit(profile: GenreBrainProfile): number {
  if (!profile.enabled) return 3;
  const tolerance = profile.weights.poeticDensityTolerance;
  if (tolerance >= 0.08) return 4;
  if (tolerance <= -0.08) return 2;
  return 3;
}

