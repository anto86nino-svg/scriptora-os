import { beforeEach, describe, expect, it, vi } from "vitest";
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
import { generateThreeForgeAnswers } from "@/lib/guided-interview/auto-answer-engine";

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
      answers: actual.generateThreeForgeAnswers(input),
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
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("starts from the current book idea without opening synthetic foundations immediately", () => {
    const initialIdea = "Una restauratrice trova messaggi della madre sotto la vernice dei quadri.";
    render(
      <GuidedInterviewPanel
        variant="desktop"
        selectedGenre="thriller"
        initialIdea={initialIdea}
        language="Italian"
      />,
    );

    expect(screen.getByText(initialIdea)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Fondamenta del libro/i })).not.toBeInTheDocument();
  });

  it("renders Genera 3 risposte without crashing", () => {
    render(
      <GuidedInterviewPanel
        variant="mobile"
        chatFirst
        unifiedScroll
        language="Italian"
      />,
    );

    expect(screen.getByText(/Genera 3 risposte/i)).toBeInTheDocument();
  });

  it("shows 3 selectable cards after generation", async () => {
    render(
      <GuidedInterviewPanel
        variant="mobile"
        chatFirst
        unifiedScroll
        language="Italian"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Genera 3 risposte/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Usa questa risposta/i)).toHaveLength(3);
      expect(screen.getByText("Safe")).toBeInTheDocument();
      expect(screen.getByText("Commercial")).toBeInTheDocument();
      expect(screen.getByText("Bold")).toBeInTheDocument();
    });
  });

  it("selecting a card advances interview without filling textarea", async () => {
    render(
      <GuidedInterviewPanel
        variant="mobile"
        chatFirst
        unifiedScroll
        language="Italian"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Genera 3 risposte/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Usa questa risposta/i)).toHaveLength(3);
    });

    const textarea = screen.getByPlaceholderText(/Scrivi la tua risposta/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe("");

    fireEvent.click(screen.getAllByRole("button", { name: /Usa questa risposta/i })[0]);

    await waitFor(() => {
      expect(screen.queryAllByText(/Usa questa risposta/i)).toHaveLength(0);
    });
  });
});

describe("auto-answer confirm advances interview", () => {
  it("confirming a suggested answer updates interview state", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    const next = getNextInterviewQuestion(state);
    const question = next.question ?? {
      id: "opening",
      key: "openingSpark",
      question: "Da dove iniziamo?",
    };

    const options = generateThreeForgeAnswers({
      state,
      question,
      language: "Italian",
    });
    const selected = options[0].text;

    const beforeCount = state.messages.filter((m) => m.role === "user").length;
    state = applyInterviewAnswer(state, selected, question);
    const afterCount = state.messages.filter((m) => m.role === "user").length;

    expect(afterCount).toBe(beforeCount + 1);
    expect(state.messages.some((m) => m.role === "user" && m.content === selected)).toBe(true);
  });
});
