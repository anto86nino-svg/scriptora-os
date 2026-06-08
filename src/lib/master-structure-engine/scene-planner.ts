import type { BookSubchapterOutline, BookConfig, Genre, Language } from "@/types/book";
import { deriveSubchapterTitle } from "@/lib/subchapter-titles";
import type { ScenePurpose } from "@/lib/narrative-intelligence-v2/types";

type SceneBeat = { purpose: ScenePurpose; role: string };

const FICTION_SCENE_BEATS: Record<string, SceneBeat[]> = {
  horror: [
    { purpose: "pacing_relief", role: "false calm" },
    { purpose: "tension", role: "wrong detail" },
    { purpose: "mystery", role: "unanswered signal" },
    { purpose: "emotional_progression", role: "dread deepens" },
    { purpose: "reveal", role: "partial truth" },
    { purpose: "conflict", role: "confrontation" },
  ],
  thriller: [
    { purpose: "plot_progression", role: "hook" },
    { purpose: "tension", role: "complication" },
    { purpose: "mystery", role: "hidden motive" },
    { purpose: "reveal", role: "reversal" },
    { purpose: "conflict", role: "pressure peak" },
    { purpose: "foreshadowing", role: "cliffhanger seed" },
  ],
  romance: [
    { purpose: "emotional_progression", role: "spark" },
    { purpose: "tension", role: "proximity" },
    { purpose: "romance_escalation", role: "almost" },
    { purpose: "conflict", role: "rupture" },
    { purpose: "emotional_recovery", role: "ache" },
    { purpose: "romance_escalation", role: "pull" },
  ],
  "dark-romance": [
    { purpose: "tension", role: "dangerous pull" },
    { purpose: "romance_escalation", role: "forbidden proximity" },
    { purpose: "conflict", role: "power clash" },
    { purpose: "emotional_progression", role: "surrender" },
    { purpose: "reveal", role: "wound exposed" },
    { purpose: "tension", role: "obsession" },
  ],
  fantasy: [
    { purpose: "world_building", role: "wonder" },
    { purpose: "plot_progression", role: "discovery" },
    { purpose: "conflict", role: "stakes" },
    { purpose: "mystery", role: "lore hint" },
    { purpose: "character_transformation", role: "trial" },
    { purpose: "reveal", role: "truth" },
  ],
  "sci-fi": [
    { purpose: "world_building", role: "system glimpse" },
    { purpose: "mystery", role: "anomaly" },
    { purpose: "plot_progression", role: "experiment" },
    { purpose: "conflict", role: "failure" },
    { purpose: "reveal", role: "implication" },
    { purpose: "tension", role: "countdown" },
  ],
  historical: [
    { purpose: "world_building", role: "period texture" },
    { purpose: "plot_progression", role: "event" },
    { purpose: "emotional_progression", role: "human cost" },
    { purpose: "conflict", role: "turning point" },
    { purpose: "reveal", role: "consequence" },
    { purpose: "character_transformation", role: "legacy" },
  ],
};

const DEFAULT_SCENE_BEATS: SceneBeat[] = [
  { purpose: "plot_progression", role: "opening" },
  { purpose: "tension", role: "pressure" },
  { purpose: "emotional_progression", role: "shift" },
  { purpose: "conflict", role: "turn" },
  { purpose: "reveal", role: "payoff" },
];

const GENRE_AUTO_SCENE_COUNTS: Partial<Record<Genre, number>> = {
  horror: 6,
  thriller: 6,
  romance: 5,
  "dark-romance": 5,
  fantasy: 5,
  "sci-fi": 5,
  historical: 5,
  memoir: 4,
};

export function autoSceneCountForGenre(genre: Genre): number {
  return GENRE_AUTO_SCENE_COUNTS[genre] ?? 5;
}

function sceneBeatsForGenre(genre: Genre, count: number): SceneBeat[] {
  const base = FICTION_SCENE_BEATS[genre] ?? DEFAULT_SCENE_BEATS;
  return Array.from({ length: count }, (_, i) => base[i % base.length]);
}

function sceneTitleFromBeat(
  chapterTitle: string,
  chapterSummary: string,
  sceneIndex: number,
  beat: SceneBeat,
  total: number,
  language: Language,
): string {
  const derived = deriveSubchapterTitle(chapterTitle, chapterSummary, sceneIndex, beat.role, total, language);
  const italian = String(language).toLowerCase().includes("ital");
  const prefixes = italian
    ? ["La scena di", "Quando", "Il momento in cui", "Dietro", "Sotto", "Nel punto in cui"]
    : ["The scene where", "When", "The moment", "Behind", "Under", "Where"];
  const prefix = prefixes[sceneIndex % prefixes.length];
  if (derived.length > 8 && !/^the opening|l'inizio/i.test(derived)) {
    return derived.slice(0, 72);
  }
  const anchor = chapterTitle.replace(/^chapter\s+\d+[:.\-\s]*/i, "").trim().split(/\s+/).slice(0, 3).join(" ");
  return `${prefix} ${anchor || beat.role}`.slice(0, 72);
}

export function planChapterScenes(
  chapterTitle: string,
  chapterSummary: string,
  chapterIndex: number,
  sceneCount: number,
  config: Pick<BookConfig, "genre" | "language">,
): BookSubchapterOutline[] {
  const beats = sceneBeatsForGenre(config.genre, sceneCount);
  return beats.map((beat, sceneIndex) => {
    const title = sceneTitleFromBeat(chapterTitle, chapterSummary, sceneIndex, beat, sceneCount, config.language);
    return {
      title,
      summary: `${chapterSummary} Scene ${sceneIndex + 1}/${sceneCount}: ${beat.role}. Primary purpose: ${beat.purpose}.`,
      purpose: beat.purpose,
      emotionalFunction: beat.role,
      narrativeProgression: `scene_${beat.purpose}`,
      conflictProgression: sceneIndex < sceneCount - 1 ? "rising" : "cliffhanger_or_release",
      tensionProgression: beat.purpose === "pacing_relief" ? "release" : "rising",
    };
  });
}

export function buildScenePlannerPromptBlock(config: BookConfig): string {
  return `SCENE-BASED STRUCTURE ENGINE:
- Each unit is a SCENE, not a generic subchapter.
- Scene titles must feel cinematic and human-written (place, moment, sensory hook).
- Every scene needs a single narrative job: tension, reveal, conflict, romance_escalation, world_building, pacing_relief, etc.
- No scene may repeat the previous scene's primary purpose.
- Genre: ${config.genre}; language: ${config.language}.`;
}
