/** Single source of truth for which dashboard tool overlay/dialog is open. */
export type ActiveDashboardTool =
  | null
  | "projects"
  | "library"
  | "export"
  | "author-identity"
  | "character-studio"
  | "notepad"
  | "title-intelligence"
  | "idea-preview"
  | "manuscript-lab"
  | "book-forge"
  | "advanced-tools";

export function activeToolGuideRoute(tool: ActiveDashboardTool): string | null {
  if (!tool) return null;
  const map: Record<Exclude<ActiveDashboardTool, null>, string> = {
    "book-forge": "newbook",
    projects: "library",
    library: "library",
    export: "export",
    "author-identity": "author",
    "character-studio": "character",
    "manuscript-lab": "manuscript",
    notepad: "notepad",
    "title-intelligence": "title",
    "idea-preview": "idea",
  };
  return map[tool];
}
