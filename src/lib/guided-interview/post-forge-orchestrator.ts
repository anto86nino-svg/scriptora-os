import type { BookConfig, BookProject } from "@/types/book";
import { analyzeNovel } from "@/lib/EditorialIntelligence";
import { computePremiumEditorialScores } from "@/lib/editorial-intelligence-premium";
import { computeMarketPremiumScores } from "@/lib/market-intelligence-premium";
import { simulateReaderEmotion } from "@/lib/narrative-intelligence-v2/reader-emotion";
import { runDevelopmentalMemoryCheck } from "@/lib/memory-consistency-v25/developmental-check";
import { buildMemoryConsistencyV25Snapshot } from "@/lib/memory-consistency-v25/extractor";
import { runNarrativeIntelligenceDirector } from "@/lib/writing-engine-v13/narrative-intelligence-director";
import { getGenreProfile } from "@/lib/genre-intelligence";
import { selectCanonFromForgeState } from "@/lib/intelligence-layer/selectors/canon";
import { buildForgeInterviewSeed } from "./forge-blueprint-handoff";
import type { GuidedInterviewState } from "./types";

export type SceneArchitectureIssue = {
  id: string;
  severity: "info" | "warning";
  message: string;
  suggestion: "compress" | "remove" | "merge" | "strengthen" | "review";
};

export type ReaderProfileReport = {
  profile: string;
  abandonmentRisk: number;
  memorableMoments: string[];
  slowSections: string[];
  highTensionSections: string[];
  summary: string;
};

export type PostForgeManuscriptReport = {
  canonIssues: string[];
  characterIssues: string[];
  sceneIssues: SceneArchitectureIssue[];
  narrativeDirectorNotes: string[];
  readerProfiles: ReaderProfileReport[];
  editorialSuggestions: string[];
  commercialNotes: string[];
};

function splitScenes(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 80);
}

export function buildUnifiedCanonView(state: GuidedInterviewState): string[] {
  return selectCanonFromForgeState(state).facts;
}

export function verifyCanonBeforeChapter(input: {
  project: BookProject;
  chapterIndex: number;
  draftText?: string;
}): string[] {
  const issues: string[] = [];
  const memoryReport = runDevelopmentalMemoryCheck({
    project: input.project,
    chapterIndex: input.chapterIndex,
    chapterText: input.draftText,
  });
  for (const issue of memoryReport.issues) {
    issues.push(`${issue.message}${issue.surgicalFix ? ` → ${issue.surgicalFix}` : ""}`);
  }

  const snapshot = buildMemoryConsistencyV25Snapshot({
    config: input.project.config,
    blueprint: input.project.blueprint,
    chapters: input.project.chapters.slice(0, input.chapterIndex + 1),
    existing: input.project.longBookMemory?.memoryConsistencyV25,
    psychology: input.project.longBookMemory?.characterPsychology,
    characterStates: input.project.longBookMemory?.characterStates,
  });

  if ((snapshot.openPromises?.length ?? 0) > 8) {
    issues.push("Troppe promesse narrative aperte — rischio di deriva.");
  }

  return issues.slice(0, 6);
}

export function analyzeSceneArchitecture(chapterText: string): SceneArchitectureIssue[] {
  const scenes = splitScenes(chapterText);
  const issues: SceneArchitectureIssue[] = [];

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i];
    const hasConflict = /\b(ma|però|contro|paura|rischio|but|however|against)\b/i.test(scene);
    const hasTurn = /\b(improvvisamente|allora|quindi|then|suddenly|decise|capì)\b/i.test(scene);
    const hasConsequence = /\b(dopo|per questo|conseguenza|because|after|changed)\b/i.test(scene);
    const isStatic = scene.length > 220 && !hasConflict && !hasTurn;

    if (isStatic) {
      issues.push({
        id: `scene-static-${i}`,
        severity: "warning",
        message: `Scena ${i + 1} rischia di essere statica — poca opposizione o svolta.`,
        suggestion: "strengthen",
      });
    }
    if (!hasConsequence && scene.length > 180) {
      issues.push({
        id: `scene-no-consequence-${i}`,
        severity: "info",
        message: `Scena ${i + 1}: conseguenza narrativa poco visibile.`,
        suggestion: "review",
      });
    }
  }

  const duplicates = scenes.filter((scene, index) =>
    scenes.some(
      (other, otherIndex) =>
        otherIndex !== index &&
        other.slice(0, 80).toLowerCase() === scene.slice(0, 80).toLowerCase(),
    ),
  );
  if (duplicates.length > 0) {
    issues.push({
      id: "scene-duplicate",
      severity: "warning",
      message: "Scene ridondanti rilevate — stesso movimento narrativo ripetuto.",
      suggestion: "merge",
    });
  }

  return issues.slice(0, 8);
}

