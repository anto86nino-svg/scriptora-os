import { useEffect, useMemo, useState } from "react";
import { BookDnaConfirmationPanel } from "./BookDnaConfirmationPanel";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
  getNextInterviewQuestion,
} from "@/lib/guided-interview/question-engine";

type GuidedInterviewPanelProps = {
  selectedGenre?: string;
  onComplete?: (data: any) => void;
  onConfirmDna?: () => void;
  onContinueInterview?: () => void;
};

export function GuidedInterviewPanel({
  selectedGenre,
  onComplete,
  onConfirmDna,
  onContinueInterview,
}: GuidedInterviewPanelProps) {
  const [state, setState] = useState(() =>
    getInitialInterviewState({
      selectedGenre,
    })
  );

  useEffect(() => {
    setState(
      getInitialInterviewState({
        selectedGenre,
      })
    );
  }, [selectedGenre]);

  const [input, setInput] = useState("");

  const next = useMemo(
    () => getNextInterviewQuestion(state),
    [state]
  );

  useEffect(() => {
    if (next.done) {
      onComplete?.(state);
    }
  }, [next.done, onComplete, state]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const updatedState = applyInterviewAnswer(
      state,
      input.trim()
    );

    setState(updatedState);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col rounded-[28px] border border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="border-b border-white/10 p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-300/70">
          Scriptora Guided Interview
        </p>

        <h2 className="mt-2 text-2xl font-bold text-white">
          Raccontami il libro che hai dentro
        </h2>

        <p className="mt-2 text-sm text-white/60">
          Scriptora sta già costruendo il blueprint mentre parli.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {!next.done && next.question && (
          <div className="max-w-[90%] rounded-[28px] rounded-tl-md bg-violet-500/20 p-4 text-white">
            <p className="text-sm font-medium">
              {next.question.question}
            </p>

            {next.question.helper && (
              <p className="mt-2 text-xs text-white/60">
                {next.question.helper}
              </p>
            )}
          </div>
        )}

        {state.currentStep > 0 && (
          <div className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
              Scriptora sta capendo il tuo libro
            </p>

            <div className="mt-3 space-y-2 text-sm text-white/70">
              {state.extracted.readerTransformation && (
                <p>
                  ✅ Trasformazione:{" "}
                  {state.extracted.readerTransformation}
                </p>
              )}

              {state.extracted.centralConflict && (
                <p>
                  ✅ Conflitto:{" "}
                  {state.extracted.centralConflict}
                </p>
              )}

              {state.extracted.emotionalTone && (
                <p>
                  ✅ Tono emotivo:{" "}
                  {state.extracted.emotionalTone}
                </p>
              )}
            </div>
          </div>
        )}

        {next.done && (
          <div className="rounded-[28px] border border-cyan-400/20 bg-cyan-500/10 p-5 text-white">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
              Blueprint Ready
            </p>

            <h3 className="mt-2 text-xl font-semibold">
              Ho capito il tuo libro.
            </h3>

            <p className="mt-2 text-sm text-white/70">
              Scriptora ha già preparato struttura,
              tensione narrativa e direzione editoriale.
            </p>
          </div>
        )}
      </div>

      {!next.done && (
        <div className="border-t border-white/10 p-4">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                next.question?.placeholder ||
                "Scrivi liberamente..."
              }
              rows={3}
              className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white outline-none"
            />

            <button
              onClick={sendMessage}
              className="rounded-2xl bg-violet-500 px-5 py-3 font-semibold text-white hover:opacity-90"
            >
              →
            </button>
          </div>
        </div>
      )}

      <BookDnaConfirmationPanel
        dnaLock={state.dnaLock}
        onContinueInterview={onContinueInterview}
        onConfirmDna={onConfirmDna}
      />

    </div>
  );
}
