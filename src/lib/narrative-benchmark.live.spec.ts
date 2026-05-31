import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import { generateSubchapter } from "@/lib/generation";
import { getNarrativeTelemetrySnapshot } from "@/lib/narrative-intelligence";

type SceneType = "opening" | "confrontation" | "dialogue" | "cliffhanger";

interface GenreCase {
  id: string;
  label: string;
  genre: BookConfig["genre"];
  subcategory: string;
  tone: string;
  prompts: Record<SceneType, string>;
}

const sceneOrder: SceneType[] = ["opening", "confrontation", "dialogue", "cliffhanger"];

const genreCases: GenreCase[] = [
  {
    id: "dark-romance",
    label: "Dark Romance",
    genre: "dark-romance",
    subcategory: "Dark Romance",
    tone: "obsessive, intimate, dangerous",
    prompts: {
      opening: "Opening scene with dangerous attraction and emotional restraint.",
      confrontation: "Emotional confrontation with denial, jealousy and vulnerability avoidance.",
      dialogue: "Dialogue-heavy scene with loaded subtext and interrupted intimacy.",
      cliffhanger: "Ending scene that escalates desire and danger without full payoff.",
    },
  },
  {
    id: "mafia-romance",
    label: "Mafia Romance",
    genre: "dark-romance",
    subcategory: "Mafia Romance",
    tone: "volatile, high-stakes, possessive",
    prompts: {
      opening: "Opening scene with power imbalance, attraction, and looming threat.",
      confrontation: "Confrontation scene: loyalty vs desire under pressure.",
      dialogue: "Dialogue scene with control tactics, emotional friction and implied violence.",
      cliffhanger: "Chapter-end cliffhanger with consequence and emotional hook.",
    },
  },
  {
    id: "thriller",
    label: "Thriller",
    genre: "thriller",
    subcategory: "Psychological Thriller",
    tone: "urgent, paranoid, razor-sharp",
    prompts: {
      opening: "Opening scene with immediate uncertainty and danger.",
      confrontation: "Confrontation under suspicion where truth remains unstable.",
      dialogue: "Dialogue-heavy interrogation with strategic withholding.",
      cliffhanger: "Ending beat with unresolved threat and forward pull.",
    },
  },
  {
    id: "psychological-horror",
    label: "Psychological Horror",
    genre: "thriller",
    subcategory: "Psychological Horror",
    tone: "dread-heavy, uncanny, intimate terror",
    prompts: {
      opening: "Opening scene introducing subtle psychological distortion.",
      confrontation: "Confrontation where perception and reality collide.",
      dialogue: "Dialogue scene with creeping dread and destabilized trust.",
      cliffhanger: "Ending scene with unresolved terror and existential uncertainty.",
    },
  },
  {
    id: "cozy-fantasy",
    label: "Cozy Fantasy",
    genre: "fantasy",
    subcategory: "Cozy Fantasy",
    tone: "warm, atmospheric, comforting but alive",
    prompts: {
      opening: "Opening scene with soft immersion, sensory atmosphere and gentle hook.",
      confrontation: "Emotional confrontation with warmth, honesty and relational tension.",
      dialogue: "Dialogue-forward scene with comfort, wit and human imperfection.",
      cliffhanger: "Ending scene with tender unresolved curiosity rather than hard shock.",
    },
  },
  {
    id: "enemies-to-lovers",
    label: "Enemies-to-Lovers",
    genre: "romance",
    subcategory: "Academic Enemies to Lovers",
    tone: "intellectual, sharp, restrained heat",
    prompts: {
      opening: "Opening scene with rivalry chemistry and immediate friction.",
      confrontation: "Confrontation scene where pride blocks vulnerable truth.",
      dialogue: "Dialogue-heavy verbal sparring with layered attraction.",
      cliffhanger: "Ending beat with unresolved desire and strategic retreat.",
    },
  },
  {
    id: "emotional-literary-fiction",
    label: "Emotional Literary Fiction",
    genre: "memoir",
    subcategory: "Emotional Literary Fiction",
    tone: "introspective, emotionally precise, human",
    prompts: {
      opening: "Opening scene with nuanced emotional atmosphere and quiet hook.",
      confrontation: "Confrontation scene driven by subtext and emotional restraint.",
      dialogue: "Dialogue scene where silence and implication carry meaning.",
      cliffhanger: "Ending scene with unresolved emotional pressure and reflective pull.",
    },
  },
];

function makeConfig(entry: GenreCase): BookConfig {
  return {
    title: `Benchmark ${entry.label}`,
    subtitle: "Live Narrative Intelligence Validation",
    language: "English",
    genre: entry.genre,
    category: "Fiction",
    subcategory: entry.subcategory,
    chapterLength: "short",
    numberOfChapters: 24,
    tone: entry.tone,
    audience: "Adults",
    authorStyle: "Cinematic literary realism",
    bookLength: "short",
    customTotalWords: 12000,
    subchaptersEnabled: true,
    subchaptersPerChapter: 4,
  };
}

