import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { StudioExpressPanel } from "./StudioExpressPanel";

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
