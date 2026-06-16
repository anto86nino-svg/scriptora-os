import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookDnaConfirmationPanel } from "./BookDnaConfirmationPanel";
import type { BookDnaLock } from "@/lib/guided-interview/dna-lock";

const readyLock: BookDnaLock = {
  confidenceScore: 0.9,
  readyForBlueprint: true,
  missingCriticalAnswers: [],
  whatBookIs: ["Trasformazione/promessa lettore: Ritrovare disciplina e calma."],
  whatBookIsNot: ["Non deve cambiare genere senza conferma."],
  antiDriftRules: ["Preserva sempre questa trasformazione centrale."],
};

const blockedLock: BookDnaLock = {
  confidenceScore: 0.45,
  readyForBlueprint: false,
  missingCriticalAnswers: ["centralConflict"],
  whatBookIs: ["Tono emotivo dominante: caldo e pratico."],
  whatBookIsNot: ["Non deve diventare generico."],
  antiDriftRules: ["Prima di generare, chiarisci il conflitto."],
};

describe("BookDnaConfirmationPanel", () => {
  it("renders empty state when dna lock is missing", () => {
    render(<BookDnaConfirmationPanel />);

    expect(screen.getByText(/DNA del libro non ancora costruito/i)).toBeInTheDocument();
  });

  it("allows confirming when dna lock is ready", () => {
    const onConfirmDna = vi.fn();

    render(
      <BookDnaConfirmationPanel
        dnaLock={readyLock}
        onConfirmDna={onConfirmDna}
      />
    );

    const button = screen.getByRole("button", {
      name: /Conferma DNA e genera blueprint/i,
    });

    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onConfirmDna).toHaveBeenCalledTimes(1);
  });

  it("blocks confirmation when dna lock is not ready", () => {
    render(<BookDnaConfirmationPanel dnaLock={blockedLock} />);

    expect(screen.getByText("centralConflict")).toBeInTheDocument();

    const button = screen.getByRole("button", {
      name: /Conferma DNA e genera blueprint/i,
    });

    expect(button).toBeDisabled();
  });
});
