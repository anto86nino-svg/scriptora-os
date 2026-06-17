import type { V13Context, V13Result } from "./types";
import { runNarrativeIntelligenceDirector } from "./narrative-intelligence-director";
import { runEmotionalMomentumEngine } from "./emotional-momentum-engine";
import { runSceneMagnetismEngine } from "./scene-magnetism-engine";
import { runReaderAddictionEngine } from "./reader-addiction-engine";
import { runTruthOfGenreEngine } from "./truth-of-genre-engine";
import { runInvisibleAiDetectionLayer, applyInvisibleAiCleanup } from "./invisible-ai-detection-layer";

export function runWritingEngineV13Audit(text: string, ctx: V13Context = {}): V13Result {
  const results = [
    runNarrativeIntelligenceDirector(text, ctx),
    runEmotionalMomentumEngine(text, ctx),
    runSceneMagnetismEngine(text, ctx),
    runReaderAddictionEngine(text, ctx),
    runTruthOfGenreEngine(text, ctx),
    runInvisibleAiDetectionLayer(text, ctx),
  ];

  const score = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  const signals = results.flatMap(r => r.signals).sort((a, b) => a.score - b.score);
  const directives = Array.from(new Set(results.flatMap(r => r.directives))).slice(0, 18);

  return { score, signals, directives };
}

export function buildWritingEngineV13Block(text: string, ctx: V13Context = {}): string {
  const audit = runWritingEngineV13Audit(text || "", ctx);
  const top = audit.signals.slice(0, 6);

  return [
    "SCRIPTORA WRITING ENGINE V13 — MASTER ORCHESTRATION",
    `Quality target: 10/10 commercial readability and human authenticity.`,
    `Current diagnostic score: ${audit.score}/100.`,
    "",
    "TOP RISKS TO FIX:",
    ...(top.length ? top.map(s => `- ${s.id}: ${s.message}`) : ["- No critical risks detected. Preserve voice and raise precision."]),
    "",
    "DIRECTIVES:",
    ...audit.directives.map(d => `- ${d}`),
    "",
    "ABSOLUTE RULE:",
    "Do not write prettier. Write truer, sharper, more specific, more consequential, and harder to stop reading.",
  ].join("\n");
}

export function applyWritingEngineV13Postprocess(text: string, ctx: V13Context = {}): string {
  let next = text;
  next = applyInvisibleAiCleanup(next);
  return next.replace(/\n{3,}/g, "\n\n").trim();
}
