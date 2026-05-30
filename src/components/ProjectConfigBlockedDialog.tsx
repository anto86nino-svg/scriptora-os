import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { t, tt } from "@/lib/i18n";
import type { ProjectConfigIssue } from "@/lib/project-config-validation";
import { AlertTriangle } from "lucide-react";

interface ProjectConfigBlockedDialogProps {
  open: boolean;
  issues: ProjectConfigIssue[];
  projectTitle?: string;
  onReconfigure: () => void;
  onDeleteProject: () => void;
  onClose: () => void;
}

function issueLabel(issue: ProjectConfigIssue): string {
  const key = `project_config_issue_${issue.id}` as const;
  if (issue.detail) return tt(key, { detail: issue.detail });
  return t(key);
}

export function ProjectConfigBlockedDialog({
  open,
  issues,
  projectTitle,
  onReconfigure,
  onDeleteProject,
  onClose,
}: ProjectConfigBlockedDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-left">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            {t("project_config_blocked_title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-muted-foreground">
              <p>
                {projectTitle
                  ? tt("project_config_blocked_desc_named", { title: projectTitle })
                  : t("project_config_blocked_desc")}
              </p>
              <ul className="list-disc space-y-1 pl-5 text-foreground/90">
                {issues.map((issue, index) => (
                  <li key={`${issue.id}-${index}`}>{issueLabel(issue)}</li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <AlertDialogAction
            className="w-full"
            onClick={(event) => {
              event.preventDefault();
              onReconfigure();
            }}
          >
            {t("project_config_reconfigure")}
          </AlertDialogAction>
          <AlertDialogCancel
            className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={(event) => {
              event.preventDefault();
              onDeleteProject();
            }}
          >
            {t("project_config_delete_project")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
