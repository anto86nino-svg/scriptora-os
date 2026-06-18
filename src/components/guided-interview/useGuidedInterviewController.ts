import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
  getInterviewProgress,
  getNextInterviewQuestion,
  resolveActiveInterviewQuestion,
  resumeInterview,
} from "@/lib/guided-interview/question-engine";
import { FORGE_OPENING_QUESTION_ID, isFirstForgeAssistantMessage } from "@/lib/guided-interview/opening-experience";
import { getWelcomeInterviewQuestion } from "@/lib/guided-interview/interview-stages";
import { evaluateForgeReadiness } from "@/lib/guided-interview/forge-readiness";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { saveForgeDnaLock } from "@/lib/guided-interview/interview-state";
import { finalizeForgeForBlueprint } from "@/lib/guided-interview/forge-evolution-engine";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import {
  generateForgeAutoAnswer,
  type ForgeAutoAnswerToneBias,
  type ForgeSuggestedAnswer,
} from "@/lib/guided-interview/auto-answer-engine";
import {
  BLUEPRINT_READY_ASSISTANT_MESSAGE,
  getBlueprintGateStatus,
} from "@/lib/guided-interview/blueprint-ready-gate";
import { buildExpressForgeConfiguration } from "@/lib/guided-interview/express-forge-config";
import type { ExpressForgeInput } from "@/lib/guided-interview/express-forge-types";
import {
  applyExpressScenarioToState,
  buildCompleteExpressBookPackage,
  type ExpressBookScenario,
} from "@/lib/guided-interview/express-book-package";
import {
  applyBlueprintReadySummaryToState,
  type BlueprintEditorialField,
} from "@/lib/guided-interview/blueprint-ready-summary";

import type { ForgeHostContext } from "@/lib/guided-interview/forge-host-engine";

export type UseGuidedInterviewOptions = {
  selectedGenre?: string;
  language?: string;
  penName?: string;
  authorName?: string;
  genderHint?: "m" | "f" | "neutral";
  chatFirst?: boolean;
  isMobile?: boolean;
  /** Mobile Book Forge: hide DNA engine UI until final confirmation. */
  interviewOnly?: boolean;
  onComplete?: (data: GuidedInterviewState) => void;
  onConfirmDna?: (state: GuidedInterviewState) => void;
  onContinueInterview?: () => void;
  /** Ref to the single external scroll container (mobile unified shell). */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
};

