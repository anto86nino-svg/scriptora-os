import { useEffect, useState } from "react";
import type { Flashcard } from "@/lib/study-session";
import {
  getFlashcardsToReview,
  inferFlashcardType,
  saveStudyUxState,
  type FlashcardConfidence,
} from "@/lib/study-ux";

interface StudyFlashcardsPanelProps {
  cards: Flashcard[];
  initialIndex?: number;
  initialConfidence?: Record<number, FlashcardConfidence>;
  initialFlipped?: Record<number, boolean>;
}

export function StudyFlashcardsPanel({
  cards,
  initialIndex = 0,
  initialConfidence = {},
  initialFlipped = {},
}: StudyFlashcardsPanelProps) {
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(0, cards.length - 1)));
  const [flipped, setFlipped] = useState<Record<number, boolean>>(initialFlipped);
  const [confidence, setConfidence] = useState<Record<number, FlashcardConfidence>>(initialConfidence);

  useEffect(() => {
    saveStudyUxState({
      currentFlashcardIndex: index,
      flashcardConfidence: confidence,
      flashcardFlipped: flipped,
    });
  }, [index, confidence, flipped]);

  const reviewTopics = getFlashcardsToReview(cards, confidence);
  const card = cards[index];
  const isFlipped = flipped[index] ?? false;

  if (cards.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-background/45 p-3 text-sm text-muted-foreground">
        Nessuna flashcard disponibile. Rigenera l&apos;analisi.
      </p>
    );
  }

  function setCardConfidence(level: FlashcardConfidence) {
    setConfidence((prev) => ({ ...prev, [index]: level }));
    setFlipped((prev) => ({ ...prev, [index]: false }));
    if (index < cards.length - 1) {
      setTimeout(() => setIndex((v) => v + 1), 280);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">🃏 Memory Mode</h3>
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-muted-foreground">
          {index + 1}/{cards.length} · {inferFlashcardType(card, index)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Tocca la card per girarla. Valuta quanto la ricordi.</p>

      {reviewTopics.length > 0 && (
        <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/80">Da ripassare</p>
          <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
            {reviewTopics.map((topic, i) => <li key={i}>• {topic}</li>)}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setFlipped((prev) => ({ ...prev, [index]: !isFlipped }))}
        className="mt-4 w-full text-left"
        aria-label={isFlipped ? "Nascondi risposta" : "Mostra risposta"}
      >
        <div
          className={[
            "relative min-h-[180px] rounded-3xl border border-white/15 p-5 transition-all duration-300",
            isFlipped ? "bg-emerald-400/10" : "bg-background/60",
          ].join(" ")}
          style={{ transform: isFlipped ? "rotateY(0deg)" : "none" }}
        >
          {!isFlipped ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Fronte</p>
              <p className="mt-3 text-base font-semibold leading-7">{card.front}</p>
              <p className="mt-4 text-xs text-emerald-200/70">Tocca per rivelare →</p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/70">Retro</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.back}</p>
            </>
          )}
        </div>
      </button>

      {isFlipped && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setCardConfidence("unknown")}
            className="rounded-2xl border border-rose-300/30 bg-rose-400/10 py-2.5 text-xs font-bold text-rose-100"
          >
            ❌ Non so
          </button>
          <button
            type="button"
            onClick={() => setCardConfidence("almost")}
            className="rounded-2xl border border-amber-300/30 bg-amber-400/10 py-2.5 text-xs font-bold text-amber-100"
          >
            🤔 Quasi
          </button>
          <button
            type="button"
            onClick={() => setCardConfidence("known")}
            className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 py-2.5 text-xs font-bold text-emerald-100"
          >
            ✅ So
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { setIndex((v) => Math.max(0, v - 1)); setFlipped((prev) => ({ ...prev, [Math.max(0, index - 1)]: false })); }}
          disabled={index === 0}
          className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-muted-foreground disabled:opacity-40"
        >
          ← Precedente
        </button>
        <button
          type="button"
          onClick={() => { setIndex((v) => Math.min(cards.length - 1, v + 1)); setFlipped((prev) => ({ ...prev, [Math.min(cards.length - 1, index + 1)]: false })); }}
          disabled={index >= cards.length - 1}
          className="h-11 rounded-2xl bg-emerald-300 text-sm font-bold text-slate-950 disabled:opacity-40"
        >
          Prossima →
        </button>
      </div>
    </div>
  );
}
