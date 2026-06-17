import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
  getInterviewProgress,
  getNextInterviewQuestion,
  OPENING_ASSISTANT_MESSAGE,
  resumeInterview,
} from "@/lib/guided-interview/question-engine";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { saveForgeDnaLock } from "@/lib/guided-interview/interview-state";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";

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
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const lastQuestionIdRef = useRef<string | null>(null);

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
    lastQuestionIdRef.current = null;
  }, [selectedGenre, chatFirst]);

  const next = useMemo(() => getNextInterviewQuestion(state), [state]);
  const progress = useMemo(() => getInterviewProgress(state), [state]);
  const ready = progress.dnaLock.readyForBlueprint;

  useEffect(() => {
    if (!next.question || next.done) return;
    if (lastQuestionIdRef.current === next.question.id) return;
    if (
      next.question.id === "chat-first-opening" &&
      state.messages.some((m) => m.content === OPENING_ASSISTANT_MESSAGE)
    ) {
      lastQuestionIdRef.current = next.question.id;
      return;
    }
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
  }, [next.question, next.done, state.messages]);

  const scrollToEnd = () => {
    const el = scrollContainerRef?.current ?? internalScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  useEffect(() => {
    scrollToEnd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.messages.length, showDnaPanel, isThinking]);

  useEffect(() => {
    if (!isMobile) return;
    if (ready && !showDnaPanel) {
      setShowDnaPanel(true);
      setDnaConfirmationDismissed(false);
    }
  }, [ready, isMobile, showDnaPanel]);

  useEffect(() => {
    if (next.done && ready) {
      onComplete?.(state);
      saveForgeDnaLock(state);
    }
  }, [next.done, ready, onComplete, state]);

  const sendMessage = (text?: string) => {
    const payload = clean(text ?? input);
    if (!payload || next.done) return;
    setIsThinking(true);
    window.setTimeout(() => {
      const updated = applyInterviewAnswer(state, payload);
      setState(updated);
      setInput("");
      setIsThinking(false);
      if (speech.isListening) speech.stop();
    }, 480);
  };

  const handleContinueInterview = () => {
    setState((prev) => resumeInterview(prev));
    setShowDnaPanel(false);
    setDnaConfirmationDismissed(true);
    onContinueInterview?.();
  };

  const handleConfirmDna = () => {
    if (!ready) return;
    saveForgeDnaLock(state);
    onConfirmDna?.(state);
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
    showDnaPanel,
    isThinking,
    internalScrollRef,
    speech,
    next,
    progress,
    ready,
    confidencePct: Math.round(progress.confidence * 100),
    sendMessage,
    handleContinueInterview,
    handleConfirmDna,
    toggleMic,
  };
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
