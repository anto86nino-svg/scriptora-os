import type { BookConfig } from "@/types/book";
import { applyAntiRepetitionDirector } from "@/lib/editorial-wow/AntiRepetitionDirector";
import { applyPremiumOutputGuard } from "@/lib/premium-writing/output-sanitization-guard";
import { resolveBookTypeContext } from "@/lib/book-type-engine";

export interface ManuscriptQualityV3Result {
  text: string;
  antiRepetitionRemoved: number;
  sanitized: boolean;
}

/**
 * Manuscript Quality Engine V3 — anti-repetition, humanization, output sanitization.
 */
export function runManuscriptQualityV3(
  text: string,
  opts: { language?: string; priorText?: string; config?: BookConfig; chapterIndex?: number },
): ManuscriptQualityV3Result {
  const language = opts.language || opts.config?.language || "Italian";
  let processed = text || "";

  const anti = applyAntiRepetitionDirector(processed, language, opts.priorText || "");
  processed = anti.text;

  if (opts.config) {
    const ctx = resolveBookTypeContext(opts.config);
    if (ctx.definition.family === "narrative") {
      processed = applyPremiumOutputGuard(processed, { language });
    } else if (ctx.definition.family === "nonfiction" || ctx.definition.family === "manual" || ctx.definition.family === "educational") {
      processed = processed.replace(/\b(bestseller emotivo|slow burn|chimica romantica|attrazione irresistibile)\b/gi, "");
    } else if (ctx.definition.family === "poetry") {
      processed = processed.replace(/^(Obiettivo capitolo|Prompt|Istruzione)[:\-–—].*$/gim, "");
    }
  }

  processed = applyPremiumOutputGuard(processed, { language });

  return {
    text: processed.trim(),
    antiRepetitionRemoved: anti.removedCount,
    sanitized: true,
  };
}
