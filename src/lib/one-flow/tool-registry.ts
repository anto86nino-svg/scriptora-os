import type { FeatureKey } from "@/lib/subscription";

export type ScriptoraToolId =
  | "book-forge"
  | "writer"
  | "publishing"
  | "cover"
  | "export"
  | "kdp"
  | "title"
  | "keyword"
  | "radar"
  | "identity"
  | "character"
  | "manuscript"
  | "notepad"
  | "study"
  | "market-mobile"
  | "usage"
  | "pricing"
  | "downloads";

export type ScriptoraToolStatus = "production" | "desktop-only" | "mobile-supported" | "legacy";

export type ScriptoraToolDefinition = {
  id: ScriptoraToolId;
  label: string;
  canonicalRoute: string;
  mobileSupport: "full" | "desktop-only" | "mobile-hub";
  requiresProject: boolean;
  nextRoute?: string;
  feature?: FeatureKey;
  status: ScriptoraToolStatus;
};

export const SCRIPTORA_TOOL_REGISTRY: Record<ScriptoraToolId, ScriptoraToolDefinition> = {
  "book-forge": {
    id: "book-forge",
    label: "One Book Flow",
    canonicalRoute: "/dashboard",
    mobileSupport: "full",
    requiresProject: false,
    nextRoute: "/app",
    feature: "create_book_basic",
    status: "production",
  },
  writer: {
    id: "writer",
    label: "Writer",
    canonicalRoute: "/app",
    mobileSupport: "full",
    requiresProject: false,
    nextRoute: "/publishing",
    status: "production",
  },
  publishing: {
    id: "publishing",
    label: "Publishing Center",
    canonicalRoute: "/publishing",
    mobileSupport: "desktop-only",
    requiresProject: true,
    nextRoute: "/kdp-launch",
    status: "production",
  },
  cover: {
    id: "cover",
    label: "Cover Studio",
    canonicalRoute: "/cover",
    mobileSupport: "desktop-only",
    requiresProject: true,
    nextRoute: "/export-studio",
    feature: "cover_studio_template",
    status: "production",
  },
  export: {
    id: "export",
    label: "Export Studio",
    canonicalRoute: "/export-studio",
    mobileSupport: "desktop-only",
    requiresProject: true,
    nextRoute: "/kdp-launch",
    feature: "export_epub",
    status: "production",
  },
  kdp: {
    id: "kdp",
    label: "KDP Launch",
    canonicalRoute: "/kdp-launch",
    mobileSupport: "desktop-only",
    requiresProject: true,
    feature: "kdp_market_base",
    status: "production",
  },
  title: {
    id: "title",
    label: "Title Intelligence",
    canonicalRoute: "/title-intelligence",
    mobileSupport: "desktop-only",
    requiresProject: true,
    nextRoute: "/keyword-gold",
    feature: "title_intelligence_base",
    status: "production",
  },
  keyword: {
    id: "keyword",
    label: "Keyword Gold",
    canonicalRoute: "/keyword-gold",
    mobileSupport: "desktop-only",
    requiresProject: true,
    nextRoute: "/bestseller-radar",
    feature: "kdp_market_base",
    status: "production",
  },
  radar: {
    id: "radar",
    label: "Bestseller Radar",
    canonicalRoute: "/bestseller-radar",
    mobileSupport: "mobile-hub",
    requiresProject: true,
    nextRoute: "/publishing",
    feature: "trending_niches_limited",
    status: "production",
  },
  identity: {
    id: "identity",
    label: "Author Identity",
    canonicalRoute: "/identity",
    mobileSupport: "full",
    requiresProject: false,
    nextRoute: "/publishing",
    feature: "book_engine_full",
    status: "production",
  },
  character: {
    id: "character",
    label: "One Book Flow",
    canonicalRoute: "/dashboard",
    mobileSupport: "full",
    requiresProject: false,
    nextRoute: "/app",
    feature: "book_engine_full",
    status: "legacy",
  },
  manuscript: {
    id: "manuscript",
    label: "Manuscript Lab",
    canonicalRoute: "/manuscript-lab",
    mobileSupport: "desktop-only",
    requiresProject: true,
    nextRoute: "/app",
    feature: "chapter_improvement",
    status: "production",
  },
  notepad: {
    id: "notepad",
    label: "Block Notes",
    canonicalRoute: "/notepad",
    mobileSupport: "full",
    requiresProject: false,
    status: "production",
  },
  study: {
    id: "study",
    label: "Study OS",
    canonicalRoute: "/study",
    mobileSupport: "full",
    requiresProject: false,
    status: "production",
  },
  "market-mobile": {
    id: "market-mobile",
    label: "Market OS Mobile",
    canonicalRoute: "/mobile-market",
    mobileSupport: "full",
    requiresProject: true,
    nextRoute: "/publishing",
    status: "production",
  },
  usage: {
    id: "usage",
    label: "Usage",
    canonicalRoute: "/usage",
    mobileSupport: "full",
    requiresProject: false,
    status: "production",
  },
  pricing: {
    id: "pricing",
    label: "Pricing",
    canonicalRoute: "/pricing",
    mobileSupport: "full",
    requiresProject: false,
    status: "production",
  },
  downloads: {
    id: "downloads",
    label: "Downloads",
    canonicalRoute: "/downloads",
    mobileSupport: "full",
    requiresProject: false,
    status: "production",
  },
};

export function getToolDefinition(id: ScriptoraToolId): ScriptoraToolDefinition {
  return SCRIPTORA_TOOL_REGISTRY[id];
}

export function getToolRoute(id: ScriptoraToolId): string {
  return SCRIPTORA_TOOL_REGISTRY[id].canonicalRoute;
}

export function getCanonicalToolRoutes(): string[] {
  return Array.from(new Set(Object.values(SCRIPTORA_TOOL_REGISTRY).map((tool) => tool.canonicalRoute)));
}

/** Canonical publishing wizard chain: title → keyword → radar → cover → kdp → export */
export const PUBLISHING_FLOW_ORDER: ScriptoraToolId[] = [
  "title",
  "keyword",
  "radar",
  "cover",
  "kdp",
  "export",
];

export function getPublishingFlowNext(currentToolId: ScriptoraToolId): string | undefined {
  return SCRIPTORA_TOOL_REGISTRY[currentToolId]?.nextRoute;
}

export function resolvePublishingFlowToolId(routeOrPath: string): ScriptoraToolId | undefined {
  const normalized = routeOrPath.split("?")[0];
  const match = Object.values(SCRIPTORA_TOOL_REGISTRY).find((tool) => tool.canonicalRoute === normalized);
  return match?.id;
}

export function getPublishingFlowNextToolId(currentToolId: ScriptoraToolId): ScriptoraToolId | undefined {
  const nextRoute = getPublishingFlowNext(currentToolId);
  if (!nextRoute) return undefined;
  return resolvePublishingFlowToolId(nextRoute);
}
