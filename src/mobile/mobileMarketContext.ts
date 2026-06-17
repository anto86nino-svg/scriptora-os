export type MobileMarketContext = {
  projectId: string;
  returnTo: "writer" | "dashboard";
  scrollY?: number;
  section?: string | null;
  openedAt: number;
};

const MARKET_CTX_KEY = "scriptora-market-context";

export function setMobileMarketContext(ctx: Omit<MobileMarketContext, "openedAt">): void {
  try {
    sessionStorage.setItem(
      MARKET_CTX_KEY,
      JSON.stringify({ ...ctx, openedAt: Date.now() } satisfies MobileMarketContext),
    );
  } catch {
    /* ignore */
  }
}

export function readMobileMarketContext(): MobileMarketContext | null {
  try {
    const raw = sessionStorage.getItem(MARKET_CTX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MobileMarketContext;
    if (!parsed?.projectId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearMobileMarketContext(): void {
  try {
    sessionStorage.removeItem(MARKET_CTX_KEY);
  } catch {
    /* ignore */
  }
}

export function openMobileMarketFromWriter(projectId: string, scrollY = 0, section?: string | null): void {
  setMobileMarketContext({
    projectId,
    returnTo: "writer",
    scrollY: Math.round(scrollY),
    section: section ?? null,
  });
}

export function openMobileMarketFromDashboard(projectId: string): void {
  setMobileMarketContext({
    projectId,
    returnTo: "dashboard",
  });
}

export function resolveMarketCloseNavigation(ctx: MobileMarketContext | null): {
  path: string;
  restoreScroll?: number;
  restoreSection?: string | null;
} {
  if (!ctx) return { path: "/dashboard" };
  if (ctx.returnTo === "writer") {
    return {
      path: "/app",
      restoreScroll: ctx.scrollY,
      restoreSection: ctx.section,
    };
  }
  return { path: "/dashboard" };
}
