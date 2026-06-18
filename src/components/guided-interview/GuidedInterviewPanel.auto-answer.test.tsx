import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GuidedInterviewPanel } from "./GuidedInterviewPanel";
import { safeDisplayText } from "@/lib/safe-display-text";
import { ForgeInterviewConfirmation } from "./ForgeInterviewConfirmation";
import type { BookDnaLock } from "@/lib/guided-interview/dna-lock";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
  getNextInterviewQuestion,
} from "@/lib/guided-interview/question-engine";
import { generateLocalForgeAutoAnswer } from "@/lib/guided-interview/auto-answer-engine";

vi.mock("@/hooks/useSpeechDictation", () => ({
  useSpeechDictation: () => ({
    supported: false,
    isListening: false,
    error: null,
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));

vi.mock("@/lib/guided-interview/auto-answer-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/guided-interview/auto-answer-engine")>();
  return {
    ...actual,
    generateForgeAutoAnswer: vi.fn(async (input) => ({
      answer: actual.generateLocalForgeAutoAnswer(input),
      source: "local" as const,
    })),
  };
});

describe("safeDisplayText regression", () => {
  it("coerces {label,value} objects to text", () => {
    expect(safeDisplayText({ label: "Italiano", value: "Italian" })).toBe("Italiano");
    expect(safeDisplayText({ label: "X", value: "Y" })).toBe("X");
    expect(safeDisplayText(null)).toBe("");
  });

  it("ForgeInterviewConfirmation renders object field values without crashing", () => {
    const lock: BookDnaLock = {
      confidenceScore: 0.96,
      readyForBlueprint: true,
      missingCriticalAnswers: [],
      inferredBookType: "Romanzo",
      inferredSubgenre: "Thriller",
      tone: "Teso",
      targetReader: "Lettori",
      promiseLock: "Promessa",
      whatBookIs: [],
      whatBookIsNot: [],
      antiDriftRules: [],
      forbiddenPatterns: [],
      dnaQuality: { pass: true, isDirty: false, isRepetitive: false, isAmbiguous: false, isIncomplete: false, issues: [] },
    };

    render(
      <ForgeInterviewConfirmation
        dnaLock={lock}
        extracted={{ genre: { label: "Thriller", value: "thriller" } as unknown as string }}
        onConfirm={() => undefined}
        onCorrect={() => undefined}
      />,
    );

    expect(screen.getByText("Thriller")).toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/i)).not.toBeInTheDocument();
  });
});

describe("GuidedInterviewPanel auto-answer", () => {
  it("renders quick suggestion chips with {label,value} without crashing", () => {
    render(
      <GuidedInterviewPanel
        variant="mobile"
        chatFirst
        unifiedScroll
        language="Italian"
      />,
    );

    expect(screen.getByText(/Scrivi per me/i)).toBeInTheDocument();
  });

  it("inserts generated draft into textarea without auto-submit", async () => {
    render(
      <GuidedInterviewPanel
        variant="mobile"
        chatFirst
        unifiedScroll
        language="Italian"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Scrivi per me/i }));

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(/Scrivi la tua risposta/i) as HTMLTextAreaElement;
      expect(textarea.value.length).toBeGreaterThan(20);
    });
  });
});

describe("auto-answer confirm advances interview", () => {
  it("confirming generated answer updates interview state", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    const next = getNextInterviewQuestion(state);
    const question = next.question ?? {
      id: "opening",
      key: "openingSpark",
      question: "Da dove iniziamo?",
    };

    const draft = generateLocalForgeAutoAnswer({
      state,
      question,
      language: "Italian",
    });

    const beforeCount = state.messages.filter((m) => m.role === "user").length;
    state = applyInterviewAnswer(state, draft, question);
    const afterCount = state.messages.filter((m) => m.role === "user").length;

    expect(afterCount).toBe(beforeCount + 1);
    expect(state.messages.some((m) => m.role === "user" && m.content === draft)).toBe(true);
  });
});
