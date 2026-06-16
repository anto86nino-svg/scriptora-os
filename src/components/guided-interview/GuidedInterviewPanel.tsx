import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { BookDnaConfirmationPanel } from "./BookDnaConfirmationPanel";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
  getInterviewProgress,
  getNextInterviewQuestion,
  resumeInterview,
} from "@/lib/guided-interview/question-engine";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import { cn } from "@/lib/utils";

type GuidedInterviewPanelProps = {
  selectedGenre?: string;
  language?: string;
  variant?: "desktop" | "mobile";
  onComplete?: (data: unknown) => void;
  onConfirmDna?: (state: GuidedInterviewState) => void;
  onContinueInterview?: () => void;
};

const FIELD_LABELS: Record<string, string> = {
  readerTransformation: "Trasformazione",
  centralConflict: "Conflitto",
  emotionalTone: "Tono",
  genreDNA: "DNA editoriale",
  promise: "Promessa",
  setting: "Contesto",
  targetReader: "Lettore ideale",
};

export function GuidedInterviewPanel({
  selectedGenre,
  language = "Italian",
  variant = "desktop",
  onComplete,
  onConfirmDna,
  onContinueInterview,
}: GuidedInterviewPanelProps) {
  const [state, setState] = useState(() =>
    getInitialInterviewState({ selectedGenre }),
  );
  const [input, setInput] = useState("");
  const [showDnaPanel, setShowDnaPanel] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastQuestionIdRef = useRef<string | null>(null);
  const isMobile = variant === "mobile";

  const speech = useSpeechDictation(language);

  useEffect(() => {
    setState(getInitialInterviewState({ selectedGenre }));
    setShowDnaPanel(false);
    lastQuestionIdRef.current = null;
  }, [selectedGenre]);

  const next = useMemo(() => getNextInterviewQuestion(state), [state]);
  const progress = useMemo(() => getInterviewProgress(state), [state]);
  const ready = progress.dnaLock.readyForBlueprint;

  useEffect(() => {
    if (!next.question || next.done) return;
    if (lastQuestionIdRef.current === next.question.id) return;
    lastQuestionIdRef.current = next.question.id;
    setState((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: `assistant-${next.question!.id}-${Date.now()}`,
          role: "assistant",
          content: next.question!.question,
          createdAt: Date.now(),
        },
      ],
    }));
  }, [next.question, next.done]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [state.messages.length, showDnaPanel]);

  useEffect(() => {
    if (next.done && ready) {
      onComplete?.(state);
    }
  }, [next.done, ready, onComplete, state]);

  const sendMessage = (text?: string) => {
    const payload = clean(text ?? input);
    if (!payload || next.done) return;
    const updated = applyInterviewAnswer(state, payload);
    setState(updated);
    setInput("");
    if (speech.isListening) speech.stop();
  };

  const handleContinueInterview = () => {
    setState((prev) => resumeInterview(prev));
    setShowDnaPanel(false);
    onContinueInterview?.();
  };

  const toggleMic = () => {
    if (speech.isListening) {
      speech.stop();
      return;
    }
    speech.start((chunk) => {
      setInput((prev) => `${prev}${prev ? " " : ""}${chunk}`.trim());
    });
  };

  const confidencePct = Math.round(progress.confidence * 100);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-[#07070b]",
        isMobile ? "rounded-none" : "rounded-[28px] border border-white/10 backdrop-blur-xl",
      )}
    >
      <header className="shrink-0 border-b border-white/10 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-violet-300/70">
          Book Forge · Scriptora
        </p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
          Raccontami il libro che hai dentro
        </h2>
        <p className="mt-1.5 text-sm text-white/60">
          Scriptora farà domande finché non capirà davvero il libro.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-white/55">
            <span>Confidenza DNA</span>
            <span className="font-semibold tabular-nums text-violet-200">{confidencePct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${Math.max(8, confidencePct)}%` }}
            />
          </div>
          <p className="text-[10px] text-white/45">
            {progress.answeredCount}/{progress.totalCritical} segnali critici raccolti
          </p>
        </div>
      </header>

      <div className={cn("flex min-h-0 flex-1", !isMobile && "lg:grid lg:grid-cols-[1fr_280px]")}>
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
        >
          {state.messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "max-w-[92%] rounded-[22px] px-4 py-3 text-sm leading-6",
                msg.role === "assistant"
                  ? "rounded-tl-md bg-violet-500/18 text-white"
                  : "ml-auto rounded-tr-md bg-white/10 text-white/90",
              )}
            >
              {msg.content}
            </div>
          ))}

          {!next.done && next.question?.helper && (
            <p className="text-xs leading-5 text-white/45">{next.question.helper}</p>
          )}

          {!next.done && (next.question?.quickSuggestions?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {next.question!.quickSuggestions!.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => sendMessage(chip.value)}
                  className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-white/80 transition hover:border-violet-300/40 hover:bg-violet-500/15"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {ready && !showDnaPanel && (
            <div className="rounded-[22px] border border-emerald-400/25 bg-emerald-500/10 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
                DNA pronto
              </p>
              <p className="mt-1 text-sm text-white/75">
                Scriptora ha abbastanza segnali. Conferma l&apos;identità del libro per passare al blueprint.
              </p>
              <button
                type="button"
                onClick={() => setShowDnaPanel(true)}
                className="mt-3 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950"
              >
                Rivedi e conferma DNA
              </button>
            </div>
          )}

          {!ready && next.done && (
            <div className="rounded-[22px] border border-amber-400/25 bg-amber-500/10 p-4 text-white">
              <p className="text-sm font-medium text-amber-100">
                Servono ancora qualche dettaglio prima del blueprint.
              </p>
              <button
                type="button"
                onClick={handleContinueInterview}
                className="mt-3 rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold"
              >
                Continua l&apos;intervista
              </button>
            </div>
          )}
        </div>

        {!isMobile && (
          <aside className="hidden min-h-0 border-l border-white/10 bg-black/20 p-4 lg:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200/80">
              Recap live
            </p>
            <div className="mt-3 space-y-2">
              {Object.entries(FIELD_LABELS).map(([key, label]) => {
                const val = (state.extracted as Record<string, string | undefined>)?.[key];
                return (
                  <div
                    key={key}
                    className={cn(
                      "rounded-xl border p-2.5 text-[11px]",
                      val && val.trim().length >= 12
                        ? "border-emerald-400/20 bg-emerald-500/5 text-emerald-100"
                        : "border-white/8 bg-white/[0.03] text-white/40",
                    )}
                  >
                    <p className="font-semibold">{label}</p>
                    <p className="mt-1 leading-5">{val?.trim() || "—"}</p>
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {!next.done && (
        <div className="shrink-0 border-t border-white/10 bg-[#07070b]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          {speech.error && (
            <p className="mb-2 text-[11px] text-amber-300">{speech.error}</p>
          )}
          {speech.isListening && (
            <p className="mb-2 animate-pulse text-[11px] font-medium text-violet-300">
              🎙️ Scriptora ti sta ascoltando…
            </p>
          )}
          <div className="flex items-end gap-2">
            {speech.supported && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={speech.isListening ? "Ferma dettatura" : "Avvia dettatura"}
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition",
                  speech.isListening
                    ? "border-red-400/40 bg-red-500/20 text-red-200"
                    : "border-white/12 bg-white/[0.05] text-white/70 hover:bg-white/10",
                )}
              >
                {speech.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={next.question?.placeholder || "Scrivi liberamente…"}
              rows={isMobile ? 2 : 3}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/40"
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-500 text-white disabled:opacity-40"
              aria-label="Invia"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {(showDnaPanel || (!isMobile && progress.dnaLock.confidenceScore > 0.35)) && (
        <div className="shrink-0 border-t border-white/10 p-3 sm:p-4">
          <BookDnaConfirmationPanel
            dnaLock={progress.dnaLock}
            onContinueInterview={handleContinueInterview}
            onConfirmDna={() => {
              if (!ready) return;
              onConfirmDna?.(state);
            }}
          />
        </div>
      )}
    </div>
  );
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
