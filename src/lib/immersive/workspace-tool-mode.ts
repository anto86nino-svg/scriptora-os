/** Lateral tools that switch Workspace OS hero into compact book + tool visual mode. */
export type WorkspaceToolId =
  | "cover"
  | "voice"
  | "export"
  | "market"
  | "diagnostics"
  | "characters"
  | "author";

export type WorkspaceToolModeState = {
  showCoverStudio: boolean;
  showVoiceStudio: boolean;
  showExport: boolean;
  showManuscriptAnalyzer: boolean;
  showCharacterStudio: boolean;
  showAuthorIdentity: boolean;
  showTitleIntel: boolean;
};

export function deriveActiveWorkspaceTool(state: WorkspaceToolModeState): WorkspaceToolId | null {
  if (state.showCoverStudio) return "cover";
  if (state.showVoiceStudio) return "voice";
  if (state.showExport) return "export";
  if (state.showManuscriptAnalyzer) return "diagnostics";
  if (state.showCharacterStudio) return "characters";
  if (state.showAuthorIdentity) return "author";
  if (state.showTitleIntel) return "market";
  return null;
}

export function workspaceToolLabelKey(tool: WorkspaceToolId): string {
  const keys: Record<WorkspaceToolId, string> = {
    cover: "cover_studio",
    voice: "voice_studio_title",
    export: "export_studio_title",
    market: "title_intelligence",
    diagnostics: "manuscript_lab_title",
    characters: "character_studio_title",
    author: "author_identity",
  };
  return keys[tool];
}
