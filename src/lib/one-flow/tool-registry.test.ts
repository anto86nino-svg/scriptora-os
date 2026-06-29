import { describe, expect, it } from "vitest";
import {
  DASHBOARD_TOOL_ROUTES,
  buildDashboardPackagingActions,
  isValidDashboardRoute,
  type DashboardActionContext,
} from "./dashboard-home-actions";
import { getCanonicalToolRoutes, getPublishingFlowNext, getToolRoute, PUBLISHING_FLOW_ORDER, resolvePublishingFlowToolId } from "./tool-registry";

const baseContext: DashboardActionContext = {
  hasActiveBook: true,
  hasCompletedBook: true,
  activeProject: {
    id: "project-1",
    config: {
      title: "Libro test",
      genre: "thriller",
      language: "Italian",
      numberOfChapters: 3,
    },
    chapters: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as any,
  closeAllTools: () => {},
  openTool: () => {},
  onNewBook: () => {},
  onOpenCover: () => {},
  onNavigate: () => {},
};

describe("tool registry convergence", () => {
  it("keeps dashboard destinations on canonical tool routes", () => {
    expect(getCanonicalToolRoutes()).toContain(getToolRoute("publishing"));
    expect(isValidDashboardRoute(getToolRoute("publishing"))).toBe(true);
    expect(isValidDashboardRoute("/author-identity")).toBe(false);
  });

  it("uses the unified identity route for dashboard tool aliases", () => {
    expect(DASHBOARD_TOOL_ROUTES["author-identity"]).toBe(getToolRoute("identity"));
  });

  it("keeps publishing steps mapped to their canonical operational tools", () => {
    const routes = buildDashboardPackagingActions(baseContext).map((action) => action.route);
    expect(routes).toEqual([
      getToolRoute("cover"),
      getToolRoute("export"),
      getToolRoute("kdp"),
      getToolRoute("title"),
      getToolRoute("keyword"),
      getToolRoute("radar"),
    ]);
  });

  it("routes export actions to export studio, not publishing center", () => {
    const exportAction = buildDashboardPackagingActions(baseContext).find((action) => action.id === "pack-export");
    expect(exportAction?.route).toBe("/export-studio");
    expect(exportAction?.route).not.toBe(getToolRoute("publishing"));
  });

  it("returns no packaging actions without an active book", () => {
    const emptyContext = { ...baseContext, hasActiveBook: false, activeProject: null };
    expect(buildDashboardPackagingActions(emptyContext)).toEqual([]);
  });
});

describe("publishing flow nextRoute", () => {
  it("walks title → keyword → radar → cover → kdp → export", () => {
    expect(getPublishingFlowNext("title")).toBe(getToolRoute("keyword"));
    expect(getPublishingFlowNext("keyword")).toBe(getToolRoute("radar"));
    expect(getPublishingFlowNext("radar")).toBe(getToolRoute("publishing"));
    expect(getPublishingFlowNext("cover")).toBe(getToolRoute("export"));
    expect(getPublishingFlowNext("export")).toBe(getToolRoute("kdp"));
  });

  it("resolves publishing flow tool ids from canonical routes", () => {
    expect(resolvePublishingFlowToolId(getToolRoute("title"))).toBe("title");
    expect(PUBLISHING_FLOW_ORDER).toEqual(["title", "keyword", "radar", "cover", "kdp", "export"]);
  });
});

