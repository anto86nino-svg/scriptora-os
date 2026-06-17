import { useRef, type ReactNode } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { BookDnaConfirmationPanel } from "./BookDnaConfirmationPanel";
import { ForgeInterviewConfirmation } from "./ForgeInterviewConfirmation";
import { ForgeLiveMap } from "./ForgeLiveMap";
import { MobileInterviewProgress } from "./MobileInterviewProgress";
import { useGuidedInterviewController } from "./useGuidedInterviewController";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { getEditorialBlockedPrompt } from "@/lib/guided-interview/interview-ui-copy";
import { getContinueCtaLabel } from "@/lib/guided-interview/contextual-interview";
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
  const interviewOnly = isMobile && unifiedScroll;
  const shellScrollRef = useRef<HTMLElement>(null);

  const ctrl = useGuidedInterviewController({
    selectedGenre,
    language,
    chatFirst,
    isMobile,
    interviewOnly,
    scrollContainerRef: unifiedScroll && isMobile ? shellScrollRef : undefined,
    onComplete: onComplete as ((data: GuidedInterviewState) => void) | undefined,
    onConfirmDna,
    onContinueInterview,
  });

  const showMobileConfirmation = interviewOnly && ctrl.showDnaPanel;

  const body = (
    <InterviewBody
      ctrl={ctrl}
      isMobile={isMobile}
      interviewOnly={interviewOnly}
      showMobileConfirmation={showMobileConfirmation}
      unifiedScroll={unifiedScroll && isMobile}
    />
  );

  const inputFooter = !showMobileConfirmation ? (
    <InterviewInputFooter ctrl={ctrl} isMobile={isMobile} unifiedScroll interviewOnly={interviewOnly} />
  ) : null;

  const liveMap = !interviewOnly ? (
    <ForgeLiveMap
      state={ctrl.state}
      dnaLock={ctrl.progress.dnaLock}
      confidencePct={ctrl.confidencePct}
      isThinking={ctrl.isThinking}
      activeQuestionKey={ctrl.next.question?.key}
      isMobile={isMobile}
      onContinue={ctrl.handleContinueInterview}
      onCorrect={() => ctrl.setInput("In realtà vorrei precisare che ")}
      onDeepen={() => ctrl.setInput("Vorrei approfondire: ")}
    />
  ) : null;

  if (isMobile && unifiedScroll) {
    return (
      <MobileForgeScrollShell
        scrollRef={shellScrollRef}
        header={
          <>
            {forgeHeader}
            {!showMobileConfirmation && (
              <MobileInterviewProgress
                answeredCount={ctrl.progress.answeredCount}
                total={ctrl.progress.totalCritical}
              />
            )}
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
      {!hideHeader && <DesktopHeader />}
      {!(isMobile && unifiedScroll) && liveMap}

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          ref={ctrl.internalScrollRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 pb-2 sm:px-5"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {body}
        </div>
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
  interviewOnly,
  showMobileConfirmation,
  unifiedScroll,
}: {
  ctrl: Ctrl;
  isMobile: boolean;
  interviewOnly: boolean;
  showMobileConfirmation: boolean;
  unifiedScroll: boolean;
}) {
  const showDnaInline =
    !interviewOnly &&
    (unifiedScroll ||
      ctrl.showDnaPanel ||
      (!isMobile && ctrl.progress.dnaLock.confidenceScore > 0.35));

  if (showMobileConfirmation) {
    return (
      <div className="px-4 py-5 pb-8">
        <ForgeInterviewConfirmation
          dnaLock={ctrl.progress.dnaLock}
          extracted={ctrl.state.extracted}
          state={ctrl.state}
          onConfirm={ctrl.handleConfirmDna}
          onCorrect={ctrl.handleContinueInterview}
        />
      </div>
    );
  }

  if (interviewOnly) {
    return (
      <MobileInterviewOnlyBody ctrl={ctrl} unifiedScroll={unifiedScroll} />
    );
  }

  return (
    <div className={cn("space-y-3", unifiedScroll ? "px-4 py-4 pb-8" : "")}>
      {ctrl.state.messages.length <= 1 && (
        <div className="rounded-[22px] border border-violet-400/20 bg-violet-500/10 p-4 text-sm leading-6 text-white/75">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200">
            Intervista libera
          </p>
          <p className="mt-2">
            Raccontami il libro che hai dentro — anche confuso, a pezzi, o dettato a voce. Scriptora inferisce genere, tono e promessa man mano.
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

      {ctrl.isThinking && <ThinkingBubble />}

      {!ctrl.next.done && ctrl.next.question?.helper && (
        <p className="text-xs leading-5 text-white/45">{ctrl.next.question.helper}</p>
      )}

      {!ctrl.next.done && (ctrl.next.question?.quickSuggestions?.length ?? 0) > 0 && (
        <QuickSuggestionChips ctrl={ctrl} />
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

function MobileInterviewOnlyBody({
  ctrl,
  unifiedScroll,
}: {
  ctrl: Ctrl;
  unifiedScroll: boolean;
}) {
  const userMessages = ctrl.state.messages.filter((m) => m.role === "user");
  const currentQuestion =
    ctrl.next.question?.question ??
    "Raccontami il libro che hai dentro.";
  const lastUserReply = userMessages[userMessages.length - 1]?.content;
  const empathicLine = ctrl.next.question?.helper;
  const showNudge = ctrl.rawNext.done && !ctrl.ready;
  const continueLabel = getContinueCtaLabel(ctrl.ready, !!ctrl.input.trim());

  return (
    <div
      className={cn(
        "scriptora-forge-interview-stage relative mx-auto w-full max-w-lg",
        unifiedScroll ? "px-4 py-4 pb-4" : "px-4 py-4",
      )}
    >
      <div className="scriptora-forge-question-glow pointer-events-none absolute inset-x-6 top-8 h-40 rounded-full bg-violet-500/20 blur-3xl" aria-hidden />

      {lastUserReply && (
        <p className="relative mb-3 line-clamp-2 text-right text-[11px] leading-5 text-white/40">
          Tu: {lastUserReply}
        </p>
      )}

      <div className="scriptora-forge-question-card relative animate-in fade-in slide-in-from-bottom-2 duration-500">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200/90">
          Scriptora
        </p>
        <p className="mt-2 text-[1.05rem] font-medium leading-7 text-white sm:text-lg">
          {currentQuestion}
        </p>
        {empathicLine && (
          <p className="mt-2.5 text-sm leading-6 text-violet-100/55">{empathicLine}</p>
        )}
      </div>

      {ctrl.isThinking ? (
        <div className="relative mt-4">
          <UnderstandingPulse />
        </div>
      ) : (
        (ctrl.next.question?.quickSuggestions?.length ?? 0) > 0 && (
          <div className="relative mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Scegli una direzione
            </p>
            <QuickSuggestionChips ctrl={ctrl} premium />
          </div>
        )
      )}

      {showNudge && !ctrl.isThinking && (
        <div className="relative mt-4 rounded-2xl border border-amber-300/15 bg-amber-500/[0.08] px-4 py-3">
          <p className="text-sm leading-6 text-amber-50/90">
            {getEditorialBlockedPrompt(ctrl.progress.dnaLock)}
          </p>
          <button
            type="button"
            onClick={ctrl.handleContinueInterview}
            className="scriptora-forge-continue-cta mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
          >
            {continueLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function UnderstandingPulse() {
  return (
    <div className="scriptora-forge-understanding inline-flex items-center gap-2.5 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-300/70 opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-200" />
      </span>
      Scriptora sta capendo il libro…
    </div>
  );
}

function ThinkingBubble() {
  return (
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
  );
}

function QuickSuggestionChips({ ctrl, premium }: { ctrl: Ctrl; premium?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 pt-0.5">
      {ctrl.next.question!.quickSuggestions!.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => ctrl.sendMessage(chip.value)}
          className={cn(
            "text-left text-[11px] font-medium transition active:scale-[0.98]",
            premium
              ? "scriptora-forge-quick-chip rounded-2xl px-3.5 py-2.5 text-violet-50/90"
              : "rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-white/80 hover:border-violet-300/40 hover:bg-violet-500/15",
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

function InterviewInputFooter({
  ctrl,
  isMobile,
  unifiedScroll,
  interviewOnly,
}: {
  ctrl: Ctrl;
  isMobile: boolean;
  unifiedScroll?: boolean;
  interviewOnly?: boolean;
}) {
  return (
    <div
      className={cn(
        "scriptora-forge-input-footer shrink-0 border-t border-white/10 px-4 py-3 backdrop-blur-md",
        unifiedScroll ? "pb-3" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
    >
      {interviewOnly && (
        <p className="mb-2 text-[10px] font-medium tracking-wide text-white/40">
          Oppure raccontamelo con parole tue…
        </p>
      )}
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
          ref={ctrl.inputRef}
          value={ctrl.input}
          onChange={(e) => ctrl.setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ctrl.sendMessage();
            }
          }}
          placeholder={
            interviewOnly
              ? "Scrivi la tua risposta…"
              : ctrl.next.question?.placeholder || "Scrivi liberamente…"
          }
          rows={isMobile ? 2 : 3}
          className="scriptora-forge-input max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20"
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

function DesktopHeader() {
  return (
    <header className="shrink-0 border-b border-white/10 px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-violet-300/70">
        Book Forge · Scriptora
      </p>
      <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
        Raccontami il cuore del libro che vuoi scrivere.
      </h2>
      <p className="mt-1.5 text-sm text-white/60">
        Scriptora non chiede il genere — lo scopre. Parla liberamente.
      </p>
    </header>
  );
}
