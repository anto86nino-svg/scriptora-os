import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardPackagingRow } from "@/components/one-flow/DashboardPackagingRow";
import type { DashboardActionContext } from "@/lib/one-flow/dashboard-home-actions";

const emptyContext: DashboardActionContext = {
  hasActiveBook: false,
  hasCompletedBook: false,
  activeProject: null,
  closeAllTools: vi.fn(),
  openTool: vi.fn(),
  onNewBook: vi.fn(),
  onOpenCover: vi.fn(),
  onNavigate: vi.fn(),
};

describe("DashboardPackagingRow", () => {
  it("renders choose-book CTA instead of returning null without a project", () => {
    render(<DashboardPackagingRow context={emptyContext} />);
    expect(screen.getByRole("heading", { name: /packaging center/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /scegli un libro/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /publishing center/i })).toBeTruthy();
  });
});
