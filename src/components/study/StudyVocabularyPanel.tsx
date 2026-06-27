import { useEffect, useState } from "react";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import type { DifficultWord, QuizQuestion, StudyDifficulty } from "@/lib/study-session";
import {
  buildVocabularyAnalogy,
  computeUserPerformanceLevel,
  sanitizeStudyText,
  saveStudyUxState,
  simplifyVocabularyText,
  type UserPerformanceLevel,
} from "@/lib/study-ux";

interface StudyVocabularyPanelProps {
  words: DifficultWord[];
  difficulty: StudyDifficulty;
  easierMap?: Record<string, boolean>;
  quizAnswers?: Record<number, number>;
  quiz?: QuizQuestion[];
  openEvaluations?: Record<number, { score?: number }>;
  flashcardConfidence?: Record<number, string>;
}

export function StudyVocabularyPanel({
  words,
  difficulty,
  easierMap = {},
  quizAnswers = {},
  quiz = [],
  openEvaluations = {},
  flashcardConfidence = {},
}: StudyVocabularyPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [easier, setEasier] = useState<Record<string, boolean>>(easierMap);

  const performance: UserPerformanceLevel = computeUserPerformanceLevel({
    quiz,
    quizAnswers,
    openEvaluations,
    flashcardConfidence: flashcardConfidence as Record<number, "unknown" | "almost" | "known">,
  });

  const effectiveDifficulty: StudyDifficulty =
    performance === "struggling" ? "soft" : performance === "advanced" ? difficulty : difficulty === "pro" ? "medium" : difficulty;

  useEffect(() => {
    saveStudyUxState({ vocabularyEasier: easier });
  }, [easier]);

  const modeLabel =
    effectiveDifficulty === "soft" ? "Scuola media/superiore" : effectiveDifficulty === "pro" ? "Accademico" : "Tecnico chiaro";

  if (words.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-background/45 p-3 text-sm text-muted-foreground">
        Nessun termine difficile rilevato.
      </p>
    );
  }

  return (
    <div className="study-card-enter rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">📚 Vocabolario — modalità docente</h3>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
          {modeLabel}
          {performance === "struggling" && " · semplificato"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Capisci con analogie — non solo definizioni accademiche.</p>

      <div className="mt-3 space-y-3">
        {words.map((item) => {
          const isOpen = expanded[item.word];
          const showEasier = easier[item.word] || performance === "struggling";
          const quickText = simplifyVocabularyText(item, performance);
          const analogy = buildVocabularyAnalogy(item.word, item.simple);
          const displayText = effectiveDifficulty === "pro" && !showEasier
            ? sanitizeStudyText(item.technical)
            : quickText;

          return (
            <div key={item.word} className="study-card-expand rounded-2xl border border-white/10 bg-background/45 p-3">
              <button
                type="button"
                onClick={() => setExpanded((prev) => ({ ...prev, [item.word]: !prev[item.word] }))}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <p className="font-semibold text-emerald-100">{item.word}</p>
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              <p className="mt-2 text-sm text-foreground/85">
                <span className="mr-1">📘</span>{displayText}
              </p>

              {isOpen && (
                <div className="study-fade-in mt-3 space-y-2.5 border-t border-white/10 pt-3 text-sm">
                  <p><span className="font-semibold text-emerald-200/90">📘 Comprensione rapida: </span>{quickText}</p>
                  <p><span className="font-semibold text-emerald-200/90">🧠 Spiegazione semplice: </span>{analogy}</p>
                  {item.school && (
                    <p><span className="font-semibold text-emerald-200/90">🏫 Definizione scolastica: </span>{sanitizeStudyText(item.school)}</p>
                  )}
                  {effectiveDifficulty !== "soft" && (
                    <p><span className="font-semibold text-emerald-200/90">🎓 Spiegazione docente: </span>{sanitizeStudyText(item.technical)}</p>
                  )}
                  {item.advanced && effectiveDifficulty === "pro" && (
                    <p><span className="font-semibold text-emerald-200/90">🔬 Definizione avanzata: </span>{sanitizeStudyText(item.advanced)}</p>
                  )}
                  <p><span className="font-semibold text-emerald-200/90">🌍 Esempio reale: </span><em>{sanitizeStudyText(item.example)}</em></p>
                  <p><span className="font-semibold text-rose-200/80">⚠ Confusione comune: </span>
                    {item.commonMistake || `Non usare "${item.word}" senza spiegare cosa significa nel contesto.`}
                  </p>
                  {item.connections && item.connections.length > 0 && (
                    <div>
                      <p className="font-semibold text-emerald-200/90">Collegamenti</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {item.connections.slice(0, 5).map((connection) => (
                          <span key={connection} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-muted-foreground">
                            {sanitizeStudyText(connection)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {performance !== "struggling" && (
                <button
                  type="button"
                  onClick={() => setEasier((prev) => ({ ...prev, [item.word]: !prev[item.word] }))}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <Brain className="h-3.5 w-3.5" />
                  {showEasier ? "Versione completa" : "🧠 Spiegami più facile"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
