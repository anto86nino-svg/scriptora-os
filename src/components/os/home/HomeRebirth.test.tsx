import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomeRebirth } from "@/components/os/home/HomeRebirth";
import type { DashboardActionContext } from "@/lib/one-flow/dashboard-home-actions";

const dashboardContext: DashboardActionContext = {
  hasActiveBook: false,
  hasCompletedBook: false,
  activeProject: null,
  closeAllTools: vi.fn(),
  openTool: vi.fn(),
  onNewBook: vi.fn(),
  onOpenCover: vi.fn(),
  onNavigate: vi.fn(),
};

describe("HomeRebirth", () => {
  it("renders the professional home dashboard with core product destinations", () => {
    render(
      <MemoryRouter>
        <HomeRebirth
          lastProject={null}
          progressPercent={0}
          projects={[]}
          dashboardActionContext={dashboardContext}
          packagingAnchorRef={{ current: null }}
          onContinue={vi.fn()}
          onContinueProject={vi.fn()}
          onNewBook={vi.fn()}
          onMyBooks={vi.fn()}
          onStartOneFlow={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/continua a scrivere/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/crea nuovo libro/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /i miei libri/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /pubblicazione \/ export/i })).toBeTruthy();
    expect(screen.getByText("Scriptora Study OS")).toBeTruthy();
    expect(screen.getByText("KDP Launch")).toBeTruthy();
    expect(screen.getByText("Market OS")).toBeTruthy();
    expect(screen.getByText("Cover Studio")).toBeTruthy();
    expect(screen.getByRole("button", { name: /crea il libro/i })).toBeTruthy();
  });

  it("keeps the product grid usable on mobile with a single-column base layout", () => {
    render(
      <MemoryRouter>
        <HomeRebirth
          lastProject={null}
          progressPercent={0}
          projects={[]}
          dashboardActionContext={dashboardContext}
          packagingAnchorRef={{ current: null }}
          onContinue={vi.fn()}
          onContinueProject={vi.fn()}
          onNewBook={vi.fn()}
          onMyBooks={vi.fn()}
          onStartOneFlow={vi.fn()}
        />
      </MemoryRouter>,
    );

    const productSection = screen.getByRole("heading", { name: /scegli cosa fare/i }).closest("section");
    expect(productSection?.innerHTML).toContain("Scriptora Study OS");
    expect(productSection?.innerHTML).toContain("grid-cols-1");
  });
});
