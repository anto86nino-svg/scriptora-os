import { compressLightSummary, parseStudyNotesPro } from "@/lib/study-ux";

interface StudySummaryPanelProps {
  lightSummary: string;
  mediumSummary: string;
  proSummary: string;
  studyNotesPro: string;
}

function SummaryCard({ title, text, badge }: { title: string; text: string; badge?: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        {badge && (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-foreground/85">{text}</pre>
    </div>
  );
}

export function StudySummaryPanel({
  lightSummary,
  mediumSummary,
  proSummary,
  studyNotesPro,
}: StudySummaryPanelProps) {
  const lightCompressed = compressLightSummary(lightSummary);
  const notesSections = parseStudyNotesPro(studyNotesPro);

  return (
    <div className="space-y-4">
      <SummaryCard
        title="📘 Riassunto leggero"
        text={lightCompressed}
        badge="~150 parole · ripasso veloce"
      />
      <SummaryCard
        title="📗 Riassunto medio"
        text={mediumSummary}
        badge="Spiegazione scuola"
      />
      <SummaryCard
        title="📕 Riassunto Pro"
        text={proSummary}
        badge="Comprensione profonda"
      />

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
        <h3 className="font-semibold">📝 Scheda Studio Pro</h3>
        <p className="mt-1 text-xs text-muted-foreground">Struttura visiva per scansione rapida — niente muri di testo.</p>

        {notesSections.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {notesSections.map((section) => (
              <div
                key={section.title}
                className="rounded-2xl border border-white/10 bg-background/45 p-3"
              >
                <p className="text-sm font-bold text-foreground">
                  {section.icon} {section.title}
                </p>
                <ul className="mt-2 space-y-1.5 text-sm leading-5 text-muted-foreground">
                  {section.lines.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-300/60">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-foreground/85">{studyNotesPro}</pre>
        )}
      </div>
    </div>
  );
}
