import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ForgeInterviewConfirmation } from "./ForgeInterviewConfirmation";
import type { BookDnaLock } from "@/lib/guided-interview/dna-lock";

const readyLock: BookDnaLock = {
  confidenceScore: 0.96,
  readyForBlueprint: true,
  missingCriticalAnswers: [],
  inferredBookType: "Romanzo",
  inferredSubgenre: "Thriller psicologico",
  tone: "Teso e inquietante",
  targetReader: "Lettori di suspense",
  promiseLock: "Una rivelazione che cambia tutto.",
  whatBookIs: [],
  whatBookIsNot: ["Non deve diventare un saggio motivazionale."],
  antiDriftRules: [],
  forbiddenPatterns: [],
  dnaQuality: { pass: true, isDirty: false, isRepetitive: false, isAmbiguous: false, isIncomplete: false, issues: [] },
};

describe("ForgeInterviewConfirmation", () => {
  it("shows editorial summary without technical labels", () => {
    render(
      <ForgeInterviewConfirmation
        dnaLock={readyLock}
        extracted={{}}
        onConfirm={() => undefined}
        onCorrect={() => undefined}
      />,
    );

    expect(screen.getByText(/Ecco il DNA del libro/i)).toBeInTheDocument();
    expect(screen.getByText(/Thriller psicologico/i)).toBeInTheDocument();
    expect(screen.queryByText(/95%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/emotionalTone/i)).not.toBeInTheDocument();
  });

  it("fires confirm when ready", () => {
    const onConfirm = vi.fn();
    render(
      <ForgeInterviewConfirmation
        dnaLock={readyLock}
        extracted={{}}
        onConfirm={onConfirm}
        onCorrect={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Blocca DNA e procedi/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does not show ready title when blueprint is not ready", () => {
    const blockedLock: BookDnaLock = {
      ...readyLock,
      readyForBlueprint: false,
      confidenceScore: 0.6,
    };

    render(
      <ForgeInterviewConfirmation
        dnaLock={blockedLock}
        extracted={{}}
        onConfirm={() => undefined}
        onCorrect={() => undefined}
      />,
    );

    expect(screen.queryByText(/Ecco il DNA del libro/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Stiamo ancora costruendo/i)).toBeInTheDocument();
  });
});
