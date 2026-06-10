import { useEffect, useMemo, useState } from "react";
import type { Flashcard } from "@/lib/study-session";
import {
  getFlashcardBuckets,
  inferFlashcardType,
  prioritizeFlashcardOrder,
  saveStudyUxState,
  type FlashcardConfidence,
} from "@/lib/study-ux";

interface StudyFlashcardsPanelProps {
  cards: Flashcard[];
  initialIndex?: number;
  initialConfidence?: Record<number, FlashcardConfidence>;
  initialFlipped?: Record<number, boolean>;
  onConfidenceChange?: (confidence: Record<number, FlashcardConfidence>) => void;
}

export function StudyFlashcardsPanel({
  cards,
  initialIndex = 0,
  initialConfidence = {},
  initialFlipped = {},
  onConfidenceChange,
}: StudyFlashcardsPanelProps) {
  const [confidence, setConfidence] = useState<Record<number, FlashcardConfidence>>(initialConfidence);
  const [flipped, setFlipped] = useState<Record<number, boolean>>(initialFlipped);

  const studyOrder = useMemo(
    () => prioritizeFlashcardOrder(cards.length, confidence),
    [cards.length, confidence]
  );

  const [orderPos, setOrderPos] = useState(() => {
    const pos = studyOrder.indexOf(initialIndex);
    return pos >= 0 ? pos : 0;
  });

  const index = studyOrder[orderPos] ?? 0;
  const card = cards[index];
  const isFlipped = flipped[index] ?? false;
  const buckets = getFlashcardBuckets(cards, confidence);

  useEffect(() => {
    saveStudyUxState({
      currentFlashcardIndex: index,
      flashcardConfidence: confidence,
      flashcardFlipped: flipped,
    });
    onConfidenceChange?.(confidence);
  }, [index, confidence, flipped, onConfidenceChange]);

  if (cards.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-background/45 p-3 text-sm text-muted-foreground">
        Nessuna flashcard disponibile.
      </p>
    );
  }

  function setCardConfidence(level: FlashcardConfidence) {
    setConfidence((prev) => ({ ...prev, [index]: level }));
    setFlipped((prev) => ({ ...prev, [index]: false }));
    if (orderPos < studyOrder.length - 1) {
      setTimeout(() => setOrderPos((v) => v + 1), 300);
    }
  }

  function jumpToWeak() {
    const next = studyOrder.find((i) => confidence[i] === "unknown" || !confidence[i]);
    if (next !== undefined) {
      const pos = studyOrder.indexOf(next);
      if (pos >= 0) setOrderPos(pos);
    }
  }

  return (
    <div className="study-card-enter rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">🃏 Memory Engine</h3>
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-muted-foreground">
          {orderPos + 1}/{cards.length} · {inferFlashcardType(card, index)}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <BucketPill icon="🔥" label="Ripassa ora" count={buckets.reviewNow.length} tone="rose" />
        <BucketPill icon="⚡" label="Quasi" count={buckets.almostMastered.length} tone="amber" />
        <BucketPill icon="✅" label="Padroneggiato" count={buckets.mastered.length} tone="emerald" />
      </div>

      {buckets.reviewNow.length > 0 && (
        <button
          type="button"
          onClick={jumpToWeak}
          className="mt-3 w-full rounded-xl border border-rose-300/25 bg-rose-400/10 py-2 text-xs font-semibold text-rose-100"
        >
          🔥 Ripassa concetti deboli ({buckets.reviewNow.length})
        </button>
      )}

      <button
        type="button"
        onClick={() => setFlipped((prev) => ({ ...prev, [index]: !isFlipped }))}
        className="mt-4 w-full text-left"
        aria-label={isFlipped ? "Nascondi" : "Rivela"}
      >
        <div className={`study-flip min-h-[180px] rounded-3xl border border-white/15 p-5 ${isFlipped ? "bg-emerald-400/10" : "bg-background/60"}`}>
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
        <div className="study-fade-in mt-3 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => setCardConfidence("unknown")} className="rounded-2xl border border-rose-300/30 bg-rose-400/10 py-2.5 text-xs font-bold text-rose-100">
            ❌ Non so
          </button>
          <button type="button" onClick={() => setCardConfidence("almost")} className="rounded-2xl border border-amber-300/30 bg-amber-400/10 py-2.5 text-xs font-bold text-amber-100">
            🤔 Quasi
          </button>
          <button type="button" onClick={() => setCardConfidence("known")} className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 py-2.5 text-xs font-bold text-emerald-100">
            ✅ So
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { setOrderPos((v) => Math.max(0, v - 1)); setFlipped({}); }}
          disabled={orderPos === 0}
          className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-muted-foreground disabled:opacity-40"
        >
          ← Precedente
        </button>
        <button
          type="button"
          onClick={() => { setOrderPos((v) => Math.min(studyOrder.length - 1, v + 1)); setFlipped({}); }}
          disabled={orderPos >= studyOrder.length - 1}
          className="h-11 rounded-2xl bg-emerald-300 text-sm font-bold text-slate-950 disabled:opacity-40"
        >
          Prossima →
        </button>
      </div>
    </div>
  );
}

function BucketPill({ icon, label, count, tone }: { icon: string; label: string; count: number; tone: "rose" | "amber" | "emerald" }) {
  const colors = {
    rose: "border-rose-300/20 bg-rose-400/5 text-rose-100",
    amber: "border-amber-300/20 bg-amber-400/5 text-amber-100",
    emerald: "border-emerald-300/20 bg-emerald-400/5 text-emerald-100",
  };
  return (
    <div className={`rounded-xl border px-3 py-2 text-center ${colors[tone]}`}>
      <p className="text-lg font-bold">{count}</p>
      <p className="text-[10px] font-semibold">{icon} {label}</p>
    </div>
  );
}
