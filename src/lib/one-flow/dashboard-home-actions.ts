import { toast } from "sonner";
import type { FeatureKey } from "@/lib/subscription";
import type { ActiveDashboardTool } from "@/lib/one-flow/dashboard-active-tool";

export type DashboardActionMode = "route" | "dialog" | "overlay" | "external";

/** Centralized dashboard actions — only render when enabled + valid destination. */
export type DashboardHomeAction = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  requiresActiveBook?: boolean;
  feature?: FeatureKey;
  route?: string;
  toolId?: ActiveDashboardTool;
  group: "optimization" | "writer" | "system";
  mode: DashboardActionMode;
  onClick?: () => void;
};

export type DashboardActionContext = {
  hasActiveBook: boolean;
  closeAllTools: () => void;
  openTool: (tool: ActiveDashboardTool) => void;
  onNewBook: () => void;
  onContinue?: () => void;
  onOpenCover: () => void;
  onNavigate: (path: string) => void;
};

const VALID_ROUTES = new Set([
  "/study",
  "/kdp-launch",
  "/bestseller-radar",
  "/keyword-gold",
  "/mobile-market",
  "/cover",
  "/usage",
  "/pricing",
  "/app",
  "/dashboard",
]);

export function isValidDashboardRoute(route?: string): boolean {
  return Boolean(route && VALID_ROUTES.has(route));
}

function hasValidDestination(action: DashboardHomeAction): boolean {
  if (action.mode === "route") return isValidDashboardRoute(action.route);
  if (action.mode === "dialog" || action.mode === "overlay") return Boolean(action.toolId);
  return typeof action.onClick === "function";
}

export function isDashboardActionRenderable(
  action: DashboardHomeAction,
  ctx: DashboardActionContext,
): boolean {
  if (!action.enabled) return false;
  if (!hasValidDestination(action)) return false;
  if (action.requiresActiveBook && !ctx.hasActiveBook) return false;
  return true;
}

export function executeDashboardAction(action: DashboardHomeAction, ctx: DashboardActionContext): void {
  try {
    ctx.closeAllTools();

    if (!action?.enabled) return;

    if (action.requiresActiveBook && !ctx.hasActiveBook) {
      toast.message("Crea o apri un libro prima", {
        description: "Questo strumento lavora sul libro attivo.",
        action: { label: "I miei libri", onClick: () => ctx.openTool("projects") },
      });
      return;
    }

    switch (action.mode) {
      case "route":
        if (action.route && isValidDashboardRoute(action.route)) {
          ctx.onNavigate(action.route);
        }
        break;
      case "dialog":
      case "overlay":
        if (action.toolId) {
          ctx.openTool(action.toolId);
        }
        break;
      case "external":
      default:
        action.onClick?.();
        break;
    }
  } catch (err) {
    console.error("[DASHBOARD_ACTION_ERROR]", action?.id, err);
    ctx.closeAllTools();
    toast.error("Impossibile aprire lo strumento. Riprova.");
  }
}

export function buildDashboardAdvancedActions(ctx: DashboardActionContext): DashboardHomeAction[] {
  const actions: DashboardHomeAction[] = [
    {
      id: "title-intel",
      label: "Title Intelligence",
      description: "Ottimizza titolo e sottotitolo del libro attivo",
      enabled: true,
      feature: "title_intelligence_base",
      group: "optimization",
      mode: "dialog",
      toolId: "title-intelligence",
    },
    {
      id: "bestseller-radar",
      label: "Bestseller Radar",
      description: "Ricerca mercato e nicchie",
      enabled: true,
      feature: "trending_niches_limited",
      route: "/bestseller-radar",
      group: "optimization",
      mode: "route",
    },
    {
      id: "keyword-gold",
      label: "Keyword Gold",
      description: "Ottimizza keyword Amazon",
      enabled: true,
      feature: "kdp_market_base",
      route: "/keyword-gold",
      group: "optimization",
      mode: "route",
    },
    {
      id: "kdp-launch",
      label: "KDP Launch",
      description: "Pubblicazione e packaging KDP",
      enabled: true,
      feature: "kdp_market_base",
      route: "/kdp-launch",
      group: "optimization",
      mode: "route",
    },
    {
      id: "market-intel",
      label: "Market Intelligence",
      description: "Strumento decisionale mercato",
      enabled: true,
      route: "/mobile-market",
      group: "optimization",
      mode: "route",
    },
    {
      id: "manuscript-lab",
      label: "Manuscript Lab",
      description: "Analisi e diagnostica del manoscritto",
      enabled: true,
      requiresActiveBook: true,
      feature: "chapter_improvement",
      group: "writer",
      mode: "dialog",
      toolId: "manuscript-lab",
    },
    {
      id: "character-studio",
      label: "Character Studio",
      description: "Personaggi e coerenza narrativa",
      enabled: true,
      feature: "book_engine_full",
      group: "writer",
      mode: "dialog",
      toolId: "character-studio",
    },
    {
      id: "author-identity",
      label: "Identità autore",
      description: "Nome, bio e voce editoriale",
      enabled: true,
      feature: "book_engine_full",
      group: "system",
      mode: "dialog",
      toolId: "author-identity",
    },
    {
      id: "notepad",
      label: "Block Notes",
      description: "Appunti e idee rapide",
      enabled: true,
      group: "system",
      mode: "dialog",
      toolId: "notepad",
    },
    {
      id: "idea-preview",
      label: "Anteprima idea",
      description: "Esplora un'idea prima di Book Forge",
      enabled: true,
      group: "optimization",
      mode: "dialog",
      toolId: "idea-preview",
    },
  ];

  return actions.filter((action) => isDashboardActionRenderable(action, ctx));
}

export function buildDashboardPackagingActions(ctx: DashboardActionContext): DashboardHomeAction[] {
  if (!ctx.hasActiveBook) return [];

  return [
    {
      id: "pack-cover",
      label: "Cover Studio",
      description: "Studio copertina del libro attivo",
      enabled: true,
      requiresActiveBook: true,
      feature: "cover_studio_template",
      group: "optimization",
      mode: "route",
      route: "/cover",
    },
    {
      id: "pack-export",
      label: "Export",
      description: "EPUB, DOCX, PDF",
      enabled: true,
      requiresActiveBook: true,
      feature: "export_epub",
      group: "optimization",
      mode: "dialog",
      toolId: "export",
    },
    {
      id: "pack-kdp",
      label: "KDP / Pubblicazione",
      description: "Pubblicazione e packaging KDP",
      enabled: true,
      requiresActiveBook: true,
      feature: "kdp_market_base",
      route: "/kdp-launch",
      group: "optimization",
      mode: "route",
    },
    {
      id: "pack-title",
      label: "Titolo",
      description: "Ottimizza titolo e sottotitolo",
      enabled: true,
      requiresActiveBook: true,
      feature: "title_intelligence_base",
      group: "optimization",
      mode: "dialog",
      toolId: "title-intelligence",
    },
    {
      id: "pack-keyword",
      label: "Keyword Gold",
      description: "Keyword Amazon",
      enabled: true,
      requiresActiveBook: true,
      feature: "kdp_market_base",
      route: "/keyword-gold",
      group: "optimization",
      mode: "route",
    },
    {
      id: "pack-radar",
      label: "Bestseller Radar",
      description: "Ricerca mercato",
      enabled: true,
      requiresActiveBook: true,
      feature: "trending_niches_limited",
      route: "/bestseller-radar",
      group: "optimization",
      mode: "route",
    },
  ].filter((action) => isDashboardActionRenderable(action, ctx));
}
