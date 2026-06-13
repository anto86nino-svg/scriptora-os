import { resolveBookTypeDefinition } from "@/lib/book-type-engine";
import type { GreatnessChapterReport } from "./types";
import { average, clampScore } from "./utils";
import { scoreHookPower } from "./hook-power";
import { scoreChapterEndingMagnetism } from "./chapter-ending";
import { scoreMemorability } from "./memorability";
import { scoreReaderAddiction } from "./reader-addiction";
import { scoreEmotionalAftertaste } from "./emotional-aftertaste";
import { scoreSceneImpact } from "./scene-impact";
import { buildMarketWinnerPromptBlock, resolveMarketWinnerMode, scoreMarketWinnerLite } from "./market-winner";

export interface GreatnessEvaluationInput {
  content: string;
  chapterIndex: number;
  genre: string;
  subcategory?: string;
  subgenre?: string;
  bookTypeId?: string;
}

function buildOptimizations(
  hook: ReturnType<typeof scoreHookPower>,
  ending: ReturnType<typeof scoreChapterEndingMagnetism>,
  addiction: ReturnType<typeof scoreReaderAddiction>,
  aftertaste: ReturnType<typeof scoreEmotionalAftertaste>,
  memorability: ReturnType<typeof scoreMemorability>,
): string[] {
  const out: string[] = [];
  if (hook.score < 62) out.push("Rafforza hook: entra con domanda, rischio o dettaglio sbagliato — non con atmosfera generica.");
  if (ending.score < 62) out.push("Magnetizza chiusura: reveal incompleto, cliffhanger o nuova domanda.");
  if (addiction.score < 60) out.push("Aumenta compulsive readability: più turni di scena, meno drag espositivo.");
  if (aftertaste.score < 58) out.push("Aumenta aftertaste: silenzi, gesti, immagini residue — meno spiegazioni emotive.");
  if (memorability.score < 58) out.push("Inserisci 1–2 dettagli unici o micro-simboli memorabili.");
  if (addiction.dropRisk >= 58) out.push("Riduci drop risk: taglia riflessione consecutiva senza nuova informazione.");
  return out.slice(0, 6);
}

export function evaluateGreatnessChapter(input: GreatnessEvaluationInput): GreatnessChapterReport {
  const family = resolveBookTypeDefinition(
    input.genre,
    input.subcategory,
    input.subgenre,
    input.bookTypeId,
  ).family;
  const fiction = family === "narrative" || family === "poetry";
  const content = String(input.content || "").trim();

  const hook = scoreHookPower(content, fiction);
  const ending = scoreChapterEndingMagnetism(content);
  const memorability = scoreMemorability(content);
  const addiction = scoreReaderAddiction(content, fiction);
  const aftertaste = scoreEmotionalAftertaste(content);
  const scenes = scoreSceneImpact(content, fiction);
  const mode = resolveMarketWinnerMode(input.genre, family);
  const marketWinnerLite = scoreMarketWinnerLite(mode, hook, ending, addiction, memorability);
  const sceneImpactAverage = clampScore(average(scenes.map((scene) => scene.average)));

  const overall = clampScore(
    hook.score * 0.2 +
    ending.score * 0.18 +
    memorability.score * 0.14 +
    addiction.score * 0.18 +
    aftertaste.score * 0.12 +
    sceneImpactAverage * 0.1 +
    marketWinnerLite * 0.08,
  );

  const optimizations = buildOptimizations(hook, ending, addiction, aftertaste, memorability);
  const microSurgeries = scenes.filter((scene) => scene.weak && scene.microSurgery).map((scene) => scene.microSurgery!).slice(0, 4);

  return {
    version: 1,
    chapterIndex: input.chapterIndex,
    evaluatedAt: new Date().toISOString(),
    genreMode: mode,
    scores: {
      hookPower: hook.score,
      endingMagnetism: ending.score,
      memorability: memorability.score,
      compulsiveReadability: addiction.score,
      emotionalAftertaste: aftertaste.score,
      sceneImpactAverage,
      marketWinnerLite,
      overall,
    },
    scenes,
    optimizations,
    microSurgeries,
  };
}

export function buildGreatnessOptimizationBlock(report: GreatnessChapterReport): string {
  if (report.scores.overall >= 74) return "";
  const lines = [
    ...report.optimizations.map((item) => `• ${item}`),
    ...report.microSurgeries.map((item) => `• Scene surgery: ${item}`),
  ];
  if (!lines.length) return "";
  return `GREATNESS OPTIMIZATION TARGETS (live score ${report.scores.overall}/100):
${lines.join("\n")}`;
}

export { buildMarketWinnerPromptBlock, resolveMarketWinnerMode };
