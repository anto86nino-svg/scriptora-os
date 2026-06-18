import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildForgeAutoAnswerPrompt,
  generateLocalForgeAutoAnswer,
  generateForgeAutoAnswer,
  sanitizeAutoAnswer,
} from "./auto-answer-engine";
import { getInitialInterviewState } from "./question-engine";
import type { InterviewQuestion } from "./types";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(async () => ({ data: { error: "offline" }, error: null })),
    },
  },
}));

const sampleQuestion: InterviewQuestion = {
  id: "promise-preset",
  key: "promise",
  question: "Quale promessa non possiamo tradire?",
};

describe("auto-answer-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a prompt scoped to the current question", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const prompt = buildForgeAutoAnswerPrompt({ state, question: sampleQuestion, language: "Italian" });
    expect(prompt).toContain("Quale promessa non possiamo tradire?");
    expect(prompt).toContain("KEY: promise");
    expect(prompt).toMatch(/non andare avanti|do not jump ahead/i);
  });

  it("generates a local Italian answer for promise questions", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const answer = generateLocalForgeAutoAnswer({
      state,
      question: sampleQuestion,
      language: "Italian",
      variantIndex: 0,
    });
    expect(answer.length).toBeGreaterThan(24);
    expect(answer).not.toContain("[object Object]");
    expect(answer).toMatch(/promessa|lettore/i);
  });

  it("changes variant output on regenerate index", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const first = generateLocalForgeAutoAnswer({
      state,
      question: sampleQuestion,
      language: "Italian",
      variantIndex: 0,
    });
    const second = generateLocalForgeAutoAnswer({
      state,
      question: sampleQuestion,
      language: "Italian",
      variantIndex: 1,
    });
    expect(second).not.toBe(first);
  });

  it("falls back to local when AI is unavailable", async () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const result = await generateForgeAutoAnswer({
      state,
      question: sampleQuestion,
      language: "Italian",
    });
    expect(result.source).toBe("local");
    expect(result.answer.length).toBeGreaterThan(20);
  });

  it("sanitizeAutoAnswer strips prefixes and applies tone bias", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const cleaned = sanitizeAutoAnswer("Risposta: Una promessa chiara.", {
      state,
      question: sampleQuestion,
      language: "Italian",
      toneBias: "più oscuro",
    });
    expect(cleaned).not.toMatch(/^Risposta:/i);
    expect(cleaned).toMatch(/oscuro|inquietante/i);
  });
});
