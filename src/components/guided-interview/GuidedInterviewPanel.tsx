import { useRef, type ReactNode, type WheelEvent } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { BookDnaConfirmationPanel } from "./BookDnaConfirmationPanel";
import { ForgeInterviewConfirmation } from "./ForgeInterviewConfirmation";
import { ForgeLiveMap } from "./ForgeLiveMap";
import { MobileInterviewProgress } from "./MobileInterviewProgress";
import { useGuidedInterviewController } from "./useGuidedInterviewController";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { getEditorialBlockedPrompt } from "@/lib/guided-interview/interview-ui-copy";
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

  const inputFooter =
    !ctrl.next.done && !showMobileConfirmation ? (
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
  const assistantMessages = ctrl.state.messages.filter((m) => m.role === "assistant");
  const userMessages = ctrl.state.messages.filter((m) => m.role === "user");
  const currentQuestion =
    ctrl.next.question?.question ??
    assistantMessages[assistantMessages.length - 1]?.content ??
    "Raccontami il libro che hai dentro.";
  const lastUserReply = userMessages[userMessages.length - 1]?.content;
  const empathicLine = ctrl.next.question?.helper;
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);

  const findScrollableParent = (start: HTMLElement | null): HTMLElement | null => {
    let node = start;
    while (node) {
      const style = window.getComputedStyle(node);
      const canScrollY =
        /(auto|scroll)/.test(style.overflowY) &&
        node.scrollHeight > node.clientHeight + 1;

      if (canScrollY) return node;
      node = node.parentElement;
    }
    return null;
  };

  const relayWheelToInterviewBody = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) < 0.5) return;

    const own = bodyScrollRef.current;
    const target = event.target instanceof HTMLElement ? event.target : own;
    const scrollTarget = findScrollableParent(target) ?? own;

    if (!scrollTarget) return;

    const canScroll = scrollTarget.scrollHeight > scrollTarget.clientHeight + 1;
    if (!canScroll) return;

    const before = scrollTarget.scrollTop;
    scrollTarget.scrollTop += event.deltaY;

    if (scrollTarget.scrollTop !== before) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <div
      ref={bodyScrollRef}
      onWheelCapture={relayWheelToInterviewBody}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y",
        unifiedScroll ? "px-4 py-6 pb-28" : "px-4 py-4 pb-28",
      )}
      style={{
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
        overscrollBehaviorY: "contain",
      }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center py-4">
        {lastUserReply && (
          <p className="mb-4 line-clamp-3 text-right text-xs leading-5 text-white/35">
            Tu: {lastUserReply}
          </p>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-2 rounded-[24px] border border-violet-400/15 bg-violet-500/10 px-5 py-5 duration-300">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200/80">
            Scriptora
          </p>
          <p className="mt-2 text-base font-medium leading-7 text-white sm:text-lg">
            {currentQuestion}
          </p>
          {empathicLine && (
            <p className="mt-3 text-sm leading-6 text-white/50">{empathicLine}</p>
          )}
        </div>

        {ctrl.isThinking && (
          <div className="mt-4">
            <ThinkingBubble />
          </div>
        )}

        {!ctrl.isThinking && (ctrl.next.question?.quickSuggestions?.length ?? 0) > 0 && (
          <div className="mt-4">
            <QuickSuggestionChips ctrl={ctrl} />
          </div>
        )}

        {!ctrl.ready && ctrl.next.done && (
          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
            <p className="text-sm leading-6 text-amber-50/90">
              {getEditorialBlockedPrompt(ctrl.progress.dnaLock)}
            </p>
            <button
              type="button"
              onClick={ctrl.handleContinueInterview}
              className="mt-3 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-white"
            >
              Continua
            </button>
          </div>
        )}
      </div>
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

function QuickSuggestionChips({ ctrl }: { ctrl: Ctrl }) {
  return (
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
          placeholder={
            interviewOnly
              ? "Rispondi come ti viene…"
              : ctrl.next.question?.placeholder || "Scrivi liberamente…"
          }
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
