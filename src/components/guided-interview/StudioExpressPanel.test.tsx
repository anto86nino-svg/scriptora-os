import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { StudioExpressPanel } from "./StudioExpressPanel";
import {
  applyExpressScenarioToState,
  buildCompleteExpressBookPackage,
} from "@/lib/guided-interview/express-book-package";
import {
  buildExpressTitleGeneratorInput,
  generateTitleSubtitleOptions,
} from "@/lib/guided-interview/book-foundation-lock";
import { getInitialInterviewState } from "@/lib/guided-interview/question-engine";

const darkRomanceIdea =
  "una restauratrice torna nella villa dove sua sorella è morta in un incendio doloso";
const selfHelpIdea =
  "aiutare persone bloccate dalla paura del fallimento a ricostruire fiducia in 30 giorni";
const fantasyIdea =
  "Elena scopre che il fratello è stato scelto dalla Selva e deve fidarsi di Kael";

function clickPrimaryGenerate() {
  fireEvent.click(
    screen.getByRole("button", { name: /Genera titolo e sottotitolo — principale/i }),
  );
}

function fillIdea(idea: string) {
  const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: idea } });
}

describe("StudioExpressPanel genre-aware fields", () => {
  it("self-help does not show fiction placeholder or protagonista label", () => {
    render(<StudioExpressPanel onSubmit={() => {}} onClose={() => {}} />);

    const genreField = screen.getByText("Genere").closest("label")!;
    fireEvent.change(within(genreField).getByRole("combobox"), {
      target: { value: "self-help" },
    });

    expect(screen.getByText(/Tema \/ problema del lettore/i)).toBeTruthy();
    expect(screen.queryByText(/Idea breve \/ protagonista/i)).toBeNull();
    expect(screen.getByPlaceholderText(/paura del fallimento/i)).toBeTruthy();
    expect(screen.queryByPlaceholderText(/restauratrice/i)).toBeNull();
  });

  it("self-help default tone is not oscuro", () => {
    render(<StudioExpressPanel onSubmit={() => {}} onClose={() => {}} />);

    const genreField = screen.getByText("Genere").closest("label")!;
    fireEvent.change(within(genreField).getByRole("combobox"), {
      target: { value: "self-help" },
    });

    const toneField = screen.getByText("Tono").closest("label")!;
    const toneSelect = within(toneField).getByRole("combobox") as HTMLSelectElement;
    expect(toneSelect.value).toBe("pratico");
    expect(toneSelect.value).not.toBe("oscuro");
  });

  it("fantasy keeps narrative placeholder", () => {
    render(<StudioExpressPanel onSubmit={() => {}} onClose={() => {}} />);

    const genreField = screen.getByText("Genere").closest("label")!;
    fireEvent.change(within(genreField).getByRole("combobox"), {
      target: { value: "fantasy" },
    });

    expect(screen.getByText(/Idea breve \/ protagonista/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/restauratrice/i)).toBeTruthy();
  });
});