export function runNarrativeDirectorAnalysis(
  text: string,
  config: Pick<BookConfig, "genre" | "language">,
): string[] {
  const family = /self-help|business|manual|saggio|nonfiction/i.test(String(config.genre))
    ? "nonfiction"
    : "fiction";
  const result = runNarrativeIntelligenceDirector(text, { family, genre: config.genre });
  const notes = result.signals.map((signal) => signal.message);

  if (/ti amo|i love you/i.test(text) && text.length < 2500) {
    notes.push("Romance o vulnerabilità emotiva potrebbe arrivare troppo presto.");
  }
  if (/colpevole|villain|antagonista/i.test(text) && text.length < 1800) {
    notes.push("Verifica che il villain abbia abbastanza pressione prima della risoluzione.");
  }
  if (/finale|epilogue|ultima pagina/i.test(text) && text.length < 3000) {
    notes.push("Climax o finale potrebbe essere prematuro rispetto alla lunghezza del capitolo.");
  }

  return [...notes, ...result.directives.slice(0, 2)].slice(0, 6);
}

const READER_PROFILES = [
  { id: "romance", match: /romance|dark-romance|amore/i, label: "Lettore romance" },
  { id: "thriller", match: /thriller|giallo|noir|crime/i, label: "Lettore thriller" },
  { id: "fantasy", match: /fantasy|epic|magia/i, label: "Lettore fantasy" },
  { id: "self-help", match: /self-help|business|manuale/i, label: "Lettore self-help" },
  { id: "memoir", match: /memoir|autobiograf/i, label: "Lettore memoir" },
];

export function simulateReaderProfiles(
  text: string,
  genre: string,
  language?: string,
): ReaderProfileReport[] {
  const profile =
    READER_PROFILES.find((entry) => entry.match.test(genre))?.label ?? "Lettore del genere";
  const emotion = simulateReaderEmotion({
    content: text,
    chapterIndex: 0,
    config: { genre, language: language || "Italian" } as BookConfig,
  });
  const scenes = splitScenes(text);
  const slowSections = scenes
    .filter((scene) => scene.length > 260 && !/\?|!/.test(scene))
    .map((_, index) => `Scena ${index + 1}`)
    .slice(0, 3);
  const highTensionSections = scenes
    .filter((scene) => /\b(pericolo|paura|tradimento|minaccia|danger|betrayal)\b/i.test(scene))
    .map((_, index) => `Scena ${index + 1}`)
    .slice(0, 3);

  return [
    {
      profile,
      abandonmentRisk: Math.round(emotion.boredomRisk),
      memorableMoments:
        emotion.whySummary?.slice(0, 3) ??
        highTensionSections.map((section) => `${section} — tensione alta`),
      slowSections,
      highTensionSections,
      summary: `${profile}: curiosità ${emotion.curiosity}, tensione ${emotion.emotionalTension}, rischio abbandono ${Math.round(emotion.boredomRisk)}%.`,
    },
  ];
}

