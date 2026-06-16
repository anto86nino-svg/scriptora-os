import type { ReactNode, RefObject } from "react";
import { useRef } from "react";
import { Mic, MicOff, Send, Sparkles } from "lucide-react";
import { BookDnaConfirmationPanel } from "./BookDnaConfirmationPanel";
import { LiveDnaDiscovery } from "./LiveDnaDiscovery";
import { useGuidedInterviewController } from "./useGuidedInterviewController";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { MobileForgeScrollShell } from "@/mobile/MobileForgeScrollShell";
import { cn } from "@/lib/utils";

type GuidedInterviewPanelProps = {
  selectedGenre?: string;
  language?: string;
  variant?: "desktop" | "mobile";
  chatFirst?: boolean;
  hideHeader?: boolean;
  /** Mobile Book Forge: one shell scroll region, input pinned below. */
  unifiedScroll?: boolean;
  forgeHeader?: ReactNode;
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
  chatFirst = true,
  hideHeader = false,
  unifiedScroll = false,
  forgeHeader,
  onComplete,
  onConfirmDna,
  onContinueInterview,
}: GuidedInterviewPanelProps) {
  const isMobile = variant === "mobile";
  const shellScrollRef = useRef<HTMLElement>(null);

  const ctrl = useGuidedInterviewController({
    selectedGenre,
    language,
    chatFirst,
    isMobile,
    scrollContainerRef: unifiedScroll && isMobile ? shellScrollRef : undefined,
    onComplete: onComplete as ((data: GuidedInterviewState) => void) | undefined,
    onConfirmDna,
    onContinueInterview,
  });

  const body = (
    <InterviewBody
      ctrl={ctrl}
      isMobile={isMobile}
      unifiedScroll={unifiedScroll && isMobile}
    />
  );

  const inputFooter = !ctrl.next.done ? (
    <InterviewInputFooter ctrl={ctrl} isMobile={isMobile} unifiedScroll />
  ) : null;

  if (isMobile && unifiedScroll) {
    return (
      <MobileForgeScrollShell
        scrollRef={shellScrollRef}
        header={
          <>
            {forgeHeader}
            <ConfidenceStrip confidencePct={ctrl.confidencePct} progress={ctrl.progress} compact />
            <LiveDnaDiscovery state={ctrl.state} isThinking={ctrl.isThinking} compact />
          </>
        }
        footer={inputFooter}
      >
        {body}
      </MobileForgeScrollShell>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-[#07070b]",
        isMobile ? "rounded-none" : "rounded-[28px] border border-white/10 backdrop-blur-xl",
      )}
    >
      {!hideHeader && <DesktopHeader confidencePct={ctrl.confidencePct} progress={ctrl.progress} />}
      {hideHeader && !unifiedScroll && (
        <>
          <ConfidenceStrip confidencePct={ctrl.confidencePct} progress={ctrl.progress} compact />
          {isMobile && <LiveDnaDiscovery state={ctrl.state} isThinking={ctrl.isThinking} compact />}
        </>
      )}

      <div className={cn("flex min-h-0 flex-1 flex-col", !isMobile && "lg:grid lg:grid-cols-[1fr_280px]")}>
        <div
          ref={ctrl.internalScrollRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 pb-2 sm:px-5"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {body}
        </div>
        {!isMobile && <DesktopRecap extracted={ctrl.state.extracted} />}
      </div>

      {inputFooter}

      {(ctrl.showDnaPanel || (!isMobile && ctrl.progress.dnaLock.confidenceScore > 0.35)) &&
        !(unifiedScroll && isMobile) && (
          <div className="shrink-0 border-t border-white/10 p-3 sm:p-4">
            <BookDnaConfirmationPanel
              dnaLock={ctrl.progress.dnaLock}
              extracted={ctrl.state.extracted}
              onContinueInterview={ctrl.handleContinueInterview}
              onConfirmDna={ctrl.handleConfirmDna}
            />
          </div>
        )}
    </div>
  );
}

type Ctrl = ReturnType<typeof useGuidedInterviewController>;

function InterviewBody({
  ctrl,
  isMobile,
  unifiedScroll,
}: {
  ctrl: Ctrl;
  isMobile: boolean;
  unifiedScroll: boolean;
}) {
  const showDnaInline =
    unifiedScroll ||
    ctrl.showDnaPanel ||
    (!isMobile && ctrl.progress.dnaLock.confidenceScore > 0.35);

  return (
    <div className={cn("space-y-3", unifiedScroll ? "px-4 py-4 pb-8" : "")}>
      {ctrl.state.messages.length <= 1 && (
        <div className="rounded-[22px] border border-violet-400/20 bg-violet-500/10 p-4 text-sm leading-6 text-white/75">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200">
            Intervista libera
          </p>
          <p className="mt-2">
            Puoi scrivere un&apos;idea confusa, note sparse o dettare a voce. Scriptora inferisce genere, tono e promessa man mano.
          </p>
        </div>
      )}

      {ctrl.state.messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "max-w-[92%] animate-in fade-in slide-in-from-bottom-2 rounded-[22px] px-4 py-3 text-sm leading-6 duration-300",
            msg.role === "assistant"
              ? "rounded-tl-md bg-violet-500/18 text-white"
              : "ml-auto rounded-tr-md bg-white/10 text-white/90",
          )}
        >
          {msg.content}
        </div>
      ))}

      {ctrl.isThinking && (
        <div className="max-w-[70%] rounded-[22px] rounded-tl-md bg-violet-500/12 px-4 py-3 text-sm text-violet-100">
          <span className="inline-flex items-center gap-2">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:240ms]" />
            </span>
            Scriptora sta riflettendo…
          </span>
        </div>
      )}

      {!ctrl.next.done && ctrl.next.question?.helper && (
        <p className="text-xs leading-5 text-white/45">{ctrl.next.question.helper}</p>
      )}

      {!ctrl.next.done && (ctrl.next.question?.quickSuggestions?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {ctrl.next.question!.quickSuggestions!.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => ctrl.sendMessage(chip.value)}
              className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-white/80 transition hover:border-violet-300/40 hover:bg-violet-500/15"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {isMobile && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Object.entries(FIELD_LABELS).map(([key, label]) => {
            const val = (ctrl.state.extracted as Record<string, string | undefined>)?.[key];
            const ok = val && val.trim().length >= 12;
            return (
              <span
                key={key}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-medium",
                  ok
                    ? "border border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                    : "border border-white/10 bg-white/[0.04] text-white/40",
                )}
              >
                {label}
              </span>
            );
          })}
        </div>
      )}

      {ctrl.ready && !ctrl.showDnaPanel && !unifiedScroll && (
        <div className="rounded-[22px] border border-emerald-400/25 bg-emerald-500/10 p-4 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
            Credo di aver capito il tuo libro
          </p>
          <p className="mt-1 text-sm text-white/75">
            Confidenza {ctrl.confidencePct}%. Conferma l&apos;identità del libro per passare al blueprint.
          </p>
        </div>
      )}

      {!ctrl.ready && ctrl.next.done && (
        <div className="rounded-[22px] border border-amber-400/25 bg-amber-500/10 p-4 text-white">
          <p className="text-sm font-medium text-amber-100">
            {ctrl.progress.dnaLock.blockedMessage ||
              "Servono ancora qualche dettaglio prima del blueprint."}
          </p>
          <button
            type="button"
            onClick={ctrl.handleContinueInterview}
            className="mt-3 rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold"
          >
            Continua l&apos;intervista
          </button>
        </div>
      )}

      {showDnaInline && (
        <div className="pt-2">
          <BookDnaConfirmationPanel
            dnaLock={ctrl.progress.dnaLock}
            extracted={ctrl.state.extracted}
            onContinueInterview={ctrl.handleContinueInterview}
            onConfirmDna={ctrl.handleConfirmDna}
          />
        </div>
      )}
    </div>
  );
}

