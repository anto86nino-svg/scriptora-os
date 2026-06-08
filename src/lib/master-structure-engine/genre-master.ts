import type { Genre } from "@/types/book";

type GenreBrain = {
  optimize: string[];
  prevent: string[];
};

const BRAINS: Partial<Record<Genre, GenreBrain>> = {
  horror: {
    optimize: [
      "dread through silence and implication",
      "symbolic fear and sensory corruption",
      "delayed reveal and atmosphere variation",
      "psychological pressure over gore",
    ],
    prevent: [
      "repetitive darkness metaphors",
      "lore dumps too early",
      "constant high tension without breath",
      "over-beautiful prose that softens fear",
      "over-explanation of the threat",
    ],
  },
  thriller: {
    optimize: [
      "compulsive reading rhythm",
      "cliffhanger cadence and information withholding",
      "false certainty before reversals",
      "tension escalation with clean cause-effect",
    ],
    prevent: [
      "exposition dumps",
      "repetitive suspense patterns",
      "coincidence-driven turns",
      "flat antagonist monologues",
    ],
  },
  romance: {
    optimize: [
      "longing, subtext, and attraction delay",
      "imperfect emotional realism",
      "tension through proximity and restraint",
      "earned vulnerability beats",
    ],
    prevent: [
      "characters emotionally available too soon",
      "therapeutic dialogue",
      "emotional perfection or instant resolution",
      "generic meet-cute filler",
    ],
  },
  "dark-romance": {
    optimize: [
      "dangerous attraction and moral ambiguity",
      "power imbalance with consent-aware tension",
      "obsession as narrative engine",
      "rupture beats that deepen pull",
    ],
    prevent: [
      "instant trust after harm",
      "therapy-speak conflict resolution",
      "repetitive jealousy loops",
    ],
  },
  fantasy: {
    optimize: [
      "wonder and controlled world reveal",
      "lore pacing tied to character stakes",
      "magic consistency and sensory worldbuilding",
      "mystery before explanation",
    ],
    prevent: [
      "lore overload in early beats",
      "exposition-heavy travel scenes",
      "rule-breaking magic without cost",
    ],
  },
  "self-help": {
    optimize: [
      "authority through story-to-teaching ratio",
      "retention hooks and actionable clarity",
      "persuasion without hype",
      "reader agency and reflection prompts",
    ],
    prevent: [
      "robotic teaching voice",
      "generic motivational language",
      "unearned certainty",
      "listicle filler without narrative",
    ],
  },
  business: {
    optimize: [
      "credibility through case logic",
      "framework clarity and decision leverage",
      "story-to-insight ratio",
    ],
    prevent: [
      "buzzword stacking",
      "unsupported claims",
      "generic leadership platitudes",
    ],
  },
};

const DEFAULT_BRAIN: GenreBrain = {
  optimize: ["clear scene function", "genre-appropriate pacing", "commercial readability"],
  prevent: ["filler", "repetition", "generic phrasing", "unmotivated tangents"],
};

export function buildGenreMasterBlock(
  genre: Genre,
  subcategory: string | undefined,
  context: "chapter" | "subchapter",
): string {
  const brain = BRAINS[genre] ?? DEFAULT_BRAIN;
  const label = context === "subchapter" ? "SUBCHAPTER" : "CHAPTER";
  const sub = subcategory ? ` / ${subcategory}` : "";
  return `GENRE MASTER ENGINE — ${genre.toUpperCase()}${sub} (${label}):
Optimize: ${brain.optimize.join("; ")}.
Prevent: ${brain.prevent.join("; ")}.`;
}
