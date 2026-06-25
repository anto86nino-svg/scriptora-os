import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { FC } from "react";

interface Props {
  coherenceReport: any;
  validationIssues: any[];
  applyCoherenceAutoFix: () => void;
  title: string;
  authorName: string;
  identityDraft: any;
  genre: string;
  subcategory: string;
  chapters: number;
  subchaptersEnabled: boolean;
  subchaptersPerChapter: number;
}

const StepValidation: FC<Props> = ({
  coherenceReport,
  validationIssues,
  applyCoherenceAutoFix,
  title,
  authorName,
  identityDraft,
  genre,
  subcategory,
  chapters,
  subchaptersEnabled,
  subchaptersPerChapter,
}) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">
        Validazione progetto
      </h2>

      {coherenceReport?.needsCorrection && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">
                Abbiamo rilevato alcune impostazioni incoerenti.
              </p>

              <p className="mt-1 text-xs text-amber-100/80">
                Coerenza complessiva: {coherenceReport.overall}/100
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={applyCoherenceAutoFix}
            className="rounded-lg border border-amber-200/40 bg-amber-200/15 px-3 py-2 text-xs font-semibold text-amber-50"
          >
            Correggi automaticamente
          </button>
        </div>
      )}

      {validationIssues.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p>Configurazione completa. Puoi generare il blueprint.</p>
        </div>
      ) : (
        validationIssues.map(issue => (
          <div
            key={issue.id}
            className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Step {issue.step}: {issue.message}
            </span>
          </div>
        ))
      )}

      <div className="rounded-xl border border-white/12 bg-white/5 p-4 text-xs text-white/70 space-y-1">
        <p><strong className="text-white">Titolo:</strong> {title || "—"}</p>
        <p><strong className="text-white">Autore:</strong> {authorName || identityDraft.penName}</p>
        <p><strong className="text-white">Genere:</strong> {genre} / {subcategory}</p>
        <p>
          <strong className="text-white">Capitoli:</strong> {chapters}
          {subchaptersEnabled ? ` · ${subchaptersPerChapter} sottocapitoli` : ""}
        </p>
      </div>
    </div>
  );
};

export default StepValidation;