function InterviewInputFooter({
  ctrl,
  isMobile,
  unifiedScroll,
}: {
  ctrl: Ctrl;
  isMobile: boolean;
  unifiedScroll?: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-white/10 bg-[#07070b]/95 px-4 py-3 backdrop-blur-md",
        unifiedScroll ? "pb-3" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
    >
      {ctrl.speech.error && (
        <p className="mb-2 text-[11px] text-amber-300">{ctrl.speech.error}</p>
      )}
      {ctrl.speech.isListening && (
        <p className="mb-2 animate-pulse text-[11px] font-medium text-violet-300">
          🎙️ Scriptora ti sta ascoltando…
        </p>
      )}
      <div className="flex items-end gap-2">
        {ctrl.speech.supported && (
          <button
            type="button"
            onClick={ctrl.toggleMic}
            aria-label={ctrl.speech.isListening ? "Ferma dettatura" : "Avvia dettatura"}
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition",
              ctrl.speech.isListening
                ? "border-red-400/40 bg-red-500/20 text-red-200"
                : "border-white/12 bg-white/[0.05] text-white/70 hover:bg-white/10",
            )}
          >
            {ctrl.speech.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}
        <textarea
          value={ctrl.input}
          onChange={(e) => ctrl.setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ctrl.sendMessage();
            }
          }}
          placeholder={ctrl.next.question?.placeholder || "Scrivi liberamente…"}
          rows={isMobile ? 2 : 3}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/40"
        />
        <button
          type="button"
          onClick={() => ctrl.sendMessage()}
          disabled={!ctrl.input.trim() || ctrl.isThinking}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-500 text-white disabled:opacity-40"
          aria-label="Invia"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ConfidenceStrip({
  confidencePct,
  progress,
  compact,
}: {
  confidencePct: number;
  progress: Ctrl["progress"];
  compact?: boolean;
}) {
  return (
    <div className={cn("shrink-0 border-b border-white/10 px-4", compact ? "py-2" : "pb-4 pt-2")}>
      <div className="flex items-center justify-between text-[11px] text-white/55">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-violet-300" />
          Confidenza DNA
        </span>
        <span className="font-semibold tabular-nums text-violet-200">{confidencePct}%</span>
      </div>
      <div className={cn("overflow-hidden rounded-full bg-white/10", compact ? "mt-1.5 h-1.5" : "mt-4 h-2")}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700"
          style={{ width: `${Math.max(8, confidencePct)}%` }}
        />
      </div>
      {!compact && (
        <p className="mt-2 text-[10px] text-white/45">
          {progress.answeredCount}/{progress.totalCritical} segnali critici · soglia blueprint 95%
        </p>
      )}
    </div>
  );
}

function DesktopHeader({
  confidencePct,
  progress,
}: {
  confidencePct: number;
  progress: Ctrl["progress"];
}) {
  return (
    <header className="shrink-0 border-b border-white/10 px-4 pb-4 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-violet-300/70">
        Book Forge · Scriptora
      </p>
      <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
        Raccontami il cuore del libro che vuoi scrivere.
      </h2>
      <p className="mt-1.5 text-sm text-white/60">
        Scriptora non chiede il genere — lo scopre. Parla liberamente.
      </p>
      <ConfidenceStrip confidencePct={confidencePct} progress={progress} />
    </header>
  );
}

function DesktopRecap({ extracted }: { extracted: GuidedInterviewState["extracted"] }) {
  return (
    <aside className="hidden min-h-0 border-l border-white/10 bg-black/20 p-4 lg:block">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200/80">
        Recap live
      </p>
      <div className="mt-3 space-y-2">
        {Object.entries(FIELD_LABELS).map(([key, label]) => {
          const val = (extracted as Record<string, string | undefined>)?.[key];
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
  );
}
