import type { Flashcard, StudySessionResult } from "@/lib/study-session";
import type { KernelFlashcardType, StudyKernelPlan } from "@/lib/study-os/study-intelligence-kernel";

export interface SpacedFlashcard {
  id: string;
  front: string;
  back: string;
  type: KernelFlashcardType;
  /** SM-2 ease factor (default 2.5) */
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: number;
  lastReviewAt?: number;
  category?: string;
}

export interface FlashcardReviewResult {
  card: SpacedFlashcard;
  quality: number;
}

const TYPE_MAP: Record<NonNullable<Flashcard["type"]>, KernelFlashcardType> = {
  definition: "definition",
  "cause-effect": "qa",
  comparison: "qa",
  "true-false": "true_false",
  application: "qa",
  oral: "qa",
};

function inferType(card: Flashcard, index: number, allowed: KernelFlashcardType[]): KernelFlashcardType {
  if (card.type && TYPE_MAP[card.type] && allowed.includes(TYPE_MAP[card.type])) {
    return TYPE_MAP[card.type];
  }
  const text = `${card.front} ${card.back}`.toLowerCase();
  if (allowed.includes("formula") && /[=±√∑∫π]|\bformula\b/.test(text)) return "formula";
  if (allowed.includes("historical_date") && /\b(1[0-9]{3}|20[0-9]{2})\b/.test(text)) return "historical_date";
  if (allowed.includes("true_false") && /vero|falso|true|false/i.test(text)) return "true_false";
  if (allowed.includes("definition")) return "definition";
  return allowed[index % allowed.length] ?? "qa";
}

/** Initialize spaced-repetition deck from session flashcards. */
export function initializeFlashcardDeck(
  result: StudySessionResult,
  plan: StudyKernelPlan,
): SpacedFlashcard[] {
  const now = Date.now();
  const allowed = plan.flashcardTypes;

  return result.flashcards.slice(0, 20).map((card, index) => ({
    id: `fc-${index}-${card.front.slice(0, 24).replace(/\s+/g, "-")}`,
    front: card.front,
    back: card.back,
    type: inferType(card, index, allowed),
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    nextReviewAt: now,
    category: card.category || result.classification?.label,
  }));
}

/**
 * SM-2 spaced repetition update.
 * @param quality 0-5 (0=complete blackout, 5=perfect)
 */
export function computeSm2Review(card: SpacedFlashcard, quality: number): SpacedFlashcard {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { easeFactor, intervalDays, repetitions } = card;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 3;
    else intervalDays = Math.round(intervalDays * easeFactor);

    repetitions += 1;
    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
    );
  }

  const nextReviewAt = Date.now() + intervalDays * 24 * 60 * 60 * 1000;

  return {
    ...card,
    easeFactor,
    intervalDays,
    repetitions,
    nextReviewAt,
    lastReviewAt: Date.now(),
  };
}

export function recordFlashcardReview(
  card: SpacedFlashcard,
  knewIt: boolean,
): FlashcardReviewResult {
  const quality = knewIt ? 4 : 1;
  return { card: computeSm2Review(card, quality), quality };
}

export function getDueFlashcards(deck: SpacedFlashcard[], now = Date.now()): SpacedFlashcard[] {
  return deck
    .filter((card) => card.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt);
}

export function confidenceToSm2Quality(confidence: "unknown" | "almost" | "known"): number {
  if (confidence === "known") return 5;
  if (confidence === "almost") return 3;
  return 1;
}
