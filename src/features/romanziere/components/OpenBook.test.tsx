import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OpenBook } from "./OpenBook";

const baseProps = {
  bookTitle: "Il giardino delle ombre",
  author: "Livia Emerson",
  chapterTitle: "Capitolo 2 · La stanza chiusa",
  chapterNumber: 2,
  content: "La porta cedette con un respiro lungo.\n\nDentro, la polvere custodiva ancora ogni nome.",
  outline: "La protagonista torna nella stanza proibita.",
  isOpen: true,
  isGenerating: false,
  progressPercent: 100,
};

describe("OpenBook", () => {
  it("mostra copertina, doppia pagina e contenuto reale", () => {
    const { container } = render(<OpenBook {...baseProps} />);

    expect(screen.getAllByText("Il giardino delle ombre").length).toBeGreaterThan(0);
    expect(screen.getByText(/La porta cedette/)).toBeInTheDocument();
    expect(container.querySelector(".romanziere-page-left")).toBeInTheDocument();
    expect(container.querySelector(".romanziere-page-right")).toBeInTheDocument();
    expect(container.querySelector(".romanziere-book-stage")).toHaveAttribute("data-open", "true");
  });

  it("aggancia piuma e stato busy alla fine del testo live", () => {
    const { container } = render(
      <OpenBook
        {...baseProps}
        isGenerating
        progressPercent={42}
        statusMessage="Sviluppo la tensione narrativa…"
      />,
    );

    expect(container.querySelector(".romanziere-page-right")).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector(".romanziere-writing-quill")).toBeInTheDocument();
    expect(screen.getByText("Sviluppo la tensione narrativa…")).toBeInTheDocument();
    expect(container.querySelector(".romanziere-live-progress span")).toHaveStyle({ width: "42%" });
  });
});
