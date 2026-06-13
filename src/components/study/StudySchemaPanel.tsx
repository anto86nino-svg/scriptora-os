import { sanitizeStudyText } from "@/lib/study-ux";

export function StudySchemaPanel({ conceptMap }: { conceptMap: string }) {
  const lines = sanitizeStudyText(conceptMap).split("\n").filter(Boolean);
  return (
    <div className="study-card-enter rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <h3 className="font-semibold">🗺️ Mappa concettuale</h3>
      <p className="mt-1 text-xs text-muted-foreground">Gerarchia testuale — cause, effetti e collegamenti.</p>
      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-background/60 p-4 font-mono text-sm leading-6 text-foreground/90">
        {lines.join("\n")}
      </pre>
    </div>
  );
}
