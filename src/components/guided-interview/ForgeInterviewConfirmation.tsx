import { useState } from "react";
import type { BookDnaLock } from "@/lib/guided-interview/dna-lock";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import {
  buildBlueprintReadySummary,
  buildEditorialFallbackForMissingField,
  type BlueprintEditorialField,
  type BlueprintReadySummary,
} from "@/lib/guided-interview/blueprint-ready-summary";
import { buildFinalBookReview } from "@/lib/guided-interview/final-book-review";
import { evaluateForgeReadiness } from "@/lib/guided-interview/forge-readiness";
import { getForgeMemory } from "@/lib/guided-interview/interview-memory";
import {
  getDnaLockConfirmPrompt,
  getDnaLockHeadline,
} from "@/lib/guided-interview/co-author-engine";
import { evaluateDnaLockPremium } from "@/lib/guided-interview/forge-orchestrator";
import { mergeAdviceMessages } from "@/lib/guided-interview/editorial-advice-render";
import { cn } from "@/lib/utils";
import { safeDisplayText } from "@/lib/safe-display-text";

const CORRECTABLE_FIELDS: { id: BlueprintEditorialField; label: string }[] = [
  { id: "bookTitle", label: "Titolo" },
  { id: "bookSubtitle", label: "Sottotitolo" },
  { id: "openingHook", label: "Hook" },
  { id: "promise", label: "Promessa" },
  { id: "centralConflict", label: "Conflitto" },
  { id: "characters", label: "Personaggi" },
  { id: "chapterCount", label: "Struttura" },
  { id: "endingDirection", label: "Finale" },
];

export type ForgeInterviewConfirmationProps = {
  dnaLock: BookDnaLock;
  extracted: GuidedInterviewState["extracted"];
  state?: GuidedInterviewState;
  blueprintReady?: boolean;
  onConfirm: () => void;
  onCorrect: () => void;
  onRefine?: () => void;
  onCorrectField?: (field: BlueprintEditorialField, prompt: string) => void;
  onApplyGeneratedField?: (field: BlueprintEditorialField, value: string) => void;
  className?: string;
};

