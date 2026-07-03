import { memo, startTransition } from "react";
import { ArrowLeft, ArrowRight, Loader2, Rocket, Sparkles } from "lucide-react";

type Props = {
  step: number;
  postDnaForge: boolean;
  generatingBlueprint: boolean;
  launching: boolean;
  shouldUseCharacterForge: boolean;
  closeWizard: () => void;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  goNext: () => Promise<void>;
  finishApproved: () => Promise<void>;
  canAdvance?: boolean;
  advanceHint?: string | null;
  approvalReady?: boolean;
};

function WizardFooter(props: Props) {
  const {
    step,
    postDnaForge,
    generatingBlueprint,
    launching,
    closeWizard,
    setStep,
    goNext,
    finishApproved,
    canAdvance = true,
    advanceHint,
    approvalReady = true,
  } = props;

  return (
    <div className="scriptora-wizard-footer flex shrink-0 flex-col gap-2 border-t border-white/10 bg-slate-950/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
      {advanceHint && !canAdvance && step < 6 && (
        <p className="text-center text-[11px] leading-4 text-amber-200/90">{advanceHint}</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={!postDnaForge && step == 0}
          onClick={() => {
            if (postDnaForge && step === 6) {
              closeWizard();
              return;
            }

            startTransition(() => {
              setStep((s) => Math.max(postDnaForge ? 6 : 0, s - 1));
            });
          }}
          className="inline-flex items-center gap-1 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
          {postDnaForge && step === 6 ? "Dashboard" : "Indietro"}
        </button>

        {step < 6 && (
          <button
            type="button"
            disabled={!canAdvance}
            onClick={() => {
              void goNext();
            }}
            className="inline-flex items-center gap-1 rounded-xl bg-white px-5 py-2 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Avanti
            <ArrowRight className="h-4 w-4"/>
          </button>
        )}

        {step === 6 && (
          <button
            type="button"
            disabled={generatingBlueprint}
            onClick={() => {
              void goNext();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {generatingBlueprint
              ? <Loader2 className="h-4 w-4 animate-spin"/>
              : <Sparkles className="h-4 w-4"/>}
            Genera Blueprint
          </button>
        )}

        {step === 7 && (
          <button
            type="button"
            disabled={launching || !approvalReady}
            onClick={() => {
              void finishApproved();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60"
          >
            {launching
              ? <Loader2 className="h-4 w-4 animate-spin"/>
              : <Rocket className="h-4 w-4"/>}
            Approva e apri Studio
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(WizardFooter);
