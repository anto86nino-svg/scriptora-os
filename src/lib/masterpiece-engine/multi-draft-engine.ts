import type { BookConfig } from "@/types/book";
import { computeGreatnessScore } from "@/lib/greatness-engine";
import { simulateReaderInLoop } from "@/lib/reader-simulation";
import { analyzeSubtext } from "@/lib/subtext-engine";
import { analyzeTensionV2 } from "@/lib/tension-engine-v2";
import type { DraftCandidate, DraftLabel, MultiDraftReport } from "./types";
import { clamp100, endingChars, openingWords, splitScenes } from "./utils";

function generateDraftB(content: string): string {
  let next = content;
  const open = openingWords(next, 80);
  if (!/\?/.test(open.slice(0, 200))) {
    next = next.replace(/^([^.!?]+[.!?])/, "$1 But the obvious answer was wrong.");
  }
  next = next
    .replace(/\b(finally understood|everything was fine|tutto va bene)\b/gi, "still did not know")
    .replace(/\b(walked into|entered)\b/gi, "hesitated before entering");
  const paragraphs = splitScenes(next);
  if (paragraphs.length >= 2 && !/\?/.test(endingChars(next))) {
    paragraphs[paragraphs.length - 1] = `${paragraphs[paragraphs.length - 1].replace(/\.$/, "")} — and the question had no safe answer.`;
    next = paragraphs.join("\n\n");
  }
  return next.trim();
}

function generateDraftC(content: string): string {
  let next = content;
  const paragraphs = splitScenes(next);
  if (paragraphs.length && !/\b(phone|door|key|light|rain|silence|window)\b/i.test(paragraphs[0])) {
    paragraphs[0] = `${paragraphs[0].replace(/\.$/, "")}. One detail stuck — wrong, but unforgettable.`;
  }
  if (!/\bSome details stay\b/i.test(next)) {
    const insertAt = Math.min(1, Math.max(0, paragraphs.length - 1));
    paragraphs.splice(insertAt + 1, 0, "Some details stay — even when you want to forget them.");
  }
  if (!/\b(?:next move|still waited|unanswered)\b/i.test(endingChars(next))) {
    paragraphs.push("The next move would not wait for her.");
  }
  return paragraphs.join("\n\n").trim();
}

function scoreDraft(input: {
  content: string;
  label: DraftLabel;
  config: BookConfig;
  chapterIndex: number;
  totalChapters: number;
}): DraftCandidate {
  const text = input.content;
  const tension = analyzeTensionV2({
    content: text,
    chapterIndex: input.chapterIndex,
    config: input.config,
  });
  const subtext = analyzeSubtext({ content: text, chapterIndex: input.chapterIndex });
  const greatness = computeGreatnessScore({
    content: text,
    config: input.config,
    chapterIndex: input.chapterIndex,
  }).greatnessScore;
  const reader = simulateReaderInLoop({
    content: text,
    chapterIndex: input.chapterIndex,
    config: input.config,
    totalChapters: input.totalChapters,
  });
  const memorability = greatness.dimensions.memorability;

  const compositeScore = clamp100(
    tension.narrativeTension * 0.2 +
      subtext.subtextScore * 0.18 +
      memorability * 0.22 +
      reader.retention * 0.2 +
      greatness.composite * 0.2,
  );

  return {
    label: input.label,
    content: text,
    compositeScore,
    tension: tension.narrativeTension,
    subtext: subtext.subtextScore,
    memorability,
    readerRetention: reader.retention,
    greatness: greatness.composite,
  };
}

export function runMultiDraftSelection(input: {
  content: string;
  config: BookConfig;
  chapterIndex: number;
  totalChapters: number;
}): { content: string; report: MultiDraftReport } {
  const draftA = scoreDraft({ ...input, content: input.content, label: "A" });
  const draftB = scoreDraft({ ...input, content: generateDraftB(input.content), label: "B" });
  const draftC = scoreDraft({ ...input, content: generateDraftC(input.content), label: "C" });

  const candidates = [draftA, draftB, draftC].sort((a, b) => {
    if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore;
    return b.memorability - a.memorability;
  });
  const winner = candidates[0];
  const runnerUp = candidates[1];

  return {
    content: winner.content,
    report: {
      candidates,
      selected: winner.label,
      selectedScore: winner.compositeScore,
      margin: winner.compositeScore - runnerUp.compositeScore,
    },
  };
}
