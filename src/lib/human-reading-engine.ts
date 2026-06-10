import { sanitizeAudiobookText, DEFAULT_AUDIOBOOK_WPM } from "@/lib/audiobook-export";

export type ReadingSegmentType = "title" | "paragraph" | "dialogue" | "pause" | "scene_break";
export type ReadingTone = "narrative" | "dialogue" | "dramatic" | "soft" | "suspense" | "informative";
export type HumanReadingModeId = "narrative" | "night" | "study" | "theatre";

export interface ReadingSegment {
  id: string;
  text: string;
  type: ReadingSegmentType;
  pauseAfterMs: number;
  suggestedRate: number;
  suggestedPitch: number;
  tone: ReadingTone;
}

export interface HumanReadingMode {
  id: HumanReadingModeId;
  label: string;
  baseRate: number;
  basePitch: number;
  pauseMultiplier: number;
}

export interface HumanReadingQueueItem extends ReadingSegment {
  utteranceText: string;
}

export interface BuildHumanReadingQueueOptions {
  mode?: HumanReadingModeId;
  chapterTitle?: string;
  genreHint?: string;
}

export const HUMAN_READING_MODES: Record<HumanReadingModeId, HumanReadingMode> = {
  narrative: {
    id: "narrative",
    label: "Narrativa",
    baseRate: 0.95,
    basePitch: 1,
    pauseMultiplier: 1,
  },
  night: {
    id: "night",
    label: "Notte",
    baseRate: 0.85,
    basePitch: 0.95,
    pauseMultiplier: 1.25,
  },
  study: {
    id: "study",
    label: "Studio",
    baseRate: 1,
    basePitch: 1,
    pauseMultiplier: 0.85,
  },
  theatre: {
    id: "theatre",
    label: "Teatro",
    baseRate: 0.9,
    basePitch: 1.02,
    pauseMultiplier: 1.15,
  },
};

const SCENE_BREAK_PATTERN = /^(\*{3,}|-{3,}|#{3,}|\.{3,})$/;
const TITLE_LINE_PATTERN = /^(capitolo\s+\d+|chapter\s+\d+|[IVXLC]+\.)/i;

export function sanitizeReadableText(text: string): string {
  return sanitizeAudiobookText(text);
}

export function detectReadingTone(segment: Pick<ReadingSegment, "text" | "type">): ReadingTone {
  const lower = segment.text.toLowerCase();

  if (segment.type === "dialogue") return "dialogue";
  if (segment.type === "title" || segment.type === "scene_break") return "informative";

  if (/(silenzio|ombra|buio|paura|nascost|pericolo|dark|shadow|fear|whisper|danger)/i.test(lower)) {
    return "suspense";
  }
  if (/(grid|spar|colp|sangue|war|fight|attack|blood|scream)/i.test(lower)) {
    return "dramatic";
  }
  if (/(mano|pelle|respiro|cuore|bacio|amore|touch|breath|heart|kiss|love)/i.test(lower)) {
    return "soft";
  }
  if (/(come|perché|significa|metodo|passo|consiglio|how to|step|guide|tip)/i.test(lower)) {
    return "informative";
  }

  return "narrative";
}

function isDialogueLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^[«“"']/.test(trimmed) && /[»”"']/.test(trimmed)) return true;
  if (/^\s*[—–-]\s+/.test(trimmed)) return true;
  if (/^[-–—]\s*[«“"']/.test(trimmed)) return true;
  return false;
}

function isTitleLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 90) return false;
  if (TITLE_LINE_PATTERN.test(trimmed)) return true;
  if (trimmed.length < 48 && /^[A-ZÀ-Ü0-9][^.!?]*$/.test(trimmed) && trimmed.split(/\s+/).length <= 8) {
    return true;
  }
  return false;
}

function toneRatePitch(tone: ReadingTone, mode: HumanReadingMode): { rate: number; pitch: number } {
  let rate = mode.baseRate;
  let pitch = mode.basePitch;

  switch (tone) {
    case "dialogue":
      rate += mode.id === "theatre" ? 0.04 : 0.02;
      pitch += mode.id === "theatre" ? 0.04 : 0.02;
      break;
    case "dramatic":
      rate -= 0.03;
      pitch += 0.02;
      break;
    case "soft":
      rate -= 0.05;
      pitch -= 0.02;
      break;
    case "suspense":
      rate -= 0.06;
      pitch -= 0.03;
      break;
    case "informative":
      rate += 0.02;
      break;
    default:
      break;
  }

  return {
    rate: Math.max(0.5, Math.min(1.55, rate)),
    pitch: Math.max(0.75, Math.min(1.25, pitch)),
  };
}

function pauseForType(type: ReadingSegmentType, mode: HumanReadingMode): number {
  const base = {
    title: 900,
    paragraph: 420,
    dialogue: 320,
    pause: 600,
    scene_break: 1100,
  }[type];

  return Math.round(base * mode.pauseMultiplier);
}

export function splitTextForHumanReading(text: string, prefix = "seg"): ReadingSegment[] {
  const clean = sanitizeReadableText(text);
  if (!clean.trim()) return [];

  const segments: ReadingSegment[] = [];
  let counter = 0;

  const blocks = clean.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  for (const block of blocks) {
    if (SCENE_BREAK_PATTERN.test(block)) {
      segments.push({
        id: `${prefix}-${counter++}`,
        text: "",
        type: "scene_break",
        pauseAfterMs: pauseForType("scene_break", HUMAN_READING_MODES.narrative),
        suggestedRate: 1,
        suggestedPitch: 1,
        tone: "informative",
      });
      continue;
    }

    const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);

    if (lines.length === 1 && isTitleLine(lines[0])) {
      const tone = detectReadingTone({ text: lines[0], type: "title" });
      const { rate, pitch } = toneRatePitch(tone, HUMAN_READING_MODES.narrative);
      segments.push({
        id: `${prefix}-${counter++}`,
        text: lines[0],
        type: "title",
        pauseAfterMs: pauseForType("title", HUMAN_READING_MODES.narrative),
        suggestedRate: rate,
        suggestedPitch: pitch,
        tone,
      });
      continue;
    }

    for (const line of lines) {
      if (isTitleLine(line)) {
        const tone = detectReadingTone({ text: line, type: "title" });
        const { rate, pitch } = toneRatePitch(tone, HUMAN_READING_MODES.narrative);
        segments.push({
          id: `${prefix}-${counter++}`,
          text: line,
          type: "title",
          pauseAfterMs: pauseForType("title", HUMAN_READING_MODES.narrative),
          suggestedRate: rate,
          suggestedPitch: pitch,
          tone,
        });
        continue;
      }

      const sentences = line
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?…])\s+/)
        .filter((s) => s.trim().length > 0);

      for (const sentence of sentences) {
        const type: ReadingSegmentType = isDialogueLine(sentence) ? "dialogue" : "paragraph";
        const tone = detectReadingTone({ text: sentence, type });
        const { rate, pitch } = toneRatePitch(tone, HUMAN_READING_MODES.narrative);

        segments.push({
          id: `${prefix}-${counter++}`,
          text: sentence,
          type,
          pauseAfterMs: pauseForType(type, HUMAN_READING_MODES.narrative),
          suggestedRate: rate,
          suggestedPitch: pitch,
          tone,
        });
      }
    }
  }

  return segments;
}

