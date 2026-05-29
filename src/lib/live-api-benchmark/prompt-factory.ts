import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import type { RealWorldProject } from "@/lib/live-author-validation/corpus/real-world-projects";
import { buildBookIntelligencePromptBlock, buildBookIntelligenceSnapshot, resolveBookIntelligenceFromConfig } from "@/lib/book-intelligence";
import { buildBestsellerIntelligencePromptBlock } from "@/lib/bestseller-intelligence";
import { buildEditorialMasteryBlock } from "@/lib/editorial-mastery";
import { buildGenreEditorialBlock, buildGenreSystemBlock, buildPromptByGenre } from "@/lib/genre-intelligence";
import { buildHumanizerPromptBlock } from "@/lib/HumanizerLayer";
import { buildHumanWritingPromptBlock } from "@/lib/human-writing-engine";
import { buildLongBookMemory, buildLongBookMemoryPromptBlock } from "@/lib/long-book-memory";
import {
  buildNarrativeIntelligenceRuntimeBlock,
  buildNarrativeIntelligenceSystemBlock,
} from "@/lib/narrative-intelligence";
import { buildNarrativeIntelligencePromptBlock } from "@/lib/narrative-intelligence-v2";
import { normalizeAuthorIdentity } from "@/lib/author-identity";
import { chapterGoalForProject, wordTargetForHarness } from "./test-matrix";

const COMPETITOR_SYSTEM = `You are an experienced author. Write the requested chapter exactly as specified.
Follow genre, tone, and constraints in the user message.
Do not mention being an AI. Do not add meta commentary.
Write publishable prose only.`;

function extractKeyIdeas(content: string): string[] {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 40 && s.trim().length < 200);
  const first = sentences.slice(0, 2).map(s => s.trim());
  const last = sentences.slice(-2).map(s => s.trim());
  return [...new Set([...first, ...last])].slice(0, 4);
}

function buildAuthorIdentityBlock(config: BookConfig): string {
  const identity = normalizeAuthorIdentity(config.authorIdentity);
  const penName = identity?.penName || config.authorName || config.author || "";
  if (!identity && !penName.trim()) return "";

  if (!identity) {
    return `AUTHOR ATTRIBUTION: Write as ${penName}. Maintain one consistent voice.`;
  }

  return `AUTHOR IDENTITY LOCK — sound attributable to ${identity.penName}:
Voice: ${identity.voice || "not specified"}
Signature moves: ${identity.signatureMoves || "not specified"}
Forbidden moves: ${identity.forbiddenMoves || "not specified"}
Recurring themes: ${identity.recurringThemes || "not specified"}
Never generic AI tone. Never explain the theme after every scene.`;
}

function buildContextMemoryBlock(
  config: BookConfig,
  blueprint: BookBlueprint,
  previousChapters: Chapter[],
  chapterIndex: number,
): string {
  if (previousChapters.length === 0) {
    const openingMemory = buildLongBookMemory({ config, blueprint, chapters: [] });
    const openingNarrative = buildNarrativeIntelligencePromptBlock(openingMemory, config);
    return `FIRST CHAPTER — establish tone, premise, hook immediately.

${buildLongBookMemoryPromptBlock(openingMemory, chapterIndex)}
${openingNarrative ? `\n${openingNarrative}` : ""}`;
  }

  const summaries = previousChapters
    .map((c, i) => {
      const keyIdeas = extractKeyIdeas(c.content);
      return `Ch ${i + 1} "${c.title}":
  Opening: ${c.content.substring(0, 150)}...
  Key ideas: ${keyIdeas.join(" | ")}
  Ending: ...${c.content.substring(Math.max(0, c.content.length - 150))}`;
    })
    .join("\n\n");

  const arcPosition = chapterIndex / Math.max(1, config.numberOfChapters || previousChapters.length + 1);
  const arcPhase =
    arcPosition < 0.25
      ? "OPENING"
      : arcPosition < 0.5
        ? "RISING"
        : arcPosition < 0.75
          ? "CLIMAX"
          : "RESOLUTION";

  const memory = buildLongBookMemory({ config, blueprint, chapters: previousChapters });
  const longMemoryBlock = buildLongBookMemoryPromptBlock(memory, chapterIndex);
  const narrativeIntelBlock = buildNarrativeIntelligencePromptBlock(memory, config);

  return `NARRATIVE MEMORY — maintain perfect continuity:

${longMemoryBlock}
${narrativeIntelBlock ? `\n${narrativeIntelBlock}\n` : ""}

PREVIOUS CHAPTERS:
${summaries}

Arc position: Chapter ${chapterIndex + 1} — ${arcPhase}
Themes: ${(blueprint.themes || []).join(", ")}

CONTINUITY RULES:
- Build upon prior chapters; create callbacks
- Never repeat metaphors or structural patterns
- Progress emotional arc; one author mind throughout`;
}

function minimalBlueprint(project: RealWorldProject): BookBlueprint {
  return {
    overview: project.title,
    chapterOutlines: [],
    themes: project.genreKey === "fantasy" ? ["oath", "memory", "foreshadowing"] : ["transformation", "tension"],
    emotionalArc: "rising",
  };
}

