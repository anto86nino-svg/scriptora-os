import { sanitizeStudyText } from "@/lib/study-ux";

interface StudyExplanationPanelProps {
  simpleExplanation?: string;
  examLevelExplanation?: string;
  advancedExplanation?: string;
}

export function StudyExplanationPanel({
  simpleExplanation,
  examLevelExplanation,
  advancedExplanation,
}: StudyExplanationPanelProps) {
  return (
    <div className="space-y-4">
      <Block title="💡 Spiegazione facile" text={simpleExplanation} badge="Come a uno studente" />
      <Block title="🎤 Livello interrogazione" text={examLevelExplanation} badge="Orale / verifica" />
      <Block title="🎓 Livello esame/università" text={advancedExplanation} badge="Profondo" />
    </div>
  );
}

function Block({ title, text, badge }: { title: string; text?: string; badge: string }) {
  if (!text?.trim()) return null;
  return (
    <div className="study-card-enter rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{badge}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{sanitizeStudyText(text)}</p>
    </div>
  );
}
