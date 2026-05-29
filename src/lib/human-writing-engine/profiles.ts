import type { WritingBrainId } from "@/lib/book-intelligence/types";
import type { HumanWritingProfile } from "./types";

const FICTION_DEFAULT: HumanWritingProfile = {
  id: "fiction-balanced",
  label: "Balanced Fiction",
  domain: "fiction",
  subtextLevel: 0.65,
  silenceWeight: 0.55,
  dialogueFriction: 0.6,
  metaphorCap: 3,
  emotionalExplainTolerance: 0.35,
  promptRules: [
    "Show emotion through behavior, interruption, and withheld speech — not labels.",
    "Let dialogue be asymmetrical: one person dodges, the other presses too hard or stops too soon.",
    "Use silence as information: pauses, unfinished sentences, changed subject.",
  ],
  avoidPatterns: [
    "Perfectly articulate confessions",
    "Therapist clarity under stress",
    "Symmetrical he-said/she-said dialogue",
    "Stacked metaphors in consecutive sentences",
  ],
};

const BRAIN_PROFILES: Partial<Record<WritingBrainId, HumanWritingProfile>> = {
  "dark-romance-brain": {
    ...FICTION_DEFAULT,
    id: "dark-romance-human",
    label: "Dark Romance Human Voice",
    sourceBrainId: "dark-romance-brain",
    subtextLevel: 0.92,
    silenceWeight: 0.85,
    dialogueFriction: 0.88,
    metaphorCap: 2,
    emotionalExplainTolerance: 0.18,
    promptRules: [
      "Desire speaks through restraint, threat, and almost-contact — never full emotional inventory.",
      "Characters lie to themselves before they lie to each other.",
      "Confession must cost something. Delay it with fear, pride, or consequence.",
      "Use physical distance, object handling, and aborted movement instead of naming feelings.",
    ],
    avoidPatterns: [
      "Instant mutual understanding",
      "Clean emotional vocabulary during obsession",
      "Romantic speeches that resolve tension",
    ],
  },
  "slow-burn-brain": {
    ...FICTION_DEFAULT,
    id: "slow-burn-human",
    label: "Slow Burn Human Voice",
    sourceBrainId: "slow-burn-brain",
    subtextLevel: 0.88,
    silenceWeight: 0.9,
    dialogueFriction: 0.75,
    metaphorCap: 2,
    emotionalExplainTolerance: 0.2,
    promptRules: [
      "Almost-say it. Pull back. Change subject. Touch without naming.",
      "Longing lives in what is NOT said and NOT done.",
    ],
    avoidPatterns: ["Early full payoff", "Explicit naming of every feeling"],
  },
  "romance-brain": {
    ...FICTION_DEFAULT,
    id: "romance-human",
    label: "Romance Human Voice",
    sourceBrainId: "romance-brain",
    subtextLevel: 0.78,
    silenceWeight: 0.7,
    dialogueFriction: 0.65,
    metaphorCap: 3,
    emotionalExplainTolerance: 0.28,
  },
  "thriller-brain": {
    ...FICTION_DEFAULT,
    id: "thriller-human",
    label: "Thriller Human Voice",
    sourceBrainId: "thriller-brain",
    subtextLevel: 0.55,
    silenceWeight: 0.45,
    dialogueFriction: 0.7,
    metaphorCap: 1,
    emotionalExplainTolerance: 0.22,
    promptRules: [
      "Keep introspection short. Behavior and detail carry dread.",
      "Dialogue is transactional, evasive, or dangerously polite.",
      "No poetic detours during threat.",
    ],
    avoidPatterns: ["Long emotional monologues during danger", "Lyric interludes mid-chase"],
  },
  "psychological-thriller-brain": {
    ...FICTION_DEFAULT,
    id: "psych-thriller-human",
    label: "Psychological Thriller Human Voice",
    sourceBrainId: "psychological-thriller-brain",
    subtextLevel: 0.8,
    silenceWeight: 0.75,
    dialogueFriction: 0.82,
    metaphorCap: 2,
    emotionalExplainTolerance: 0.15,
  },
  "crime-brain": {
    ...FICTION_DEFAULT,
    id: "crime-human",
    label: "Crime Human Voice",
    sourceBrainId: "crime-brain",
    subtextLevel: 0.72,
    silenceWeight: 0.6,
    dialogueFriction: 0.85,
    metaphorCap: 1,
    emotionalExplainTolerance: 0.2,
  },
  "mafia-brain": {
    ...FICTION_DEFAULT,
    id: "mafia-human",
    label: "Mafia Human Voice",
    sourceBrainId: "mafia-brain",
    subtextLevel: 0.85,
    silenceWeight: 0.7,
    dialogueFriction: 0.9,
    metaphorCap: 1,
    emotionalExplainTolerance: 0.15,
    promptRules: [
      "Power speaks indirectly. Loyalty and threat hide inside courtesy.",
      "Vulnerability appears as mistake, not speech.",
    ],
    avoidPatterns: ["Open heart-to-hearts without cost", "Sanitized crime dialogue"],
  },
  "horror-brain": {
    ...FICTION_DEFAULT,
    id: "horror-human",
    label: "Horror Human Voice",
    sourceBrainId: "horror-brain",
    subtextLevel: 0.5,
    silenceWeight: 0.8,
    dialogueFriction: 0.55,
    metaphorCap: 2,
    emotionalExplainTolerance: 0.25,
    promptRules: ["Dread through wrong detail and refusal to name the fear.", "Silence is louder than explanation."],
    avoidPatterns: ["Explaining the monster", "Emotional thesis statements"],
  },
  "fantasy-brain": {
    ...FICTION_DEFAULT,
    id: "fantasy-human",
    label: "Fantasy Human Voice",
    sourceBrainId: "fantasy-brain",
    subtextLevel: 0.6,
    silenceWeight: 0.5,
    dialogueFriction: 0.55,
    metaphorCap: 4,
    emotionalExplainTolerance: 0.32,
  },
  "horticultural-guide-brain": {
    id: "instructional-clarity",
    label: "Instructional Clarity",
    domain: "nonfiction",
    sourceBrainId: "horticultural-guide-brain",
    subtextLevel: 0,
    silenceWeight: 0,
    dialogueFriction: 0,
    metaphorCap: 0,
    emotionalExplainTolerance: 0.9,
    promptRules: [
      "Write with concrete steps, measurements, and seasonal clarity.",
      "No motivational fluff, no emotional transformation arcs, no storytelling filler.",
      "Authority comes from precision, not inspiration.",
    ],
    avoidPatterns: [
      "Self-help motivational language",
      "Metaphorical life lessons",
      "Vague encouragement without actionable steps",
    ],
  },
  "practical-manual-brain": {
    id: "instructional-clarity",
    label: "Instructional Clarity",
    domain: "nonfiction",
    sourceBrainId: "practical-manual-brain",
    subtextLevel: 0,
    silenceWeight: 0,
    dialogueFriction: 0,
    metaphorCap: 0,
    emotionalExplainTolerance: 0.9,
    promptRules: [
      "Procedural clarity first. Number steps where useful.",
      "Avoid narrative padding and emotional coaching.",
    ],
    avoidPatterns: ["Motivational tone", "Abstract philosophy replacing instruction"],
  },
  "self-help-brain": {
    id: "self-help-human",
    label: "Self Help Human Voice",
    domain: "nonfiction",
    sourceBrainId: "self-help-brain",
    subtextLevel: 0.25,
    silenceWeight: 0.15,
    dialogueFriction: 0.2,
    metaphorCap: 2,
    emotionalExplainTolerance: 0.55,
    promptRules: [
      "Use relatable scenes, then extract the principle — never reverse the order with vague inspiration.",
      "Sound like a credible human coach, not a generic AI motivator.",
    ],
    avoidPatterns: ["Empty platitudes", "Unearned breakthrough moments"],
  },
  "productivity-brain": {
    id: "productivity-human",
    label: "Productivity Human Voice",
    domain: "nonfiction",
    sourceBrainId: "productivity-brain",
    subtextLevel: 0.1,
    silenceWeight: 0.05,
    dialogueFriction: 0.1,
    metaphorCap: 1,
    emotionalExplainTolerance: 0.65,
    promptRules: ["Systems over motivation. Concrete workflows over hype."],
    avoidPatterns: ["Hustle porn", "Vague inspiration"],
  },
};

