import { useRef, type ReactNode } from "react";
import { Mic, MicOff, Send, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { BookDnaConfirmationPanel } from "./BookDnaConfirmationPanel";
import { ForgeInterviewConfirmation } from "./ForgeInterviewConfirmation";
import { ForgeLiveMap } from "./ForgeLiveMap";
import { StoryRoomPanel } from "./StoryRoomPanel";
import { MobileInterviewProgress } from "./MobileInterviewProgress";
import { useGuidedInterviewController } from "./useGuidedInterviewController";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { getEditorialBlockedPrompt } from "@/lib/guided-interview/interview-ui-copy";
import { getContinueCtaLabel } from "@/lib/guided-interview/contextual-interview";
import { getInterviewProgressLabel } from "@/lib/guided-interview/interview-stages";
import { getSavedSlotLabels } from "@/lib/guided-interview/interview-memory";
import { countForgeUserAnswers } from "@/lib/guided-interview/opening-experience";
import { MobileForgeScrollShell } from "@/mobile/MobileForgeScrollShell";
import { cn } from "@/lib/utils";
import { safeDisplayText, safeQuickSuggestionLabel, safeQuickSuggestionValue } from "@/lib/safe-display-text";
import { FORGE_AUTO_ANSWER_TONE_CHIPS } from "@/lib/guided-interview/auto-answer-engine";
import type { ForgeSuggestedAnswer } from "@/lib/guided-interview/auto-answer-engine";
import { FORGE_GENRE_OPENING_QUESTION_ID } from "@/lib/guided-interview/forge-genre-catalog";
import { ForgeGenreFamilyPicker } from "./ForgeGenreFamilyPicker";
import { StudioExpressPanel } from "./StudioExpressPanel";
import { BlueprintScenariosPanel } from "./BlueprintScenariosPanel";
import { BookFoundationFlowPanel } from "./BookFoundationFlowPanel";

type GuidedInterviewPanelProps = {
  selectedGenre?: string;
  language?: string;
  penName?: string;
  authorName?: string;
  genderHint?: "m" | "f" | "neutral";
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
  penName,
  authorName,
  genderHint,
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
    penName,
    authorName,
    genderHint,
    chatFirst,
    isMobile,
    interviewOnly,
    scrollContainerRef: unifiedScroll && isMobile ? shellScrollRef : undefined,
    onComplete: onComplete as ((data: GuidedInterviewState) => void) | undefined,
    onConfirmDna,
    onContinueInterview,
  });

  const showMobileConfirmation = interviewOnly && ctrl.showDnaPanel;
  const earlyInterview = countForgeUserAnswers(ctrl.state) < 3;
  const canShowDnaUi =
    (ctrl.forgeReady.canShowConfirmation && !earlyInterview) || ctrl.blueprintReadyUi;

  const body = (
    <InterviewBody
      ctrl={ctrl}
      isMobile={isMobile}
      interviewOnly={interviewOnly}
      showMobileConfirmation={showMobileConfirmation}
      unifiedScroll={unifiedScroll && isMobile}
      canShowDnaUi={canShowDnaUi}
    />
  );

  const inputFooter = !showMobileConfirmation ? (
    <InterviewInputFooter ctrl={ctrl} isMobile={isMobile} unifiedScroll interviewOnly={interviewOnly} />
  ) : null;

  const liveMap = !interviewOnly && canShowDnaUi ? (
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

  const storyRoom = !showMobileConfirmation ? (
    <StoryRoomPanel
      state={ctrl.state}
      compact={isMobile}
      progressPct={ctrl.confidencePct}
      progressLabel={ctrl.blueprintGate.progressLabel}
      blueprintReady={ctrl.blueprintReadyUi}
    />
  ) : null;

  if (isMobile && unifiedScroll) {
    return (
      <MobileForgeScrollShell
        scrollRef={shellScrollRef}
        header={
          <>
            {forgeHeader}
            {storyRoom}
            {!showMobileConfirmation && (
              <MobileInterviewProgress
                answeredCount={ctrl.progress.answeredCount}
                total={ctrl.progress.totalCritical}
                label={getInterviewProgressLabel(ctrl.state)}
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
      {storyRoom}
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

      {(ctrl.showDnaPanel || (!isMobile && canShowDnaUi && ctrl.progress.dnaLock.confidenceScore > 0.55)) &&
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
  canShowDnaUi = false,
}: {
  ctrl: Ctrl;
  isMobile: boolean;
  interviewOnly: boolean;
  showMobileConfirmation: boolean;
  unifiedScroll: boolean;
  canShowDnaUi?: boolean;
}) {
  const showDnaInline =
    !interviewOnly &&
    canShowDnaUi &&
    ctrl.blueprintReadyUi &&
    (unifiedScroll ||
      ctrl.showDnaPanel ||
      (!isMobile && ctrl.progress.dnaLock.confidenceScore > 0.55));

  if (showMobileConfirmation) {
    return (
      <div className="space-y-4 px-4 py-5 pb-8">
        {ctrl.state.blueprintScenarios && ctrl.state.blueprintScenarios.length > 0 && (
          <BlueprintScenariosPanel
            scenarios={ctrl.state.blueprintScenarios}
            selectedId={ctrl.state.selectedBlueprintScenarioId}
            onSelect={ctrl.handleSelectBlueprintScenario}
            onModify={ctrl.handleModifyBlueprintScenario}
            compact
          />
        )}
        {ctrl.showFoundationPanel && (
          <BookFoundationFlowPanel
            state={ctrl.state}
            foundation={ctrl.bookFoundation}
            onUpdate={ctrl.handleUpdateFoundation}
            onConfirm={ctrl.handleConfirmFoundation}
            compact
          />
        )}
        {ctrl.showDnaPanel && ctrl.blueprintReadyUi && (
          <ForgeInterviewConfirmation
            dnaLock={ctrl.progress.dnaLock}
            extracted={ctrl.state.extracted}
            state={ctrl.state}
            blueprintReady={ctrl.blueprintReadyUi}
            onConfirm={ctrl.handleConfirmDna}
            onCorrect={() => ctrl.setInput("Vorrei correggere: ")}
            onRefine={ctrl.handleEnableRefine}
            onCorrectField={ctrl.handleCorrectField}
            onApplyGeneratedField={ctrl.handleApplyGeneratedField}
          />
        )}
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
      {!ctrl.blueprintReadyUi && !ctrl.showExpressPanel && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/8 px-3 py-2">
          <p className="text-xs text-white/60">Vuoi partire subito con pochi input?</p>
          <button
            type="button"
            onClick={() => ctrl.setShowExpressPanel(true)}
            className="shrink-0 rounded-full border border-violet-300/35 bg-violet-500/20 px-3 py-1.5 text-[11px] font-semibold text-violet-100"
          >
            Studio Express · crea il libro in pochi click
          </button>
        </div>
      )}

      {ctrl.showExpressPanel && (
        <StudioExpressPanel
          compact={isMobile}
          preparing={ctrl.expressPreparing}
          onSubmit={ctrl.handleApplyExpress}
          onClose={() => ctrl.setShowExpressPanel(false)}
        />
      )}

      {ctrl.expressPreparing && (
        <p className="text-center text-sm text-white/55">Scriptora sta preparando 3 libri possibili…</p>
      )}

      {ctrl.state.blueprintScenarios &&
        ctrl.state.blueprintScenarios.length > 0 &&
        ctrl.state.forgeMode === "express" &&
        !ctrl.showDnaPanel &&
        !ctrl.showFoundationPanel && (
          <BlueprintScenariosPanel
            scenarios={ctrl.state.blueprintScenarios}
            selectedId={ctrl.state.selectedBlueprintScenarioId}
            onSelect={ctrl.handleSelectBlueprintScenario}
            onModify={ctrl.handleModifyBlueprintScenario}
            compact={isMobile}
          />
        )}

      {(ctrl.showFoundationPanel || ctrl.foundationReadyUi) && (
        <BookFoundationFlowPanel
          state={ctrl.state}
          foundation={ctrl.bookFoundation}
          onUpdate={ctrl.handleUpdateFoundation}
          onConfirm={ctrl.handleConfirmFoundation}
          compact={isMobile}
        />
      )}

      {ctrl.state.messages.length <= 1 && !ctrl.showExpressPanel && (
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
          {safeDisplayText(msg.content)}
        </div>
      ))}

      {ctrl.state.lastMemoryDiff && ctrl.state.lastMemoryDiff.newlyFilledSlots.length > 0 && (
        <p className="text-[11px] font-medium text-emerald-300/85">
          Ok, lo tengo fermo: {getSavedSlotLabels(ctrl.state.lastMemoryDiff).join(", ")}
        </p>
      )}

      {ctrl.isThinking && <ThinkingBubble />}

      {!ctrl.next.done && ctrl.next.question?.helper && (
        <p className="text-xs leading-5 text-white/45">{ctrl.next.question.helper}</p>
      )}

      {!ctrl.next.done && (ctrl.next.question?.quickSuggestions?.length ?? 0) > 0 &&
        ctrl.next.question?.id !== FORGE_GENRE_OPENING_QUESTION_ID && (
        <QuickSuggestionChips ctrl={ctrl} />
      )}

      {!ctrl.next.done && ctrl.next.question?.id === FORGE_GENRE_OPENING_QUESTION_ID && (
        <ForgeGenreFamilyPicker onSelect={(value) => ctrl.sendMessage(value)} />
      )}

      {ctrl.ready && !ctrl.showDnaPanel && !unifiedScroll && (
        <div className="rounded-[22px] border border-emerald-400/25 bg-emerald-500/10 p-4 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
            Credo di aver capito il tuo libro
          </p>
          <p className="mt-1 text-sm text-white/75">
            {ctrl.forgeReady.humanGapMessage ??
              "Se ti risuona, possiamo bloccare il DNA e passare all'indice."}
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
  const expressScenarioPhase =
    ctrl.state.forgeMode === "express" &&
    (ctrl.state.blueprintScenarios?.length ?? 0) > 0 &&
    !ctrl.showDnaPanel;

  return (
    <div
      className={cn(
        "scriptora-forge-interview-stage relative mx-auto w-full max-w-lg",
        unifiedScroll ? "px-4 py-4 pb-4" : "px-4 py-4",
      )}
    >
      <div className="scriptora-forge-question-glow pointer-events-none absolute inset-x-6 top-8 h-40 rounded-full bg-violet-500/20 blur-3xl" aria-hidden />

      {!ctrl.blueprintReadyUi && !ctrl.showExpressPanel && !expressScenarioPhase && (
        <div className="relative mb-4 flex flex-col gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/8 px-3 py-3">
          <p className="text-xs leading-5 text-white/60">Vuoi partire subito con pochi input?</p>
          <button
            type="button"
            onClick={() => ctrl.setShowExpressPanel(true)}
            className="w-full rounded-xl border border-violet-300/35 bg-violet-500/20 px-3 py-2.5 text-xs font-semibold text-violet-100"
          >
            Studio Express · crea il libro in pochi click
          </button>
        </div>
      )}

      {ctrl.showExpressPanel && (
        <div className="relative mb-4">
          <StudioExpressPanel
            compact
            preparing={ctrl.expressPreparing}
            onSubmit={ctrl.handleApplyExpress}
            onClose={() => ctrl.setShowExpressPanel(false)}
          />
        </div>
      )}

      {ctrl.expressPreparing && (
        <p className="relative mb-4 text-center text-sm text-white/55">
          Scriptora sta preparando 3 libri possibili…
        </p>
      )}

      {expressScenarioPhase && (
        <div className="relative mb-4">
          <BlueprintScenariosPanel
            scenarios={ctrl.state.blueprintScenarios!}
            selectedId={ctrl.state.selectedBlueprintScenarioId}
            onSelect={ctrl.handleSelectBlueprintScenario}
            onModify={ctrl.handleModifyBlueprintScenario}
            compact
          />
        </div>
      )}

      {!expressScenarioPhase && !ctrl.showExpressPanel && (
        <>
          {lastUserReply && (
            <p className="relative mb-3 line-clamp-2 text-right text-[11px] leading-5 text-white/40">
              Tu: {safeDisplayText(lastUserReply)}
            </p>
          )}

          {ctrl.state.lastMemoryDiff && ctrl.state.lastMemoryDiff.newlyFilledSlots.length > 0 && (
            <p className="relative mb-3 text-[11px] font-medium text-emerald-300/85">
              Ok, lo tengo fermo: {getSavedSlotLabels(ctrl.state.lastMemoryDiff).join(", ")}
            </p>
          )}

          <div className="scriptora-forge-question-card relative animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200/90">
              Scriptora
            </p>
            <p className="mt-2 text-[1.05rem] font-medium leading-7 text-white sm:text-lg">
              {safeDisplayText(currentQuestion)}
            </p>
            {empathicLine && (
              <p className="mt-2.5 text-sm leading-6 text-violet-100/55">{safeDisplayText(empathicLine)}</p>
            )}
          </div>

          {ctrl.isThinking ? (
            <div className="relative mt-4">
              <UnderstandingPulse />
            </div>
          ) : ctrl.next.question?.id === FORGE_GENRE_OPENING_QUESTION_ID ? (
            <div className="relative mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                Scegli famiglia e genere
              </p>
              <ForgeGenreFamilyPicker onSelect={(value) => ctrl.sendMessage(value)} />
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
        </>
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
      Scriptora sta mettendo a fuoco…
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
        Scriptora sta mettendo a fuoco…
      </span>
    </div>
  );
}

function QuickSuggestionChips({ ctrl, premium }: { ctrl: Ctrl; premium?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 pt-0.5">
      {ctrl.next.question!.quickSuggestions!.map((chip, index) => {
        const label = safeQuickSuggestionLabel(chip);
        const value = safeQuickSuggestionValue(chip);
        if (!label) return null;
        return (
          <button
            key={`${label}-${index}`}
            type="button"
            onClick={() => ctrl.sendMessage(value)}
            className={cn(
              "text-left text-[11px] font-medium transition active:scale-[0.98]",
              premium
                ? "scriptora-forge-quick-chip rounded-2xl px-3.5 py-2.5 text-violet-50/90"
                : "rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-white/80 hover:border-violet-300/40 hover:bg-violet-500/15",
            )}
          >
            {label}
          </button>
        );
      })}
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
  const hasOptions = ctrl.autoAnswerOptions.length === 3;
  const busy = ctrl.isThinking || ctrl.autoAnswerLoading;
  const blueprintReady = ctrl.blueprintReadyUi;
  const expressScenarioPhase =
    ctrl.state.forgeMode === "express" &&
    (ctrl.state.blueprintScenarios?.length ?? 0) > 0 &&
    !ctrl.showDnaPanel;

  if (ctrl.showExpressPanel || ctrl.expressPreparing || expressScenarioPhase) {
    return null;
  }

  if (blueprintReady && !ctrl.state.forgeRefineMode) {
    return (
      <div
        className={cn(
          "scriptora-forge-input-footer shrink-0 border-t border-white/10 px-4 py-3 backdrop-blur-md",
          unifiedScroll ? "pb-3" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
      >
        <button
          type="button"
          onClick={ctrl.handleConfirmDna}
          className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white"
        >
          Conferma e genera blueprint
        </button>
        <button
          type="button"
          onClick={ctrl.handleEnableRefine}
          className="mt-2 w-full rounded-2xl border border-white/10 px-4 py-2.5 text-xs font-medium text-white/45"
        >
          Continua a rifinire
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "scriptora-forge-input-footer shrink-0 border-t border-white/10 px-4 py-3 backdrop-blur-md",
        unifiedScroll ? "pb-3" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
    >
      {interviewOnly && !hasOptions && (
        <p className="mb-2 text-[10px] font-medium tracking-wide text-white/40">
          Oppure raccontamelo con parole tue…
        </p>
      )}
      {ctrl.speech.error && (
        <p className="mb-2 text-[11px] text-amber-300">{ctrl.speech.error}</p>
      )}
      {ctrl.submitError && (
        <p className="mb-2 rounded-xl border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
          {ctrl.submitError}
        </p>
      )}
      {ctrl.speech.isListening && (
        <p className="mb-2 animate-pulse text-[11px] font-medium text-violet-300">
          🎙️ Scriptora ti sta ascoltando…
        </p>
      )}
      {hasOptions && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/80">
              Scegli una direzione
            </p>
            <button
              type="button"
              onClick={() => ctrl.generateAutoAnswer(true)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-2 py-1 text-[10px] font-semibold text-white/70 hover:bg-white/10 disabled:opacity-40"
            >
              {ctrl.autoAnswerLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Rigenera
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {ctrl.autoAnswerOptions.map((option) => (
              <SuggestedAnswerCard
                key={option.id}
                option={option}
                disabled={busy}
                onSelect={() => ctrl.handleSelectSuggestedAnswer(option)}
              />
            ))}
          </div>
        </div>
      )}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {FORGE_AUTO_ANSWER_TONE_CHIPS.map((chip) => (
          <button
            key={chip.id ?? "none"}
            type="button"
            disabled={busy}
            onClick={() =>
              ctrl.setAutoAnswerToneBias(
                ctrl.autoAnswerToneBias === chip.id ? null : chip.id,
              )
            }
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-medium transition disabled:opacity-40",
              ctrl.autoAnswerToneBias === chip.id
                ? "border-violet-300/50 bg-violet-500/20 text-violet-100"
                : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
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
          disabled={!ctrl.input.trim() || busy}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-500 text-white disabled:opacity-40"
          aria-label="Conferma"
          title="Invia risposta manuale"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {!hasOptions && !blueprintReady && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => ctrl.generateAutoAnswer(false)}
            disabled={busy || ctrl.next.done}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-violet-300/35 bg-violet-500/15 px-3 py-2 text-[11px] font-semibold text-violet-100 transition hover:bg-violet-500/25 disabled:opacity-40"
          >
            {ctrl.autoAnswerLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Genera 3 risposte
          </button>
        </div>
      )}
    </div>
  );
}

const STRATEGY_LABELS: Record<ForgeSuggestedAnswer["strategy"], string> = {
  safe: "Safe",
  commercial: "Commercial",
  bold: "Bold",
};

const STRATEGY_STYLES: Record<ForgeSuggestedAnswer["strategy"], string> = {
  safe: "border-emerald-400/25 bg-emerald-500/10",
  commercial: "border-sky-400/25 bg-sky-500/10",
  bold: "border-amber-400/30 bg-amber-500/10",
};

function SuggestedAnswerCard({
  option,
  disabled,
  onSelect,
}: {
  option: ForgeSuggestedAnswer;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={cn(
        "flex min-h-[120px] flex-col rounded-2xl border p-3",
        STRATEGY_STYLES[option.strategy],
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
        {STRATEGY_LABELS[option.strategy]}
      </p>
      <p className="mt-2 flex-1 text-[11px] leading-5 text-white/85 line-clamp-5">
        {option.text}
      </p>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className="mt-3 w-full rounded-xl bg-violet-500 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-violet-400 disabled:opacity-40"
      >
        Usa questa risposta
      </button>
    </article>
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
