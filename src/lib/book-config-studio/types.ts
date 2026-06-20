import type { BookBlueprint, BookConfig } from "@/types/book";

export interface BookConfigStudioIssue {
  id: string;
  step: number;
  message: string;
}

export class BookConfigStudioError extends Error {
  readonly issues: BookConfigStudioIssue[];

  constructor(issues: BookConfigStudioIssue[]) {
    super(issues.map((issue) => issue.message).join(" · "));
    this.name = "BookConfigStudioError";
    this.issues = issues;
  }
}

export interface StudioLaunchPayload {
  config: BookConfig;
  blueprint?: BookBlueprint | null;
  blueprintApproved?: boolean;
  projectId?: string;
  mode: "studio-draft" | "studio-approved" | "legacy";
}

export const STUDIO_DRAFT_STORAGE_KEY = "scriptora-studio-draft-v1";
