import { useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { StudioLaunchPayload } from "@/lib/book-config-studio/types";
import { AuthorProposalScreen } from "@/components/one-flow/AuthorProposalScreen";
import {
  answerOneFlowQuestion,
  applyProposalEditIntent,
  prepareOneFlowWriterPackage,
  skipToProposalIfReady,
  startOneFlowSession,
  type OneFlowSession,
} from "@/lib/one-flow/ScriptoraOneFlowOrchestrator";
import { getUserFriendlyError } from "@/lib/user-friendly-error";

type Props = {
  open: boolean;
  initialIdea: string;
  genreHint?: string;
  language?: string;
  onClose: () => void;
  onApprove: (payload: StudioLaunchPayload) => void;
  onDeepenCharacters?: (session: OneFlowSession) => void;
};

export function OneFlowOverlay({
  open,
  initialIdea,
  genreHint,
  language = "Italiano",
  onClose,
  onApprove,
  onDeepenCharacters,
}: Props) {
  const [session, setSession] = useState<OneFlowSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [booting, setBooting] = useState(false);
  const [generatingBlueprint, setGeneratingBlueprint] = useState(false);
  const [approving, setApproving] = useState(false);

  const [pendingIdea, setPendingIdea] = useState("");

  const bootstrap = useCallback((idea: string) => {
    setBooting(true);
    try {
      let next = startOneFlowSession(idea, { genreHint, language });
      next = skipToProposalIfReady(next);
      setSession(next);
      setAnswer("");
    } catch (error) {
      toast.error(getUserFriendlyError(error, { fallback: "Non sono riuscito ad avviare One Flow." }));
      onClose();
    } finally {
      setBooting(false);
    }
  }, [genreHint, language, onClose]);

  useEffect(() => {
    if (!open) {
      setSession(null);
      setAnswer("");
      setPendingIdea("");
      return;
    }
    if (initialIdea.trim()) {
      bootstrap(initialIdea);
    }
  }, [open, bootstrap, initialIdea]);

  useEffect(() => {
    if (!open || !session || session.phase !== "proposal" || session.blueprint) return;
    setGeneratingBlueprint(true);
    try {
      const { session: ready } = prepareOneFlowWriterPackage(session);
      setSession(ready);
    } catch (error) {
      toast.error(getUserFriendlyError(error, { fallback: "Blueprint non generato." }));
    } finally {
      setGeneratingBlueprint(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session?.phase, session?.rawIdea, session?.proposal?.title, session?.blueprint]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submitAnswer = () => {
    if (!session?.currentQuestion || !answer.trim()) return;
    const next = skipToProposalIfReady(answerOneFlowQuestion(session, answer));
    setSession(next);
    setAnswer("");
  };

  const handleApplyEdit = (text: string) => {
    if (!session) return;
    const next = applyProposalEditIntent(session, text);
    setSession({ ...next, blueprint: null, config: null });
    toast.success("Proposta aggiornata.");
  };

  const handleApprove = () => {
    if (!session) return;
    setApproving(true);
    try {
      const { session: ready, payload } = prepareOneFlowWriterPackage(session);
      if (!payload) {
        toast.error(ready.blockingIssues[0] || "Proposta non ancora pronta per la scrittura.");
        setSession(ready);
        return;
      }
      onApprove(payload);
      onClose();
    } catch (error) {
      toast.error(getUserFriendlyError(error, { fallback: "Approvazione non completata." }));
    } finally {
      setApproving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-black/70 p-3 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        aria-label="Chiudi"
        className="fixed inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 mx-auto w-full max-w-4xl max-h-[min(92dvh,920px)] overflow-y-auto overscroll-contain pt-2 sm:my-auto sm:pt-0">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 right-0 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/50 text-white/80 transition hover:bg-black/70 sm:-right-2 sm:-top-2"
        >
          <X className="h-4 w-4" />
        </button>

        {!session && !booting && !initialIdea.trim() ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/92 p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200/80">One Flow</p>
            <h3 className="mt-2 text-lg font-bold text-white">Da dove partiamo?</h3>
            <p className="mt-2 text-sm text-white/55">
              Descrivi l&apos;idea del libro — anche grezza. Scriptora costruisce titolo, promessa e blueprint.
            </p>
            <textarea
              value={pendingIdea}
              onChange={(e) => setPendingIdea(e.target.value)}
              rows={4}
              placeholder="Descrivi la tua idea, anche in modo grezzo..."
              className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-sky-300/40"
            />
            <button
              type="button"
              onClick={() => bootstrap(pendingIdea.trim())}
              disabled={pendingIdea.trim().length < 6}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              Inizia One Flow
            </button>
          </div>
        ) : booting || !session ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-8 text-center">
            <Loader2 className="h-9 w-9 animate-spin text-violet-300" />
            <p className="mt-4 text-sm font-semibold text-white/80">Scriptora legge la tua idea…</p>
          </div>
        ) : session.phase === "interview" && session.currentQuestion ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/92 p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200/80">
              Domanda {session.questionsAsked + 1} di max {session.questionBudget}
            </p>
            <h3 className="mt-2 text-lg font-bold text-white">{session.currentQuestion.question}</h3>
            {session.currentQuestion.helper && (
              <p className="mt-2 text-sm text-white/55">{session.currentQuestion.helper}</p>
            )}
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder={session.currentQuestion.placeholder || "Rispondi con parole tue…"}
              className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-sky-300/40"
            />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={submitAnswer}
                disabled={answer.trim().length < 2}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                Continua
              </button>
              <button
                type="button"
                onClick={() => setSession(skipToProposalIfReady(session))}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] px-4 text-sm font-semibold text-white/80"
              >
                Salta alla proposta
              </button>
            </div>
          </div>
        ) : session.proposal ? (
          <AuthorProposalScreen
            proposal={session.proposal}
            blueprint={session.blueprint}
            generatingBlueprint={generatingBlueprint}
            approving={approving}
            onApprove={handleApprove}
            onModify={() => {
              document.getElementById("one-flow-edit")?.focus();
            }}
            onApplyEdit={handleApplyEdit}
            onDeepenCharacters={onDeepenCharacters ? () => onDeepenCharacters(session) : undefined}
          />
        ) : (
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-8 text-center text-sm text-white/70">
            Preparazione proposta…
          </div>
        )}
      </div>
    </div>
  );
}