export function ForgeInterviewConfirmation({
  dnaLock,
  extracted,
  state,
  blueprintReady = false,
  onConfirm,
  onCorrect,
  onRefine,
  onCorrectField,
  onApplyGeneratedField,
  className,
}: ForgeInterviewConfirmationProps) {
  const [showCorrectMenu, setShowCorrectMenu] = useState(false);
  const summary: BlueprintReadySummary | null =
    state && blueprintReady ? buildBlueprintReadySummary(state) : null;
  const review = summary ?? (state ? buildFinalBookReview(state) : null);
  const premium = state ? evaluateDnaLockPremium(state) : null;
  const displayIncoherences = premium ? mergeAdviceMessages(premium.incoherences, 3) : [];
  const displayCommercialNotes = premium ? mergeAdviceMessages(premium.commercialNotes, 3) : [];
  const ready = dnaLock.readyForBlueprint || blueprintReady;
  const autoFilledCount = state?.slotProvenance
    ? Object.values(state.slotProvenance).filter((p) => p.source === "auto" || p.source === "inferred").length
    : 0;

  const handleGenerateField = (field: "openingHook" | "bookSubtitle") => {
    if (!state || !onApplyGeneratedField) return;
    const memory = getForgeMemory(state);
    const value = buildEditorialFallbackForMissingField(field, memory, state);
    onApplyGeneratedField(field, value);
  };

  return (
    <section
      className={cn(
        "scriptora-forge-interview-confirm mx-auto max-w-lg animate-in fade-in slide-in-from-bottom-2 duration-500",
        className,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/80">
        {blueprintReady ? "Pronto per blueprint" : "Book Forge"}
      </p>
      <h2 className="mt-2 text-xl font-semibold leading-snug text-white">
        {blueprintReady
          ? "Il libro è pronto per il blueprint"
          : getDnaLockHeadline(ready)}
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-white/55">
        {blueprintReady
          ? "Scheda editoriale del libro — conferma la sintesi o correggi una parte."
          : ready
            ? getDnaLockConfirmPrompt()
            : forgeGapMessage(state)}
      </p>

      {autoFilledCount > 0 && (
        <p className="mt-3 rounded-xl border border-sky-400/20 bg-sky-500/8 px-3 py-2 text-xs text-sky-100/90">
          Ho completato automaticamente alcune parti ({autoFilledCount}). Puoi correggerle ora o partire.
        </p>
      )}

      {review && review.fields.length > 0 ? (
        <dl className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          {review.fields.map((field) => (
            <ConfirmRow
              key={field.label}
              label={field.label}
              value={field.value}
              muted={"isFallback" in field && field.isFallback}
              missing={"isMissing" in field && field.isMissing}
            />
          ))}
        </dl>
      ) : (
        <LegacySummary dnaLock={dnaLock} extracted={extracted} />
      )}

      {summary && (summary.integrity.missingSubtitle || summary.integrity.missingHook) && (
        <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/90">
            Blueprint Integrity
          </p>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-50/90">
            {summary.integrity.notes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.integrity.missingHook && onApplyGeneratedField && (
              <QuickBtn label="Genera hook" onClick={() => handleGenerateField("openingHook")} />
            )}
            {summary.integrity.missingSubtitle && onApplyGeneratedField && (
              <QuickBtn label="Genera sottotitolo" onClick={() => handleGenerateField("bookSubtitle")} />
            )}
            <QuickBtn label="Procedi comunque" onClick={onConfirm} primary />
          </div>
        </div>
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

      {showCorrectMenu && onCorrectField && (
        <div className="mt-4 flex flex-wrap gap-2">
          {CORRECTABLE_FIELDS.map((field) => (
            <button
              key={field.id}
              type="button"
              onClick={() => {
                onCorrectField(field.id, correctionPrompt(field.id, field.label));
                setShowCorrectMenu(false);
              }}
              className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-white/70 hover:border-violet-300/35 hover:text-violet-100"
            >
              {field.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!ready && !blueprintReady}
          className="rounded-2xl bg-violet-500 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
        >
          {blueprintReady ? "Conferma e genera blueprint" : "Blocca DNA — è questo il libro"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (blueprintReady && onCorrectField) {
              setShowCorrectMenu((v) => !v);
              return;
            }
            onCorrect();
          }}
          className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-white/85"
        >
          Correggi una parte
        </button>
        {onRefine && (
          <button
            type="button"
            onClick={onRefine}
            className="rounded-2xl border border-white/8 px-4 py-2.5 text-xs font-medium text-white/45"
          >
            Continua a rifinire
          </button>
        )}
      </div>

      {!ready && !blueprintReady && (
        <p className="mt-3 text-center text-xs leading-5 text-white/45">
          Continua l'intervista — ogni risposta rende il libro più vivo e definitivo.
        </p>
      )}
    </section>
  );
}

function QuickBtn({
  label,
  onClick,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-2 text-[11px] font-semibold",
        primary
          ? "bg-violet-500 text-white"
          : "border border-amber-300/30 bg-amber-500/15 text-amber-100",
      )}
    >
      {label}
    </button>
  );
}

function correctionPrompt(field: BlueprintEditorialField, label: string): string {
  const prompts: Partial<Record<BlueprintEditorialField, string>> = {
    bookTitle: "Il titolo corretto è: ",
    bookSubtitle: "Il sottotitolo corretto è: ",
    openingHook: "L'hook commerciale è: ",
    promise: "La promessa del libro è: ",
    centralConflict: "Il conflitto centrale è: ",
    characters: "I personaggi centrali sono: ",
    chapterCount: "La struttura capitoli è: ",
    endingDirection: "La direzione del finale è: ",
  };
  return prompts[field] ?? `Correggo ${label}: `;
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
  missing,
}: {
  label: string;
  value: unknown;
  muted?: boolean;
  missing?: boolean;
}) {
  const display = safeDisplayText(value);
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
        {label}
        {missing && <span className="ml-1 text-amber-300/80">· mancante</span>}
        {muted && !missing && <span className="ml-1 text-sky-300/70">· suggerito</span>}
      </dt>
      <dd className={cn("mt-0.5 text-sm leading-6", muted || missing ? "text-white/60" : "text-white/90")}>
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
