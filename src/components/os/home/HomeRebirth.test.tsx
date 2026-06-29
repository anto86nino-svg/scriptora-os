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
  it("renders the four home blocks", () => {
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
          onCreatePreset={vi.fn()}
          onCreateFormat={vi.fn()}
          onOpenStudy={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /continua a scrivere/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /i miei libri/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /^crea$/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /stato pubblicazione/i })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: /case scriptora os/i })).toBeTruthy();
  });
});
