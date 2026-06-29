import { describe, expect, it } from "vitest";
import { analyzeStudyMaterial } from "@/lib/study-session";
import { buildStudyIntelligencePlan } from "@/lib/study-os/study-intelligence-kernel";
import {
  computeSm2Review,
  getDueFlashcards,
  initializeFlashcardDeck,
  recordFlashcardReview,
} from "@/lib/study-os/study-flashcards";

describe("Study Flashcards SM-2", () => {
  const result = analyzeStudyMaterial(
    "La cellula contiene DNA, mitocondrio, membrana plasmatica e metabolismo. ".repeat(12),
    "biologia.txt",
    { studySubject: "biology" },
  );
  const plan = buildStudyIntelligencePlan({ text: result.lightSummary, subject: "biology" });

  it("initializes deck with kernel flashcard types", () => {
    const deck = initializeFlashcardDeck(result, plan);
    expect(deck.length).toBeGreaterThan(0);
    expect(deck.every((c) => plan.flashcardTypes.includes(c.type))).toBe(true);
  });

  it("increases interval after successful SM-2 review", () => {
    const [card] = initializeFlashcardDeck(result, plan);
    const failed = computeSm2Review(card, 1);
    expect(failed.repetitions).toBe(0);
    expect(failed.intervalDays).toBe(1);

    const success = computeSm2Review(card, 4);
    expect(success.repetitions).toBe(1);
    expect(success.intervalDays).toBe(1);

    const second = computeSm2Review(success, 5);
    expect(second.repetitions).toBe(2);
    expect(second.intervalDays).toBeGreaterThanOrEqual(3);
    expect(second.nextReviewAt).toBeGreaterThan(Date.now());
  });

  it("recordFlashcardReview updates card state", () => {
    const [card] = initializeFlashcardDeck(result, plan);
    const { card: reviewed } = recordFlashcardReview(card, true);
    expect(reviewed.lastReviewAt).toBeDefined();
    expect(reviewed.repetitions).toBe(1);
  });

  it("getDueFlashcards returns cards due now", () => {
    const deck = initializeFlashcardDeck(result, plan);
    const due = getDueFlashcards(deck);
    expect(due.length).toBe(deck.length);
  });
});