function toBookConfig(project: RealWorldProject): BookConfig {
  return {
    title: project.title,
    genre: project.config.genre || "fiction",
    tone: project.config.tone || "literary",
    language: project.config.language || "English",
    audience: project.config.audience || "Adults",
    authorStyle: project.config.authorStyle || "Literary commercial",
    numberOfChapters: project.chapterCount,
    chapterLength: "medium",
    bookLength: "long",
    subchaptersEnabled: false,
    bookIntelligence: project.config.bookIntelligence,
    authorIdentity: project.config.authorIdentity,
    ...project.config,
  } as BookConfig;
}

export interface FairPromptBundle {
  userPrompt: string;
  competitorSystemPrompt: string;
  scriptoraSystemPrompt: string;
}

export function buildFairPromptBundle(input: {
  project: RealWorldProject;
  chapterIndex: number;
  previousChapters: Chapter[];
  smoke: boolean;
  extraConstraints?: string;
}): FairPromptBundle {
  const { project, chapterIndex, previousChapters, smoke } = input;
  const config = toBookConfig(project);
  const blueprint = minimalBlueprint(project);
  const wordTarget = wordTargetForHarness(project, smoke);
  const chapterGoal = chapterGoalForProject(project, chapterIndex);

  const contextBlock = buildContextMemoryBlock(config, blueprint, previousChapters, chapterIndex);
  const intelligence = config.bookIntelligence?.layers?.readerExpectations
    ? resolveBookIntelligenceFromConfig(config, config.bookIntelligence)
    : buildBookIntelligenceSnapshot({
        idea: config.title,
        title: config.title,
        genre: config.genre,
        tone: config.tone,
      });
  const intelligenceBlock = buildBookIntelligencePromptBlock(intelligence);
  const genreSystem = buildGenreSystemBlock(config.genre, (config as any).subcategory);
  const genreEditorial = buildGenreEditorialBlock(config.genre, (config as any).subcategory);
  const masteryBlock = buildEditorialMasteryBlock({
    genre: config.genre,
    subcategory: (config as any).subcategory,
    language: config.language,
    tone: config.tone,
  });
  const narrativeSystem = buildNarrativeIntelligenceSystemBlock(config);
  const narrativeRuntime = buildNarrativeIntelligenceRuntimeBlock({
    config,
    blueprint,
    previousChapters,
    chapterIndex,
  });
  const humanizer = buildHumanizerPromptBlock({
    config,
    previousChapters,
    chapterIndex,
    outlineSummary: chapterGoal,
  });
  const humanWriting = buildHumanWritingPromptBlock(config);
  const bestseller = buildBestsellerIntelligencePromptBlock(config, chapterIndex);
  const genreDirective = buildPromptByGenre({
    genre: config.genre,
    subcategory: (config as any).subcategory,
    chapterTitle: `Chapter ${chapterIndex + 1}`,
    chapterSummary: chapterGoal,
    language: config.language,
  });
  const authorBlock = buildAuthorIdentityBlock(config);

  const userPrompt = [
    `Write Chapter ${chapterIndex + 1} of "${project.title}".`,
    ``,
    `Genre: ${config.genre}`,
    `Tone: ${config.tone}`,
    `Language: ${config.language}`,
    ``,
    `CHAPTER GOAL:`,
    chapterGoal,
    ``,
    `CONSTRAINTS (same for all models — no optimization):`,
    `- Target length: ~${wordTarget} words`,
    `- Do not summarize the task; write the chapter only`,
    `- No meta commentary`,
    input.extraConstraints || "",
    ``,
    `CONTEXT FROM PRIOR CHAPTERS:`,
    previousChapters.length
      ? previousChapters.map((c, i) => `[Ch ${i + 1}] ${c.content.slice(0, 400)}...`).join("\n\n")
      : "None — this is the opening chapter.",
  ]
    .filter(Boolean)
    .join("\n");

  const scriptoraSystemPrompt = [
    genreSystem,
    intelligenceBlock,
    genreEditorial,
    masteryBlock,
    narrativeSystem,
    authorBlock,
    contextBlock,
    genreDirective,
    humanWriting,
    humanizer,
    narrativeRuntime,
    bestseller,
    ``,
    `SCRIPTORA AUTHOR PASS — write as a real publishing editor would approve.`,
    `Scene logic: desire, obstacle, tension, choice, consequence.`,
    `Show emotion through behavior and subtext, not exposition.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    userPrompt,
    competitorSystemPrompt: COMPETITOR_SYSTEM,
    scriptoraSystemPrompt,
  };
}

export function buildChapterDoctorRevisionPrompt(chapterText: string, surgicalBlock: string): FairPromptBundle {
  return {
    userPrompt: `Revise this chapter. Apply surgical edits only. Preserve POV and voice.\n\n---\n${chapterText}\n---`,
    competitorSystemPrompt: `You are a developmental editor. Improve pacing, hook, and emotional realism. Max 15% change. Preserve voice.`,
    scriptoraSystemPrompt: surgicalBlock,
  };
}

export function competitorSystemPromptOnly(): string {
  return COMPETITOR_SYSTEM;
}