export function buildFinalRevisionSuggestions(
  text: string,
  config: Pick<BookConfig, "genre" | "language" | "tone">,
): string[] {
  const editorial = analyzeNovel(text);
  const premium = computePremiumEditorialScores({
    content: text,
    genre: config.genre,
    language: config.language,
  });

  const suggestions = [
    ...premium.surgicalSuggestions,
    ...editorial.warnings.slice(0, 3).map((warning) => warning.suggestion || warning.message),
  ].filter(Boolean);

  if (premium.dialogueHumanity < 60) {
    suggestions.push("Rafforza i dialoghi con attrito, interruzioni e risposte imperfette.");
  }
  if (premium.scenePacing < 58) {
    suggestions.push("Comprimi i passaggi statici e aumenta il ritmo tra obiettivo e conseguenza.");
  }

  return [...new Set(suggestions)].slice(0, 8);
}

export function runPostForgeManuscriptAnalysis(input: {
  text: string;
  config: BookConfig;
  project?: BookProject;
  chapterIndex?: number;
  forgeState?: GuidedInterviewState;
}): PostForgeManuscriptReport {
  const text = String(input.text || "").trim();
  const genre = String(input.config.genre || "");
  const chapterIndex = input.chapterIndex ?? 0;

  const canonIssues =
    input.project && chapterIndex >= 0
      ? verifyCanonBeforeChapter({
          project: input.project,
          chapterIndex,
          draftText: text,
        })
      : input.forgeState
        ? buildUnifiedCanonView(input.forgeState).length < 3
          ? ["Canon Forge ancora sottile — poche ancore narrative."]
          : []
        : [];

  const characterIssues: string[] = [];
  if (input.config.characters?.length) {
    const genericReactions = (text.match(/\b(capì|sentì|pensò|realized|felt|understood)\b/gi) || [])
      .length;
    if (genericReactions > 6) {
      characterIssues.push(
        "Troppe reazioni generiche — verifica coerenza psicologica per personaggio.",
      );
    }
  }

  const sceneIssues = analyzeSceneArchitecture(text);
  const narrativeDirectorNotes = runNarrativeDirectorAnalysis(text, input.config);
  const readerProfiles = simulateReaderProfiles(text, genre, input.config.language);
  const editorialSuggestions = buildFinalRevisionSuggestions(text, input.config);

  const pitch = [input.config.idea, input.config.forgeStoryArchitecture, text.slice(0, 400)]
    .filter(Boolean)
    .join(" ");
  const commercialNotes: string[] = [];
  if (pitch.length > 40) {
    const market = computeMarketPremiumScores({
      content: pitch,
      genre,
      language: input.config.language,
    });
    if (market.bookTokPotential != null && market.bookTokPotential >= 62) {
      commercialNotes.push("Forte potenziale BookTok nel concept o nel passaggio analizzato.");
    }
    if (market.genreAlignmentNote) commercialNotes.push(market.genreAlignmentNote);
  }
  try {
    const profile = getGenreProfile(genre);
    if (profile.donts[0]) {
      commercialNotes.push(`Attenzione genere: evita ${profile.donts[0].toLowerCase()}.`);
    }
  } catch {
    // genre profile optional
  }

  return {
    canonIssues,
    characterIssues,
    sceneIssues,
    narrativeDirectorNotes,
    readerProfiles,
    editorialSuggestions,
    commercialNotes: commercialNotes.slice(0, 3),
  };
}

export function buildForgeSeedFromProject(project: BookProject): ReturnType<typeof buildForgeInterviewSeed> | null {
  if (!project.config.characterBibleText && !project.config.forgeCanonBrief) return null;
  const pseudoState = {
    extracted: {
      promise: project.config.idea,
      genre: project.config.genre,
      language: project.config.language,
      bookTitle: project.config.title,
      bookSubtitle: project.config.subtitle,
      targetReader: project.config.targetReader,
    },
    characters: project.config.characters?.map((character, index) => ({
      id: `writer-${index}`,
      role: index === 0 ? "protagonist" as const : "supporting" as const,
      name: character.name,
      wound: character.wound,
      fear: character.internalNeed,
      desire: character.externalDesire,
      secret: character.secret,
      personality: character.personality,
    })),
    canonLocked: Boolean(project.config.forgeCanonBrief),
  } as GuidedInterviewState;
  return buildForgeInterviewSeed(pseudoState);
}
