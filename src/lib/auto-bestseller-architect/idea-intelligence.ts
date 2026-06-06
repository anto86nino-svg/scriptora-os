import { detectBookIntelligence } from "@/lib/book-intelligence";
import type { AutoBestsellerInput } from "@/services/autoBestsellerService";
import { getIdeaIntelligenceCopy, normalizeArchitectLang } from "./localized-copy";
import type { IdeaIntelligenceResult } from "./types";

function commercialLaneFromReport(
  report: ReturnType<typeof detectBookIntelligence>,
  lang: ReturnType<typeof normalizeArchitectLang>,
): string {
  const copy = getIdeaIntelligenceCopy(lang);
  const { layers } = report;
  if (layers.domain === "fiction") {
    if (/romance|dark-romance|enemies|mafia/.test(layers.writingBrainId)) {
      return copy.lanes.romance;
    }
    if (/thriller|crime|mystery|psychological/.test(layers.writingBrainId)) {
      return copy.lanes.thriller;
    }
    if (/fantasy|epic|paranormal|sci-fi|dystopian/.test(layers.writingBrainId)) {
      return copy.lanes.speculative;
    }
    return copy.lanes.character;
  }
  if (/productivity|business|finance/.test(layers.writingBrainId)) {
    return copy.lanes.business;
  }
  if (/psychology|self-help|spirituality/.test(layers.writingBrainId)) {
    return copy.lanes.transform;
  }
  if (/horticultural|practical-manual|cookbook|technical/.test(layers.writingBrainId)) {
    return copy.lanes.instructional;
  }
  return copy.lanes.fallback;
}

export function inferIdeaIntelligence(input: AutoBestsellerInput): IdeaIntelligenceResult {
  const lang = normalizeArchitectLang(input.language);
  const copy = getIdeaIntelligenceCopy(lang);
  const report = detectBookIntelligence({
    idea: input.idea,
    genre: input.genre,
    subcategory: input.subcategory,
    tone: input.tone,
  });

  const domain = report.layers.domain;
  const baseEmotion =
    domain === "fiction"
      ? copy.fictionEmotion
      : domain === "nonfiction"
        ? copy.nonfictionEmotion
        : copy.defaultEmotion;
  const emotionalCategory =
    report.layers.archetype && report.layers.archetype !== "general"
      ? `${baseEmotion} · ${report.layers.archetype}`
      : baseEmotion;

  const useEnglishBrainCopy = lang === "English";
  const readerExpectation =
    useEnglishBrainCopy && report.layers.readerExpectations?.length
      ? report.layers.readerExpectations.slice(0, 2).join(" ")
      : domain === "fiction"
        ? copy.fictionExpectation
        : copy.nonfictionExpectation;

  return {
    genre: report.resolvedGenre,
    subgenre: report.subcategory || report.layers.subgenre,
    emotionalCategory,
    commercialLane: commercialLaneFromReport(report, lang),
    readerExpectation,
    confidence: report.confidence,
    signals: report.signals,
    report,
  };
}
