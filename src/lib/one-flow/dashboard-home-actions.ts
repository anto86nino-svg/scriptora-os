import type { FeatureKey } from "@/lib/subscription";

/** Centralized dashboard actions — only render when enabled + handler/route valid. */
export type DashboardHomeAction = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  requiresActiveBook?: boolean;
  feature?: FeatureKey;
  route?: string;
  group: "optimization" | "writer" | "system";
  onClick?: () => void;
};

export type DashboardActionContext = {
  hasActiveBook: boolean;
  onNewBook: () => void;
  onContinue?: () => void;
  onOpenProjects: () => void;
  onOpenExport: () => void;
  onOpenCover: () => void;
  onOpenTitleIntel: () => void;
  onOpenIdeaPreview: () => void;
  onOpenManuscriptLab: () => void;
  onOpenCharacterStudio: () => void;
  onOpenAuthorIdentity: () => void;
  onOpenNotepad: () => void;
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
]);

export function isValidDashboardRoute(route?: string): boolean {
  return Boolean(route && VALID_ROUTES.has(route));
}

export function isDashboardActionRenderable(
  action: DashboardHomeAction,
  ctx: DashboardActionContext,
): boolean {
  if (!action.enabled) return false;
  if (!action.onClick && !isValidDashboardRoute(action.route)) return false;
  if (action.requiresActiveBook && !ctx.hasActiveBook) return false;
  return true;
}

export function buildDashboardAdvancedActions(ctx: DashboardActionContext): DashboardHomeAction[] {
  const actions: DashboardHomeAction[] = [
    {
      id: "title-intel",
      label: "Title Intelligence",
      description: "Ottimizza titolo e sottotitolo del libro attivo",
      enabled: true,
      requiresActiveBook: false,
      feature: "title_intelligence_base",
      group: "optimization",
      onClick: ctx.onOpenTitleIntel,
    },
    {
      id: "bestseller-radar",
      label: "Bestseller Radar",
      description: "Ricerca mercato e nicchie",
      enabled: true,
      feature: "trending_niches_limited",
      route: "/bestseller-radar",
      group: "optimization",
      onClick: () => ctx.onNavigate("/bestseller-radar"),
    },
    {
      id: "keyword-gold",
      label: "Keyword Gold",
      description: "Ottimizza keyword Amazon",
      enabled: true,
      feature: "kdp_market_base",
      route: "/keyword-gold",
      group: "optimization",
      onClick: () => ctx.onNavigate("/keyword-gold"),
    },
    {
      id: "kdp-launch",
      label: "KDP Launch",
      description: "Pubblicazione e packaging KDP",
      enabled: true,
      feature: "kdp_market_base",
      route: "/kdp-launch",
      group: "optimization",
      onClick: () => ctx.onNavigate("/kdp-launch"),
    },
    {
      id: "market-intel",
      label: "Market Intelligence",
      description: "Strumento decisionale mercato",
      enabled: true,
      route: "/mobile-market",
      group: "optimization",
      onClick: () => ctx.onNavigate("/mobile-market"),
    },
    {
      id: "manuscript-lab",
      label: "Manuscript Lab",
      description: "Analisi e diagnostica del manoscritto",
      enabled: true,
      requiresActiveBook: true,
      feature: "chapter_improvement",
      group: "writer",
      onClick: ctx.hasActiveBook ? ctx.onOpenManuscriptLab : ctx.onNewBook,
    },
    {
      id: "character-studio",
      label: "Character Studio",
      description: "Personaggi e coerenza narrativa",
      enabled: true,
      feature: "book_engine_full",
      group: "writer",
      onClick: ctx.onOpenCharacterStudio,
    },
    {
      id: "author-identity",
      label: "Identità autore",
      description: "Nome, bio e voce editoriale",
      enabled: true,
      feature: "book_engine_full",
      group: "system",
      onClick: ctx.onOpenAuthorIdentity,
    },
    {
      id: "notepad",
      label: "Block Notes",
      description: "Appunti e idee rapide",
      enabled: true,
      group: "system",
      onClick: ctx.onOpenNotepad,
    },
    {
      id: "idea-preview",
      label: "Anteprima idea",
      description: "Esplora un'idea prima di Book Forge",
      enabled: true,
      group: "optimization",
      onClick: ctx.onOpenIdeaPreview,
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
      onClick: ctx.onOpenCover,
    },
    {
      id: "pack-export",
      label: "Export",
      description: "EPUB, DOCX, PDF",
      enabled: true,
      requiresActiveBook: true,
      feature: "export_epub",
      group: "optimization",
      onClick: ctx.onOpenExport,
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
      onClick: () => ctx.onNavigate("/kdp-launch"),
    },
    {
      id: "pack-title",
      label: "Titolo",
      description: "Ottimizza titolo e sottotitolo",
      enabled: true,
      requiresActiveBook: true,
      feature: "title_intelligence_base",
      group: "optimization",
      onClick: ctx.onOpenTitleIntel,
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
      onClick: () => ctx.onNavigate("/keyword-gold"),
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
      onClick: () => ctx.onNavigate("/bestseller-radar"),
    },
  ].filter((action) => isDashboardActionRenderable(action, ctx));
}
