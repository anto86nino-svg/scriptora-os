import { useEffect, useState } from "react";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import type { DifficultWord, StudyDifficulty } from "@/lib/study-session";
import { saveStudyUxState, simplifyVocabularyText } from "@/lib/study-ux";

interface StudyVocabularyPanelProps {
  words: DifficultWord[];
  difficulty: StudyDifficulty;
  easierMap?: Record<string, boolean>;
}

export function StudyVocabularyPanel({ words, difficulty, easierMap = {} }: StudyVocabularyPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [easier, setEasier] = useState<Record<string, boolean>>(easierMap);

  useEffect(() => {
    saveStudyUxState({ vocabularyEasier: easier });
  }, [easier]);

  const modeLabel =
    difficulty === "soft" ? "Linguaggio scuola" : difficulty === "pro" ? "Accademico avanzato" : "Tecnico ma chiaro";

  if (words.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-background/45 p-3 text-sm text-muted-foreground">
        Nessun termine difficile rilevato in questa sessione.
      </p>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">📚 Vocabolario intelligente</h3>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
          Modalità: {modeLabel}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Ogni parola è una card premium — capisci, non solo memorizzare.
      </p>

      <div className="mt-3 space-y-3">
        {words.map((item) => {
          const isOpen = expanded[item.word];
          const showEasier = easier[item.word];
          const quickText = showEasier ? simplifyVocabularyText(item) : item.simple;

          return (
            <div key={item.word} className="rounded-2xl border border-white/10 bg-background/45 p-3">
              <button
                type="button"
                onClick={() => setExpanded((prev) => ({ ...prev, [item.word]: !prev[item.word] }))}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <p className="font-semibold text-emerald-100">{item.word}</p>
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              <p className="mt-2 text-sm text-foreground/85">
                <span className="mr-1">📘</span>
                {difficulty === "soft" ? quickText : difficulty === "pro" ? item.technical : quickText}
              </p>

              {isOpen && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-sm">
                  <p><span className="font-semibold text-emerald-200/90">📘 Comprensione rapida: </span>{quickText}</p>
                  <p><span className="font-semibold text-emerald-200/90">🧠 Ricordalo facile: </span>
                    {`Pensa a "${item.word}" come: ${item.simple.split(/[.!?]/)[0] || item.simple}`}
                  </p>
                  <p><span className="font-semibold text-emerald-200/90">🎓 Spiegazione docente: </span>{item.technical}</p>
                  <p><span className="font-semibold text-emerald-200/90">🌍 Esempio reale: </span><em>{item.example}</em></p>
                  <p><span className="font-semibold text-rose-200/80">⚠ Errore comune: </span>
                    Non usare il termine senza spiegare cosa significa nel contesto del materiale.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setEasier((prev) => ({ ...prev, [item.word]: !prev[item.word] }))}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <Brain className="h-3.5 w-3.5" />
                {showEasier ? "Mostra versione completa" : "🧠 Spiegami più facile"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