describe("StudioExpressPanel title click-first", () => {
  it("shows Genera titolo e sottotitolo button", () => {
    render(<StudioExpressPanel onSubmit={() => {}} onClose={() => {}} />);
    expect(
      screen.getByRole("button", { name: /Genera titolo e sottotitolo — principale/i }),
    ).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Usa il migliore$/i }).length).toBe(1);
  });

  it("click generates 3 title options with title and subtitle", () => {
    render(<StudioExpressPanel onSubmit={() => {}} onClose={() => {}} />);
    fillIdea(darkRomanceIdea);
    clickPrimaryGenerate();

    const cards = screen.getAllByText(/Usa questo/i);
    expect(cards.length).toBe(3);
    expect(screen.getAllByText(/Consigliato/i).length).toBeGreaterThanOrEqual(1);
  });

  it("Usa questo saves title and subtitle in submit payload", () => {
    const onSubmit = vi.fn();
    render(<StudioExpressPanel onSubmit={onSubmit} onClose={() => {}} />);
    fillIdea(darkRomanceIdea);
    clickPrimaryGenerate();

    const useButtons = screen.getAllByRole("button", { name: /^Usa questo$/i });
    fireEvent.click(useButtons[0]!);

    fireEvent.click(screen.getByRole("button", { name: /Prepara 3 libri possibili/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0]![0];
    expect(payload.title?.length).toBeGreaterThan(2);
    expect(payload.subtitle?.length).toBeGreaterThan(10);
  });

  it("Proponi tu auto-fills title on submit without empty fields", () => {
    const onSubmit = vi.fn();
    render(<StudioExpressPanel onSubmit={onSubmit} onClose={() => {}} />);
    fillIdea(selfHelpIdea);

    fireEvent.click(screen.getByText("Proponi tu"));
    fireEvent.click(screen.getByRole("button", { name: /Prepara 3 libri possibili/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0]![0];
    expect(payload.titleMode).toBe("suggest");
    expect(payload.title?.length).toBeGreaterThan(2);
    expect(payload.subtitle?.length).toBeGreaterThan(10);
  });

  it("does not overwrite manual title without confirm", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<StudioExpressPanel onSubmit={() => {}} onClose={() => {}} />);

    fireEvent.click(screen.getByText("Ho un titolo"));
    const titleInput = screen.getByPlaceholderText("Titolo del libro");
    fireEvent.change(titleInput, { target: { value: "Il Mio Titolo Sacro" } });

    fillIdea(darkRomanceIdea);
    clickPrimaryGenerate();

    expect(confirmSpy).toHaveBeenCalled();
    expect((titleInput as HTMLInputElement).value).toBe("Il Mio Titolo Sacro");
    confirmSpy.mockRestore();
  });

  it("Ho un titolo shows manual title and subtitle fields", () => {
    render(<StudioExpressPanel onSubmit={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByText("Ho un titolo"));
    expect(screen.getByPlaceholderText("Titolo del libro")).toBeTruthy();
    expect(screen.getByPlaceholderText("Sottotitolo commerciale")).toBeTruthy();
  });

  it("shows missing title banner with generate CTA", () => {
    render(<StudioExpressPanel onSubmit={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/Titolo o sottotitolo mancante/i)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Genera titolo e sottotitolo/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("dark romance options are genre-coherent", () => {
    const options = generateTitleSubtitleOptions(
      buildExpressTitleGeneratorInput({
        genre: "dark romance",
        language: "Italiano",
        tone: "oscuro",
        length: "medio",
        ideaSeed: darkRomanceIdea,
        titleMode: "suggest",
      }),
    );
    expect(options).toHaveLength(3);
    const joined = options.map((o) => `${o.title} ${o.subtitle}`).join(" ");
    expect(joined).toMatch(/dark romance|desiderio|colpa|romance/i);
  });

  it("self-help options are nonfiction not romance", () => {
    const options = generateTitleSubtitleOptions(
      buildExpressTitleGeneratorInput({
        genre: "self-help",
        language: "Italiano",
        tone: "pratico",
        length: "medio",
        ideaSeed: selfHelpIdea,
        titleMode: "suggest",
      }),
    );
    const joined = options.map((o) => `${o.title} ${o.subtitle} ${o.genreFit}`).join(" ");
    expect(joined).toMatch(/metodo|giorni|self-help|manuale|pratico/i);
    expect(joined).not.toMatch(/restauratrice|dark romance/i);
  });

  it("foundation lock receives express title and subtitle", () => {
    const pkg = buildCompleteExpressBookPackage(
      {
        genre: "fantasy",
        language: "Italiano",
        titleMode: "provided",
        title: "La Selva che Ricorda",
        subtitle:
          "Quando la magia chiede memoria in cambio, salvare chi ami significa perdere una parte di te",
        ideaSeed: fantasyIdea,
        tone: "epico",
        length: "medio",
        controlLevel: "scenarios",
      },
      "commercial",
    );
    expect(pkg.title).toBe("La Selva che Ricorda");
    expect(pkg.subtitle.length).toBeGreaterThan(20);

    const state = applyExpressScenarioToState(getInitialInterviewState({ chatFirst: true }), pkg);
    expect(state.bookFoundation?.title).toBe("La Selva che Ricorda");
    expect(state.bookFoundation?.subtitle).toContain("magia");
  });
});
