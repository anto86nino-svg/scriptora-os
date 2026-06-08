import type { BookSubchapterOutline, Genre } from "@/types/book";
import type { SubchapterWordBudget } from "./word-distribution";

export type SubchapterNarrativeMeta = {
  purpose: string;
  plotFunction: string;
  emotionTarget: string;
  conflictLevel: number;
  tension: string;
  commercialPurpose: string;
};

const GENRE_EMOTIONS: Partial<Record<Genre, string[]>> = {
  horror: ["dread", "unease", "fear", "panic", "dread"],
  thriller: ["curiosity", "anxiety", "shock", "dread", "urgency"],
  romance: ["longing", "spark", "vulnerability", "ache", "hope"],
  "dark-romance": ["attraction", "danger", "surrender", "rupture", "obsession"],
  fantasy: ["wonder", "awe", "stakes", "awe", "revelation"],
  "self-help": ["recognition", "insight", "motivation", "agency", "commitment"],
  business: ["clarity", "confidence", "insight", "momentum", "commitment"],
};

const PLOT_FUNCTIONS = ["setup", "complication", "reveal", "confrontation", "payoff", "bridge"];
const TENSION_STYLES = ["slow_burn", "rising", "spike", "plateau", "release"];

export function buildSubchapterMetadata(
  outline: Partial<BookSubchapterOutline>,
  subIndex: number,
  totalSubs: number,
  genre: Genre,
  budget?: SubchapterWordBudget,
): SubchapterNarrativeMeta {
  const purpose = outline.purpose || budget?.purpose || PLOT_FUNCTIONS[subIndex % PLOT_FUNCTIONS.length];
  const emotions = GENRE_EMOTIONS[genre] ?? ["engagement", "tension", "insight", "shift", "resolution"];
  const progress = totalSubs > 1 ? subIndex / (totalSubs - 1) : 0.5;
  const conflictLevel = Math.min(10, Math.max(2, Math.round(3 + progress * 6)));

  return {
    purpose,
    plotFunction: outline.narrativeProgression?.slice(0, 40) || PLOT_FUNCTIONS[subIndex % PLOT_FUNCTIONS.length],
    emotionTarget: outline.emotionalFunction || emotions[subIndex % emotions.length],
    conflictLevel,
    tension: outline.tensionProgression?.slice(0, 24) || TENSION_STYLES[Math.min(subIndex, TENSION_STYLES.length - 1)],
    commercialPurpose: subIndex === totalSubs - 1 ? "keep_reading" : "maintain_momentum",
  };
}

export function enrichSubchapterOutline(
  outline: BookSubchapterOutline,
  subIndex: number,
  totalSubs: number,
  genre: Genre,
  budget?: SubchapterWordBudget,
): BookSubchapterOutline {
  const meta = buildSubchapterMetadata(outline, subIndex, totalSubs, genre, budget);
  return {
    ...outline,
    purpose: outline.purpose || meta.purpose,
    emotionalFunction: outline.emotionalFunction || meta.emotionTarget,
    narrativeProgression: outline.narrativeProgression || meta.plotFunction,
    conflictProgression: outline.conflictProgression || `level_${meta.conflictLevel}`,
    tensionProgression: outline.tensionProgression || meta.tension,
  };
}

export function metadataToPromptBlock(meta: SubchapterNarrativeMeta): string {
  return `NARRATIVE JOB (invisible structure — honor in prose):
- purpose: ${meta.purpose}
- plotFunction: ${meta.plotFunction}
- emotionTarget: ${meta.emotionTarget}
- conflictLevel: ${meta.conflictLevel}/10
- tension: ${meta.tension}
- commercialPurpose: ${meta.commercialPurpose}
Do NOT repeat scenes, emotional beats, or exposition from prior subchapters. Every paragraph must advance this job.`;
}
