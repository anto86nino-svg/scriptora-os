import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StudyQuizPanel } from "./StudyQuizPanel";
import type { QuizQuestion } from "@/lib/study-session";

const quiz: QuizQuestion[] = [
  {
    question: "Quale risposta spiega meglio la causa?",
    options: ["Un dettaglio isolato", "L'origine di un fenomeno"],
    answer: 1,
    explanation: "La causa indica l'origine del fenomeno.",
  },
];

describe("StudyQuizPanel exam completion", () => {
  it("does not register the same completed exam twice after rerender", async () => {
    const firstHandler = vi.fn();
    const { rerender } = render(
      <StudyQuizPanel
        quiz={quiz}
        keyConcepts={["causa"]}
        initialMode="exam"
        onExamComplete={firstHandler}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Senza timer/i }));
    fireEvent.click(screen.getByRole("button", { name: /L'origine di un fenomeno/i }));

    await waitFor(() => expect(firstHandler).toHaveBeenCalledTimes(1));

    const secondHandler = vi.fn();
    rerender(
      <StudyQuizPanel
        quiz={quiz}
        keyConcepts={["causa"]}
        initialMode="exam"
        onExamComplete={secondHandler}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(secondHandler).not.toHaveBeenCalled();
  });
});
