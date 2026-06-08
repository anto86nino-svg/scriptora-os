import { AlertTriangle, ArrowRight, X } from "lucide-react";
import type { ExportIssue } from "@/lib/export-readiness";
import { t } from "@/lib/i18n";

interface ExportIssuesDialogProps {
  open: boolean;
  issues: ExportIssue[];
  onClose: () => void;
  onFix: (issue: ExportIssue) => void;
}

export function ExportIssuesDialog({ open, issues, onClose, onFix }: ExportIssuesDialogProps) {
  if (!open || issues.length === 0) return null;

  const blockers = issues.filter((i) => i.severity === "blocker");
  const warnings = issues.filter((i) => i.severity === "warning");

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div className="flex max-h-[min(82vh,560px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-foreground">{t("export_issues_title")}</h2>
          </div>
          <button type="button" onClick={onClose} className="ios-toolbar-button h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          {blockers.length > 0 && (
            <IssueGroup label={t("export_blockers")} issues={blockers} onFix={onFix} />
          )}
          {warnings.length > 0 && (
            <IssueGroup label={t("export_warnings")} issues={warnings} onFix={onFix} />
          )}
        </div>
      </div>
    </div>
  );
}

function IssueGroup({
  label,
  issues,
  onFix,
}: {
  label: string;
  issues: ExportIssue[];
  onFix: (issue: ExportIssue) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {issues.map((issue) => (
        <div key={issue.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-sm font-medium text-foreground">{issue.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{issue.description}</p>
          <p className="mt-1 text-[11px] text-muted-foreground/80">
            <span className="font-medium text-foreground/70">{t("cause")}:</span> {issue.cause}
          </p>
          <button
            type="button"
            onClick={() => onFix(issue)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground"
          >
            {issue.fixLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