function makeBlueprint(entry: GenreCase): BookBlueprint {
  return {
    overview: `Live benchmark project for ${entry.label}.`,
    chapterOutlines: [
      {
        title: `${entry.label} benchmark chapter`,
        summary: "A chapter designed to stress-test emotional realism, pacing and genre adaptation.",
        subchapters: sceneOrder.map((scene) => ({
          title: `${entry.label} ${scene}`,
          summary: entry.prompts[scene],
        })),
      },
    ],
    themes: ["emotional realism", "genre adaptation", "reader immersion"],
    emotionalArc: "Escalating emotional pressure with delayed payoff.",
  };
}

function evaluateHumanSignals(text: string) {
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;
  const dialogueLines = (text.match(/["“”]/g) || []).length;
  const interruptionSignals = (lower.match(/—|\.{3}|\. \.\.|stopped|paused|hesitated|silence|didn't|couldn't/g) || []).length;
  const overExplainSignals = (lower.match(/i felt|she felt|he felt|i realized|she realized|he realized|in that moment/g) || []).length;
  const aiCleanSignals = (lower.match(/it is important to note|in this chapter|delve into|ultimately/g) || []).length;
  const metaphorSignals = (lower.match(/like a|as if|as though/g) || []).length;
  const continuationPressure = (text.trim().slice(-220).match(/\?|but|yet|until|before|when|however|except|suddenly/gi) || []).length;

  return {
    words,
    dialogueDensity: Number((dialogueLines / Math.max(1, words) * 100).toFixed(2)),
    interruptionDensity: Number((interruptionSignals / Math.max(1, words) * 100).toFixed(2)),
    overExplainDensity: Number((overExplainSignals / Math.max(1, words) * 100).toFixed(2)),
    aiCleanDensity: Number((aiCleanSignals / Math.max(1, words) * 100).toFixed(2)),
    metaphorDensity: Number((metaphorSignals / Math.max(1, words) * 100).toFixed(2)),
    continuationPressure,
  };
}

describe.skipIf(process.env.LIVE_NARRATIVE_BENCHMARK !== "1")("Live Narrative Intelligence benchmark", () => {
  it(
    "generates real multi-genre benchmark samples with telemetry",
    async () => {
      const results: Array<Record<string, unknown>> = [];
      const outputDir = resolve(process.cwd(), "benchmark-logs");
      mkdirSync(outputDir, { recursive: true });

      for (const entry of genreCases) {
        const config = makeConfig(entry);
        const blueprint = makeBlueprint(entry);
        const generatedScenes: Chapter[] = [];
        const chapter: Chapter = {
          title: blueprint.chapterOutlines[0].title,
          content: `${entry.label} benchmark anchor paragraph.`,
          subchapters: [],
          status: "idle",
        };

        for (let i = 0; i < sceneOrder.length; i += 1) {
          const scene = sceneOrder[i];
          const generated = await generateSubchapter(
            config,
            blueprint,
            0,
            i,
            chapter,
            generatedScenes,
          );

          chapter.subchapters.push(generated);
          chapter.content += `\n\n${generated.content}`;
          const asChapter: Chapter = {
            title: generated.title,
            content: generated.content,
            subchapters: [],
            status: "completed",
          };
          generatedScenes.push(asChapter);

          const telemetry = getNarrativeTelemetrySnapshot({
            config,
            currentText: generated.content,
          });
          const humanAudit = evaluateHumanSignals(generated.content);

          results.push({
            genreId: entry.id,
            genreLabel: entry.label,
            scene,
            title: generated.title,
            content: generated.content,
            telemetry,
            humanAudit,
          });
        }
      }

      const summary = {
        generatedAt: new Date().toISOString(),
        totalSamples: results.length,
        genres: genreCases.map((g) => g.label),
        samples: results,
      };

      writeFileSync(
        resolve(outputDir, "narrative-live-benchmark.json"),
        JSON.stringify(summary, null, 2),
        "utf8",
      );

      const markdownRows = results
        .map((r) => {
          const t = r.telemetry as any;
          const h = r.humanAudit as any;
          return [
            r.genreLabel,
            r.scene,
            t.scores.emotionalRealismScore,
            t.scores.aiRiskScore,
            t.scores.commercialMomentumScore,
            t.scores.readerDropRiskEstimate,
            h.overExplainDensity,
            h.aiCleanDensity,
            h.continuationPressure,
          ].join(" | ");
        })
        .join("\n");

      const md = `# Narrative Live Benchmark\n\nGenerated samples: ${results.length}\n\nGenre | Scene | Emotional Realism | AI Risk | Momentum | Drop Risk | Overexpl. Density | AI-clean Density | Continuation Pressure\n---|---:|---:|---:|---:|---:|---:|---:|---:\n${markdownRows}\n`;
      writeFileSync(resolve(outputDir, "narrative-live-benchmark.md"), md, "utf8");

      expect(results.length).toBe(genreCases.length * sceneOrder.length);
    },
    1_800_000,
  );
});

