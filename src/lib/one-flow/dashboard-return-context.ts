export type DashboardReturnContext = {
  from?: "dashboard" | "advanced-tools" | "packaging" | "mobile-more";
  openAdvancedTools?: boolean;
  scrollTo?: "advanced-tools" | "packaging" | "top";
};

export type DashboardRouteState = {
  returnToDashboard?: DashboardReturnContext;
  [key: string]: unknown;
};

export function buildDashboardReturnState(
  context: DashboardReturnContext,
): { returnToDashboard: DashboardReturnContext } {
  return { returnToDashboard: context };
}

export function readDashboardReturnState(locationState: unknown): DashboardReturnContext | null {
  if (!locationState || typeof locationState !== "object") return null;
  const state = locationState as DashboardRouteState;
  const ctx = state.returnToDashboard;
  if (!ctx || typeof ctx !== "object") return null;
  return ctx;
}

export function getDashboardReturnPath(context?: DashboardReturnContext | null): string {
  if (!context) return "/dashboard";
  if (context.openAdvancedTools || context.scrollTo === "advanced-tools") {
    return "/dashboard?panel=advanced-tools";
  }
  if (context.scrollTo === "packaging") {
    return "/dashboard?panel=packaging";
  }
  return "/dashboard";
}

export function returnStateForOrigin(
  origin?: DashboardReturnContext["from"],
): Record<string, unknown> | undefined {
  if (!origin || origin === "dashboard") return undefined;
  if (origin === "advanced-tools") {
    return buildDashboardReturnState({
      from: "advanced-tools",
      openAdvancedTools: true,
      scrollTo: "advanced-tools",
    });
  }
  if (origin === "packaging") {
    return buildDashboardReturnState({
      from: "packaging",
      scrollTo: "packaging",
    });
  }
  if (origin === "mobile-more") {
    return buildDashboardReturnState({ from: "mobile-more" });
  }
  return undefined;
}

export function mergeRouteState(
  returnContext: DashboardReturnContext | null,
  extra?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const base = returnContext ? buildDashboardReturnState(returnContext) : {};
  if (!extra || Object.keys(extra).length === 0) {
    return Object.keys(base).length > 0 ? base : undefined;
  }
  return { ...base, ...extra };
}