export function resolveHumanWritingProfile(config?: {
  genre?: string;
  bookIntelligence?: { layers?: { writingBrainId?: WritingBrainId; domain?: string } };
}): HumanWritingProfile {
  const brainId = config?.bookIntelligence?.layers?.writingBrainId;
  if (brainId && BRAIN_PROFILES[brainId]) {
    return BRAIN_PROFILES[brainId]!;
  }

  const genre = String(config?.genre || "").toLowerCase();
  if (
    genre.includes("garden") ||
    genre.includes("manual") ||
    genre.includes("cookbook") ||
    genre.includes("technical") ||
    genre.includes("beekeeping")
  ) {
    return BRAIN_PROFILES["horticultural-guide-brain"]!;
  }
  if (genre.includes("productivity") || genre.includes("business")) {
    return BRAIN_PROFILES["productivity-brain"]!;
  }
  if (genre.includes("self-help") || genre.includes("psychology")) {
    return BRAIN_PROFILES["self-help-brain"]!;
  }
  if (genre.includes("dark-romance")) return BRAIN_PROFILES["dark-romance-brain"]!;
  if (genre.includes("romance")) return BRAIN_PROFILES["romance-brain"]!;
  if (genre.includes("thriller")) return BRAIN_PROFILES["thriller-brain"]!;
  if (genre.includes("crime")) return BRAIN_PROFILES["mafia-brain"]!;
  if (genre.includes("horror")) return BRAIN_PROFILES["horror-brain"]!;
  if (genre.includes("fantasy")) return BRAIN_PROFILES["fantasy-brain"]!;

  const domain = config?.bookIntelligence?.layers?.domain;
  if (domain === "nonfiction") {
    return BRAIN_PROFILES["practical-manual-brain"]!;
  }

  return FICTION_DEFAULT;
}
