import type { BookDnaLock } from "@/lib/guided-interview/dna-lock";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { buildFinalBookReview } from "@/lib/guided-interview/final-book-review";
import { evaluateForgeReadiness } from "@/lib/guided-interview/forge-readiness";
import {
  getDnaLockConfirmPrompt,
  getDnaLockHeadline,
} from "@/lib/guided-interview/co-author-engine";
import { evaluateDnaLockPremium } from "@/lib/guided-interview/forge-orchestrator";
import { mergeAdviceMessages } from "@/lib/guided-interview/editorial-advice-render";
import { cn } from "@/lib/utils";
import { safeDisplayText } from "@/lib/safe-display-text";

export type ForgeInterviewConfirmationProps = {
  dnaLock: BookDnaLock;
  extracted: GuidedInterviewState["extracted"];
  state?: GuidedInterviewState;
  onConfirm: () => void;
  onCorrect: () => void;
  className?: string;
};

export function ForgeInterviewConfirmation({
  dnaLock,
  extracted,
  state,
  onConfirm,
  onCorrect,
  className,
}: ForgeInterviewConfirmationProps) {
  const review = state ? buildFinalBookReview(state) : null;
  const premium = state ? evaluateDnaLockPremium(state) : null;
  const displayIncoherences = premium ? mergeAdviceMessages(premium.incoherences, 3) : [];
  const displayCommercialNotes = premium ? mergeAdviceMessages(premium.commercialNotes, 3) : [];
  const ready = dnaLock.readyForBlueprint;

  return (
    <section
      className={cn(
        "scriptora-forge-interview-confirm mx-auto max-w-lg animate-in fade-in slide-in-from-bottom-2 duration-500",
        className,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/80">
        Book Forge
      </p>
      <h2 className="mt-2 text-xl font-semibold leading-snug text-white">
        {getDnaLockHeadline(ready)}
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-white/55">
        {ready ? getDnaLockConfirmPrompt() : forgeGapMessage(state)}
      </p>

      {review && review.fields.length > 0 ? (
        <dl className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          {review.fields.map((field) => (
            <ConfirmRow key={field.label} label={field.label} value={field.value} />
          ))}
        </dl>
      ) : (
        <LegacySummary dnaLock={dnaLock} extracted={extracted} />
      )}

      {premium && ready && displayIncoherences.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/90">
            Controllo editoriale
          </p>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-50/90">
            {displayIncoherences.map((item, index) => (
              <li key={`${safeDisplayText(item)}-${index}`}>• {safeDisplayText(item)}</li>
            ))}
          </ul>
        </div>
      )}

      {premium && displayCommercialNotes.length > 0 && (
        <div className="mt-3 rounded-2xl border border-violet-400/20 bg-violet-500/8 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200/80">
            Nota commerciale
          </p>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-white/65">
            {displayCommercialNotes.map((note, index) => (
              <li key={`${safeDisplayText(note)}-${index}`}>• {safeDisplayText(note)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!ready}
          className="rounded-2xl bg-violet-500 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
        >
          Blocca DNA — è questo il libro
        </button>
        <button
          type="button"
          onClick={onCorrect}
          className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-white/85"
        >
          Continua intervista
        </button>
      </div>

      {!ready && (
        <p className="mt-3 text-center text-xs leading-5 text-white/45">
          Continua l'intervista — ogni risposta rende il libro più vivo e definitivo.
        </p>
      )}
    </section>
  );
}

function LegacySummary({
  dnaLock,
  extracted,
}: {
  dnaLock: BookDnaLock;
  extracted: GuidedInterviewState["extracted"];
}) {
  const pick = (...values: Array<string | undefined>) => {
    for (const v of values) {
      const t = v?.trim();
      if (t && t.length >= 2) return t;
    }
    return "—";
  };

  return (
    <dl className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <ConfirmRow label="Tipo libro" value={pick(dnaLock.inferredBookType)} />
      <ConfirmRow label="Genere" value={pick(dnaLock.inferredSubgenre, dnaLock.inferredGenre)} />
      <ConfirmRow label="Promessa" value={pick(dnaLock.promiseLock, extracted.promise)} />
      <ConfirmRow label="Pubblico" value={pick(dnaLock.targetReader, extracted.targetReader)} />
    </dl>
  );
}

function ConfirmRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: unknown;
  muted?: boolean;
}) {
  const display = safeDisplayText(value);
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">{label}</dt>
      <dd className={cn("mt-0.5 text-sm leading-6", muted ? "text-white/60" : "text-white/90")}>
        {display}
      </dd>
    </div>
  );
}

function forgeGapMessage(state?: GuidedInterviewState): string {
  if (!state) {
    return "Mi manca ancora qualche decisione vera prima di aprire il blueprint.";
  }
  return (
    evaluateForgeReadiness(state).humanGapMessage ??
    "Ci siamo quasi. Prima di bloccare il libro, mi manca ancora una cosa importante."
  );
}
