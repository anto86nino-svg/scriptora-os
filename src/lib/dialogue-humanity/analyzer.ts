import type { DialogueHumanityReport } from "./types";

const PERFECT_DIALOGUE = [
  /\b(?:I love you|ti amo|you complete me|sei tutto|for always|per sempre|my everything)\b/gi,
  /\b(?:I understand exactly how you feel|capisco esattamente come ti senti)\b/gi,
];

const THERAPIST_DIALOGUE = [
  /\b(?:what I'm hearing is|what you need to understand|it's important to validate|your feelings are valid)\b/gi,
  /\b(?:parliamo di|let's process|healing journey|spazio sicuro)\b/gi,
];

const OVERLY_MATURE = [
  /\b(?:I've come to accept|ho imparato che|the truth is we all|in the grand scheme)\b/gi,
];

const EXPOSITORY = [
  /"[^"]{0,40}(?:because|perché|the reason|il motivo)[^"]{10,}"/gi,
  /"[^"]{0,30}(?:as you know|come sai|remember when|ricordi quando)[^"]+"/gi,
];

function extractDialogueLines(text: string): string[] {
  return (text.match(/"[^"]+"/g) || []).map(s => s.slice(1, -1));
}

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function analyzeDialogueHumanity(input: { content: string; chapterIndex: number }): DialogueHumanityReport {
  const text = String(input.content || "");
  const lines = extractDialogueLines(text);
  const weakLines: string[] = [];

  const countIn = (patterns: RegExp[], source: string) =>
    patterns.reduce((n, p) => {
      p.lastIndex = 0;
      const m = source.match(p) || [];
      m.forEach(hit => weakLines.push(hit.slice(0, 80)));
      return n + m.length;
    }, 0);

  const perfectDialogueLines = countIn(PERFECT_DIALOGUE, text);
  const therapistDialogueLines = countIn(THERAPIST_DIALOGUE, text);
  const overlyMatureLines = countIn(OVERLY_MATURE, text);
  const expositoryDialogueLines = countIn(EXPOSITORY, text);

  const interruptionBeats = (text.match(/(?:—|\.\.\.|…|\-\-)[^.!?]*[.!?]/g) || []).length;
  const evasionBeats = (text.match(/\b(?:anyway|comunque|doesn't matter|non importa|I don't know|non lo so)\b/gi) || []).length;
  const silenceBeats = (text.match(/\b(?:silence|silenz|didn't answer|non rispose|said nothing|disse niente)\b/gi) || []).length;

  const humanBeats = interruptionBeats + evasionBeats + silenceBeats;
  const aiBeats = perfectDialogueLines + therapistDialogueLines + overlyMatureLines + expositoryDialogueLines;

  const humanityScore = clamp100(70 + humanBeats * 4 - aiBeats * 12 + Math.min(15, lines.length));

  return {
    version: 1,
    chapterIndex: input.chapterIndex,
    evaluatedAt: new Date().toISOString(),
    metrics: {
      perfectDialogueLines,
      therapistDialogueLines,
      overlyMatureLines,
      expositoryDialogueLines,
      interruptionBeats,
      evasionBeats,
      silenceBeats,
    },
    humanityScore,
    weakLines: weakLines.slice(0, 5),
    passesGate: therapistDialogueLines === 0 && perfectDialogueLines <= 1 && humanityScore >= 50,
  };
}

export function enhanceDialogueHumanity(text: string): string {
  let next = text;
  next = next.replace(/\bI understand exactly how you feel\b/gi, "I don't know what to say to that.");
  next = next.replace(/\bwhat I'm hearing is\b/gi, "So you're saying");
  next = next.replace(/"([^"]{80,})"/g, (match, inner) => {
    if (!/\b(because|perché)\b/i.test(inner)) return match;
    const cut = inner.split(/,\s+/)[0];
    return `"${cut}."`;
  });
  return next;
}