export function useGuidedInterviewController({
  selectedGenre,
  language = "Italian",
  penName,
  authorName,
  genderHint,
  chatFirst = true,
  isMobile = false,
  interviewOnly = false,
  onComplete,
  onConfirmDna,
  onContinueInterview,
  scrollContainerRef,
}: UseGuidedInterviewOptions) {
  const hostContext: ForgeHostContext = { penName, authorName, genderHint };

  const [state, setState] = useState(() =>
    getInitialInterviewState({
      selectedGenre,
      chatFirst: chatFirst && !selectedGenre,
      hostContext,
    }),
  );
  const [input, setInput] = useState("");
  const [showDnaPanel, setShowDnaPanel] = useState(false);
  const [dnaConfirmationDismissed, setDnaConfirmationDismissed] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [autoAnswerLoading, setAutoAnswerLoading] = useState(false);
  const [autoAnswerOptions, setAutoAnswerOptions] = useState<ForgeSuggestedAnswer[]>([]);
  const [autoAnswerVariantCount, setAutoAnswerVariantCount] = useState(0);
  const [autoAnswerError, setAutoAnswerError] = useState<string | null>(null);
  const [autoAnswerToneBias, setAutoAnswerToneBias] = useState<ForgeAutoAnswerToneBias>(null);
  const [continueNonce, setContinueNonce] = useState(0);
  const [showExpressPanel, setShowExpressPanel] = useState(false);
  const [expressPreparing, setExpressPreparing] = useState(false);
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastQuestionIdRef = useRef<string | null>(null);
  const lastQuestionTextRef = useRef<string | null>(null);
  const blueprintMessageInjectedRef = useRef(false);

  const speech = useSpeechDictation(language);

  useEffect(() => {
    setState(
      getInitialInterviewState({
        selectedGenre,
        chatFirst: chatFirst && !selectedGenre,
        hostContext,
      }),
    );
    setShowDnaPanel(false);
    setDnaConfirmationDismissed(false);
    setContinueNonce(0);
    setAutoAnswerOptions([]);
    setAutoAnswerVariantCount(0);
    setAutoAnswerError(null);
    setAutoAnswerToneBias(null);
    lastQuestionIdRef.current = null;
    lastQuestionTextRef.current = null;
  }, [selectedGenre, chatFirst, penName, authorName, genderHint]);

  const rawNext = useMemo(() => getNextInterviewQuestion(state), [state]);
  const next = useMemo(
    () =>
      resolveActiveInterviewQuestion(state, rawNext, {
        continueNonce,
        avoidQuestionId: lastQuestionIdRef.current,
      }),
    [state, rawNext, continueNonce],
  );

  useEffect(() => {
    setAutoAnswerOptions([]);
    setAutoAnswerVariantCount(0);
    setAutoAnswerError(null);
  }, [next.question?.id]);
  const progress = useMemo(() => getInterviewProgress(state), [state]);
  const forgeReady = useMemo(() => evaluateForgeReadiness(state), [state]);
  const blueprintGate = useMemo(() => getBlueprintGateStatus(state), [state]);
  const blueprintReadyUi =
    blueprintGate.isBlueprintReady && blueprintGate.shouldStopQuestions;
  const ready =
    (progress.dnaLock.readyForBlueprint && forgeReady.ready) ||
    (blueprintGate.isBlueprintReady && blueprintGate.canShowConfirmation);

  useEffect(() => {
    if (!blueprintReadyUi || blueprintMessageInjectedRef.current) return;
    blueprintMessageInjectedRef.current = true;
    setState((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: `assistant-blueprint-ready-${Date.now()}`,
          role: "assistant",
          content: BLUEPRINT_READY_ASSISTANT_MESSAGE,
          createdAt: Date.now(),
        },
      ],
    }));
  }, [blueprintReadyUi]);

  useEffect(() => {
    if (!next.question || next.done) return;
    if (blueprintReadyUi && !next.question.id.startsWith("blueprint-gap-")) return;
    if (
      lastQuestionIdRef.current === next.question.id &&
      lastQuestionTextRef.current === next.question.question
    ) {
      return;
    }
    if (
      (next.question.id === FORGE_OPENING_QUESTION_ID ||
        next.question.id === "chat-first-opening") &&
      state.messages.some((m) => m.role === "assistant")
    ) {
      lastQuestionIdRef.current = next.question.id;
      lastQuestionTextRef.current = next.question.question;
      return;
    }
    lastQuestionIdRef.current = next.question.id;
    lastQuestionTextRef.current = next.question.question;
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
  }, [next.question, next.done, state.messages]);

  const scrollToEnd = () => {
    const el = scrollContainerRef?.current ?? internalScrollRef.current;
    if (!el || typeof el.scrollTo !== "function") return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const focusInput = () => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      scrollToEnd();
    });
  };

  useEffect(() => {
    scrollToEnd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.messages.length, showDnaPanel, isThinking, next.question?.id]);

  useEffect(() => {
    if (!isMobile && !interviewOnly) return;
    if (blueprintReadyUi && !showDnaPanel && !dnaConfirmationDismissed) {
      setShowDnaPanel(true);
    }
  }, [blueprintReadyUi, isMobile, interviewOnly, showDnaPanel, dnaConfirmationDismissed]);

  useEffect(() => {
    if (!isMobile) return;
    if (ready && !showDnaPanel && !dnaConfirmationDismissed) {
      setShowDnaPanel(true);
    }
  }, [ready, isMobile, showDnaPanel, dnaConfirmationDismissed]);

  useEffect(() => {
    if (rawNext.done && ready) {
      onComplete?.(state);
      saveForgeDnaLock(state);
    }
  }, [rawNext.done, ready, onComplete, state]);

  const sendMessage = (text?: string) => {
    const payload = clean(text ?? input);
    if (!payload || isThinking) return;
    if (next.done && ready) return;

    setIsThinking(true);
    window.setTimeout(() => {
      const updated = applyInterviewAnswer(state, payload, next.question ?? undefined);
      setState(updated);
      setInput("");
      setAutoAnswerOptions([]);
      setAutoAnswerVariantCount(0);
      setAutoAnswerError(null);
      setIsThinking(false);
      if (speech.isListening) speech.stop();
    }, 480);
  };

  const generateAutoAnswer = async (regenerate = false) => {
    const question =
      next.question ??
      (isFirstForgeAssistantMessage(state) ? getWelcomeInterviewQuestion(state) : null);
    if (!question || autoAnswerLoading || isThinking || next.done || blueprintReadyUi) return;

    const variantIndex = regenerate ? autoAnswerVariantCount + 1 : 0;
    setAutoAnswerLoading(true);
    setAutoAnswerError(null);

    try {
      const result = await generateForgeAutoAnswer({
        state,
        question,
        language,
        variantIndex,
        toneBias: autoAnswerToneBias,
      });
      setAutoAnswerOptions(result.answers);
      setAutoAnswerVariantCount(variantIndex);
      scrollToEnd();
    } catch {
      setAutoAnswerError(null);
    } finally {
      setAutoAnswerLoading(false);
    }
  };

  const handleSelectSuggestedAnswer = (selected: ForgeSuggestedAnswer) => {
    if (!selected.text.trim() || isThinking || autoAnswerLoading) return;
    setAutoAnswerOptions([]);
    sendMessage(selected.text);
  };

  const handleContinueInterview = () => {
    if (ready || blueprintReadyUi) {
      setShowDnaPanel(true);
      setDnaConfirmationDismissed(false);
      onContinueInterview?.();
      return;
    }

    if (input.trim()) {
      sendMessage(input);
      return;
    }

    const questionToAvoid = next.question;
    if (questionToAvoid) {
      lastQuestionIdRef.current = questionToAvoid.id;
      lastQuestionTextRef.current = questionToAvoid.question;
    }

    setState((prev) => ({ ...resumeInterview(prev), forgeRefineMode: true }));
    setShowDnaPanel(false);
    setDnaConfirmationDismissed(true);
    setContinueNonce((n) => n + 1);
    focusInput();
    onContinueInterview?.();
  };

  const handleEnableRefine = () => {
    setState((prev) => ({ ...prev, forgeRefineMode: true }));
    setShowDnaPanel(false);
    setDnaConfirmationDismissed(true);
    setContinueNonce((n) => n + 1);
    focusInput();
  };

  const handleApplyExpress = (input: ExpressForgeInput) => {
    setExpressPreparing(true);
    window.setTimeout(() => {
      const result = buildExpressForgeConfiguration(input, state);
      setState(result.state);
      setShowExpressPanel(false);
      setShowDnaPanel(false);
      setDnaConfirmationDismissed(false);
      setExpressPreparing(false);
      blueprintMessageInjectedRef.current = false;
    }, 420);
  };

  const handleSelectBlueprintScenario = (scenario: ExpressBookScenario) => {
    setState((prev) => applyExpressScenarioToState(prev, scenario));
    setShowDnaPanel(true);
    setDnaConfirmationDismissed(false);
    setShowExpressPanel(false);
  };

  const handleModifyBlueprintScenario = (
    scenario: ExpressBookScenario,
    tone: "darker" | "commercial" | "poetic",
  ) => {
    const base = state.expressConfig;
    if (!base) return;
    const variant =
      tone === "commercial" ? "commercial" : tone === "darker" ? "bold" : "safe";
    const toneMap = { darker: "oscuro", commercial: "commerciale", poetic: "poetico" } as const;
    const rebuilt = {
      ...buildCompleteExpressBookPackage(
        { ...base, tone: toneMap[tone], ideaSeed: base.ideaSeed || base.protagonistSeed || "" },
        variant,
      ),
      id: scenario.id,
    };
    setState((prev) => ({
      ...prev,
      blueprintScenarios: (prev.blueprintScenarios ?? []).map((s) =>
        s.id === scenario.id ? rebuilt : s,
      ),
    }));
  };

  const handleConfirmDna = () => {
    if (!ready && !blueprintGate.canShowConfirmation) return;
    const normalized = applyBlueprintReadySummaryToState(state);
    const finalized = finalizeForgeForBlueprint(normalized);
    setState(finalized);
    saveForgeDnaLock(finalized);
    onConfirmDna?.(finalized);
  };

  const handleApplyGeneratedField = (field: BlueprintEditorialField, value: string) => {
    setState((prev) => {
      const extracted = { ...prev.extracted };
      const titleIntelligence = { ...prev.titleIntelligence };
      if (field === "openingHook") {
        extracted.openingHook = value;
        titleIntelligence.commercialHook = value;
      }
      if (field === "bookSubtitle") {
        extracted.bookSubtitle = value;
        titleIntelligence.subtitle = value;
      }
      if (field === "promise") extracted.promise = value;
      if (field === "centralConflict") extracted.centralConflict = value;
      if (field === "readerTransformation") extracted.readerTransformation = value;
      if (field === "bookTitle") extracted.bookTitle = value;
      if (field === "endingDirection") extracted.narrativeDrive = value;
      return applyBlueprintReadySummaryToState({ ...prev, extracted, titleIntelligence });
    });
  };

  const handleCorrectField = (_field: BlueprintEditorialField, prompt: string) => {
    setShowDnaPanel(false);
    setDnaConfirmationDismissed(true);
    setState((prev) => ({ ...prev, forgeRefineMode: true }));
    setInput(prompt);
    setContinueNonce((n) => n + 1);
    focusInput();
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

  return {
    state,
    input,
    setInput,
    inputRef,
    showDnaPanel,
    isThinking,
    internalScrollRef,
    speech,
    next,
    rawNext,
    progress,
    forgeReady,
    blueprintGate,
    blueprintReadyUi,
    ready,
    confidencePct: progress.stagePercent,
    showExpressPanel,
    setShowExpressPanel,
    expressPreparing,
    sendMessage,
    handleContinueInterview,
    handleEnableRefine,
    handleApplyExpress,
    handleSelectBlueprintScenario,
    handleModifyBlueprintScenario,
    handleConfirmDna,
    handleApplyGeneratedField,
    handleCorrectField,
    toggleMic,
    focusInput,
    autoAnswerLoading,
    autoAnswerOptions,
    autoAnswerVariantCount,
    autoAnswerError,
    autoAnswerToneBias,
    setAutoAnswerToneBias,
    generateAutoAnswer,
    handleSelectSuggestedAnswer,
  };
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
