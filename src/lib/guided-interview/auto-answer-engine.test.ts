import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildForgeAutoAnswerPrompt,
  generateThreeForgeAnswers,
  generateForgeAutoAnswer,
  sanitizeAutoAnswer,
  compactAutoAnswer,
  countAutoAnswerWords,
  answerContainsForbiddenPhrasing,
  FORGE_AUTO_ANSWER_MAX_WORDS,
  FORGE_AUTO_ANSWER_STRATEGIES,
} from "./auto-answer-engine";
import { getInitialInterviewState } from "./question-engine";
import type { GuidedInterviewState, InterviewQuestion } from "./types";

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

function stateWithGenre(genre: string): GuidedInterviewState {
  const state = getInitialInterviewState({ chatFirst: true, selectedGenre: genre });
  return {
    ...state,
    extracted: {
      ...state.extracted,
      genre,
      genreDNA: genre,
    },
  };
}

function assertThreeValidAnswers(answers: ReturnType<typeof generateThreeForgeAnswers>) {
  expect(answers).toHaveLength(3);
  const strategies = answers.map((a) => a.strategy).sort();
  expect(strategies).toEqual([...FORGE_AUTO_ANSWER_STRATEGIES].sort());

  for (const answer of answers) {
    expect(answer.text.length).toBeGreaterThan(20);
    expect(answer).toHaveProperty("id");
    expect(answerContainsForbiddenPhrasing(answer.text)).toBe(false);
    expect(answer.text).not.toContain("?");
    expect(answer.text.toLowerCase()).not.toContain("potresti");
    expect(answer.text.toLowerCase()).not.toContain("forse");
    expect(countAutoAnswerWords(answer.text)).toBeLessThanOrEqual(FORGE_AUTO_ANSWER_MAX_WORDS);
  }

  expect(new Set(answers.map((a) => a.text)).size).toBe(3);
}

describe("auto-answer-engine three options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a prompt requiring exactly 3 JSON answers", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const prompt = buildForgeAutoAnswerPrompt({ state, question: sampleQuestion, language: "Italian" });
    expect(prompt).toContain("Quale promessa non possiamo tradire?");
    expect(prompt).toContain('"strategy":"safe"');
    expect(prompt).toContain('"strategy":"commercial"');
    expect(prompt).toContain('"strategy":"bold"');
    expect(prompt).toMatch(/ESATTAMENTE 3|EXACTLY 3/i);
    expect(prompt).toMatch(/NON fare domande|NO questions/i);
    expect(prompt).toMatch(/1–3 frasi|1–3 sentences|50 parole|50 words/i);
  });

  it("generateThreeForgeAnswers always returns safe, commercial, bold", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const answers = generateThreeForgeAnswers({
      state,
      question: sampleQuestion,
      language: "Italian",
      variantIndex: 0,
    });
    assertThreeValidAnswers(answers);
  });

  it("regenerate changes variant content but keeps 3 strategies", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const first = generateThreeForgeAnswers({
      state,
      question: sampleQuestion,
      language: "Italian",
      variantIndex: 0,
    });
    const second = generateThreeForgeAnswers({
      state,
      question: sampleQuestion,
      language: "Italian",
      variantIndex: 1,
    });
    expect(second).toHaveLength(3);
    expect(second.map((a) => a.text).join("|")).not.toBe(first.map((a) => a.text).join("|"));
  });

  it("falls back to local with 3 answers when AI is unavailable", async () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const result = await generateForgeAutoAnswer({
      state,
      question: sampleQuestion,
      language: "Italian",
    });
    expect(result.source).toBe("local");
    expect(result.answers).toHaveLength(3);
    assertThreeValidAnswers(result.answers);
  });

  it("sanitizeAutoAnswer strips prefixes and forbidden phrasing", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const cleaned = sanitizeAutoAnswer(
      "Risposta: Una promessa chiara. Potresti sentire forse qualcosa?",
      {
        state,
        question: sampleQuestion,
        language: "Italian",
      },
    );
    expect(cleaned).not.toMatch(/^Risposta:/i);
    expect(cleaned.toLowerCase()).not.toContain("potresti");
    expect(cleaned.toLowerCase()).not.toContain("forse");
    expect(cleaned).not.toContain("?");
  });

  it("compactAutoAnswer caps verbose output at max word limit", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const verbose = Array.from({ length: 30 }, (_, i) => `Frase numero ${i + 1} con dettaglio editoriale.`).join(" ");
    const compact = compactAutoAnswer(verbose, {
      state,
      question: sampleQuestion,
      language: "Italian",
    });
    expect(countAutoAnswerWords(compact)).toBeLessThanOrEqual(FORGE_AUTO_ANSWER_MAX_WORDS);
  });
});

describe.each([
  ["Romance", "romance"],
  ["Dark Romance", "dark-romance"],
  ["Thriller", "thriller"],
  ["Fantasy", "fantasy"],
  ["Self Help", "self-help"],
  ["Business", "business"],
  ["Poesia", "poetry"],
])("genre %s", (label, genre) => {
  it(`produces 3 valid answers for ${label}`, () => {
    const state = stateWithGenre(genre);
    const answers = generateThreeForgeAnswers({
      state,
      question: sampleQuestion,
      language: "Italian",
      variantIndex: 0,
    });
    assertThreeValidAnswers(answers);
  });
});
