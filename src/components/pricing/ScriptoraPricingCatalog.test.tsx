import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ScriptoraPricingCatalog } from "./ScriptoraPricingCatalog";

describe("ScriptoraPricingCatalog author-only surface", () => {
  it("renders author plans without Study OS products or student navigation", () => {
    render(
      <MemoryRouter>
        <ScriptoraPricingCatalog />
      </MemoryRouter>,
    );

    expect(screen.getByText("Piani per scrivere e pubblicare libri")).toBeTruthy();
    expect(screen.getByText("Author Pro")).toBeTruthy();
    expect(screen.queryByText(/Study OS/i)).toBeNull();
    expect(screen.queryByText(/Studiare meglio/i)).toBeNull();
    expect(screen.queryByText(/quiz|flashcard/i)).toBeNull();
  });
});