export function buildHumanReadingQueue(
  chapterText: string,
  options: BuildHumanReadingQueueOptions = {},
): HumanReadingQueueItem[] {
  const mode = HUMAN_READING_MODES[options.mode ?? "narrative"];
  const segments: ReadingSegment[] = [];

  if (options.chapterTitle?.trim()) {
    const titleTone = detectReadingTone({ text: options.chapterTitle, type: "title" });
    const { rate, pitch } = toneRatePitch(titleTone, mode);
    segments.push({
      id: "chapter-title",
      text: options.chapterTitle.trim(),
      type: "title",
      pauseAfterMs: pauseForType("title", mode),
      suggestedRate: rate,
      suggestedPitch: pitch,
      tone: titleTone,
    });
  }

  segments.push(...splitTextForHumanReading(chapterText, "ch"));

  return segments
    .filter((seg) => seg.type === "scene_break" || seg.text.trim().length > 0)
    .map((seg) => {
      const tone = seg.tone ?? detectReadingTone(seg);
      const { rate, pitch } = toneRatePitch(tone, mode);
      const pauseAfterMs = Math.round(seg.pauseAfterMs * mode.pauseMultiplier);

      return {
        ...seg,
        tone,
        pauseAfterMs,
        suggestedRate: rate,
        suggestedPitch: pitch,
        utteranceText: seg.type === "scene_break" ? " " : seg.text,
      };
    });
}

export function estimateReadingDuration(text: string, wpm = DEFAULT_AUDIOBOOK_WPM): number {
  const words = sanitizeReadableText(text).split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / wpm));
}

export function queueEstimatedMinutes(queue: HumanReadingQueueItem[], wpm = DEFAULT_AUDIOBOOK_WPM): number {
  const spokenWords = queue
    .filter((item) => item.type !== "pause" && item.type !== "scene_break")
    .reduce((sum, item) => sum + item.text.split(/\s+/).filter(Boolean).length, 0);
  const pauseMinutes = queue.reduce((sum, item) => sum + item.pauseAfterMs, 0) / 60000;
  if (spokenWords === 0) return 0;
  return Math.max(1, Math.round(spokenWords / wpm + pauseMinutes));
}
