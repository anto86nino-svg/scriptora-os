import type { Chapter } from "@/types/book";
import type { NarrativeBrainV3Context } from "./types";
import { runDevelopmentalEditorPass } from "./developmental-editor";
import { sanitizeNarrativeOutput } from "./sanitization-guard";

export function applyMasterpiecePostPass(
  chapter: Chapter,
  context: NarrativeBrainV3Context,
): Chapter {
  let content = chapter.content || "";
  const report = runDevelopmentalEditorPass(content, context.config);
  content = sanitizeNarrativeOutput(content, context.config, chapter.title);

  if (report.score < 75 && report.surgicalFixes.length) {
    // Deterministic micro-fixes without extra AI call
    content = content
      .replace(/\b(I understand (?:now|you|everything))\b/gi, "I— I don't know how to say this")
      .replace(/\b(capisco (?:tutto|perfettamente))\b/gi, "forse non è così semplice");
  }

  return { ...chapter, content };
}
