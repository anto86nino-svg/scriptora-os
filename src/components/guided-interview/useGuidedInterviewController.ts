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
} from "@/lib/guided-interview/auto-answer-engine";

export type UseGuidedInterviewOptions = {
  selectedGenre?: string;
  language?: string;
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
  chatFirst = true,
  isMobile = false,
  onComplete,
  onConfirmDna,
  onContinueInterview,
  scrollContainerRef,
}: UseGuidedInterviewOptions) {
  const [state, setState] = useState(() =>
    getInitialInterviewState({
      selectedGenre,
      chatFirst: chatFirst && !selectedGenre,
    }),
  );
  const [input, setInput] = useState("");
  const [showDnaPanel, setShowDnaPanel] = useState(false);
  const [dnaConfirmationDismissed, setDnaConfirmationDismissed] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [autoAnswerLoading, setAutoAnswerLoading] = useState(false);
  const [autoAnswerDraft, setAutoAnswerDraft] = useState<string | null>(null);
  const [autoAnswerVariantCount, setAutoAnswerVariantCount] = useState(0);
  const [autoAnswerError, setAutoAnswerError] = useState<string | null>(null);
  const [autoAnswerToneBias, setAutoAnswerToneBias] = useState<ForgeAutoAnswerToneBias>(null);
  const [continueNonce, setContinueNonce] = useState(0);
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastQuestionIdRef = useRef<string | null>(null);
  const lastQuestionTextRef = useRef<string | null>(null);

  const speech = useSpeechDictation(language);

  useEffect(() => {
    setState(
      getInitialInterviewState({
        selectedGenre,
        chatFirst: chatFirst && !selectedGenre,
      }),
    );
    setShowDnaPanel(false);
    setDnaConfirmationDismissed(false);
    setContinueNonce(0);
    setAutoAnswerDraft(null);
    setAutoAnswerVariantCount(0);
    setAutoAnswerError(null);
    setAutoAnswerToneBias(null);
    lastQuestionIdRef.current = null;
    lastQuestionTextRef.current = null;
  }, [selectedGenre, chatFirst]);

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
    setAutoAnswerDraft(null);
    setAutoAnswerVariantCount(0);
    setAutoAnswerError(null);
  }, [next.question?.id]);
  const progress = useMemo(() => getInterviewProgress(state), [state]);
  const forgeReady = useMemo(() => evaluateForgeReadiness(state), [state]);
  const ready = progress.dnaLock.readyForBlueprint && forgeReady.ready;

  useEffect(() => {
    if (!next.question || next.done) return;
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
      setAutoAnswerDraft(null);
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
    if (!question || autoAnswerLoading || isThinking || next.done) return;

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
      setInput(result.answer);
      setAutoAnswerDraft(result.answer);
      setAutoAnswerVariantCount(variantIndex);
      focusInput();
    } catch {
      setAutoAnswerError(null);
    } finally {
      setAutoAnswerLoading(false);
    }
  };

  const handleContinueInterview = () => {
    if (ready) {
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

    setState((prev) => resumeInterview(prev));
    setShowDnaPanel(false);
    setDnaConfirmationDismissed(true);
    setContinueNonce((n) => n + 1);
    focusInput();
    onContinueInterview?.();
  };

  const handleConfirmDna = () => {
    if (!ready) return;
    const finalized = finalizeForgeForBlueprint(state);
    setState(finalized);
    saveForgeDnaLock(finalized);
    onConfirmDna?.(finalized);
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
    ready,
    confidencePct: Math.round(progress.confidence * 100),
    sendMessage,
    handleContinueInterview,
    handleConfirmDna,
    toggleMic,
    focusInput,
    autoAnswerLoading,
    autoAnswerDraft,
    autoAnswerVariantCount,
    autoAnswerError,
    autoAnswerToneBias,
    setAutoAnswerToneBias,
    generateAutoAnswer,
  };
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
