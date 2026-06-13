import type { StudyMaterialAnalysis } from "@/lib/study-os";
import { sanitizeStudyText } from "@/lib/study-ux";

const LEVEL_LABELS: Record<string, string> = {
  middle_school: "Scuola media",
  high_school: "Scuola superiore",
  university: "Università",
};

export function StudyDiagnosisPanel({ analysis }: { analysis: StudyMaterialAnalysis }) {
  return (
    <div className="space-y-3">
      <div className="study-card-enter rounded-3xl border border-emerald-300/20 bg-emerald-400/8 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200/80">Diagnosi materiale</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <InfoChip label="Materia" value={analysis.detectedSubject} />
          <InfoChip label="Livello" value={LEVEL_LABELS[analysis.detectedLevel] || analysis.detectedLevel} />
          <InfoChip label="Difficoltà" value={analysis.difficulty} />
          <InfoChip label="Tempo stimato" value={`${analysis.estimatedStudyTimeMinutes} min`} />
        </div>
      </div>

      <Section title="Argomenti principali" items={analysis.mainTopics} empty="Nessun argomento rilevato." />
      <Section title="Termini chiave" items={analysis.keyTerms} empty="Nessun termine chiave estratto." />
      <Section title="Prerequisiti" items={analysis.prerequisites} empty="Nessun prerequisito indicato." />
      <Section title="Punti deboli da rinforzare" items={analysis.weakPoints} variant="warning" />
      <Section title="Rischi di confusione" items={analysis.confusionRisks} variant="warning" />
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">{sanitizeStudyText(value)}</p>
    </div>
  );
}

function Section({
  title,
  items,
  empty,
  variant = "default",
}: {
  title: string;
  items: string[];
  empty: string;
  variant?: "default" | "warning";
}) {
  const border = variant === "warning" ? "border-amber-300/20 bg-amber-400/8" : "border-white/10 bg-white/[0.04]";
  return (
    <div className={`study-card-enter rounded-2xl border p-4 ${border}`}>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {items.length ? (
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-emerald-300/70">•</span>
              <span>{sanitizeStudyText(item)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
