import type { BookDnaLock } from "@/lib/guided-interview/dna-lock";
import { getDnaLockReadinessMessage } from "@/lib/guided-interview/dna-lock";
import { isDnaTooDirtyToShow } from "@/lib/guided-interview/dna-cleaner";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { AlertTriangle, CheckCircle2, Fingerprint, Loader2, LockKeyhole, Pencil, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type BookDnaConfirmationPanelProps = {
  dnaLock?: BookDnaLock;
  extracted?: GuidedInterviewState["extracted"];
  onContinueInterview?: () => void;
  onConfirmDna?: () => void;
};

function formatPercent(value: number | undefined): string {
  const safe = typeof value === "number" ? value : 0;
  return `${Math.round(Math.max(0, Math.min(1, safe)) * 100)}%`;
}

export function BookDnaConfirmationPanel({
  dnaLock,
  extracted,
  onContinueInterview,
  onConfirmDna,
}: BookDnaConfirmationPanelProps) {
  const [clarifying, setClarifying] = useState(false);

  const extractedRecord = useMemo(
    () => (extracted ?? {}) as Record<string, unknown>,
    [extracted],
  );

  const dirty = useMemo(
    () => isDnaTooDirtyToShow(extractedRecord),
    [extractedRecord],
  );

  useEffect(() => {
    if (!dirty) {
      setClarifying(false);
      return;
    }
    setClarifying(true);
    const timer = window.setTimeout(() => setClarifying(false), 1600);
    return () => window.clearTimeout(timer);
  }, [dirty, extractedRecord]);

  if (clarifying) {
    return (
      <section className="rounded-3xl border border-violet-400/20 bg-violet-500/10 p-6 text-center text-slate-100 shadow-2xl">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-300" />
        <p className="mt-3 text-sm font-medium text-violet-100">
          Scriptora sta chiarendo il DNA del libro…
        </p>
        <p className="mt-1 text-xs text-white/45">Un attimo — niente output sporco.</p>
      </section>
    );
  }

  if (!dnaLock) {
    return (
      <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 text-slate-100 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-300">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Scriptora sta ascoltando</h3>
            <p className="text-sm text-slate-400">
              Racconta il libro liberamente — genere, tono e promessa emergono dalla chat.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const ready = dnaLock.readyForBlueprint;
  const discovery = dnaLock.confidenceScore >= 0.72;

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/90 p-4 text-slate-100 shadow-2xl sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300">
            <LockKeyhole className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-violet-300/80">
              {discovery ? "Genre discovery" : "DNA in costruzione"}
            </p>
            <h3 className="mt-1 text-xl font-semibold">
              {discovery ? "Credo di aver capito il cuore del tuo libro" : "Sto scoprendo il tuo libro"}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              {ready
                ? "DNA Lock attivo — conferma prima del blueprint."
                : "Inferisco genere, tono e promessa. Se qualcosa non torna, correggi o continua l'intervista."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-right">
          <p className="text-xs text-slate-400">Confidenza</p>
          <p className="text-2xl font-bold text-white">{formatPercent(dnaLock.confidenceScore)}</p>
          <p className={ready ? "text-xs text-emerald-300" : "text-xs text-amber-300"}>
            {ready ? "Pronto per blueprint" : "Soglia 95%"}
          </p>
        </div>
      </div>

      {(dnaLock.inferredBookType || dnaLock.inferredSubgenre) && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {dnaLock.inferredBookType && (
            <DnaCard label="Tipo libro" value={dnaLock.inferredBookType} />
          )}
          {dnaLock.inferredSubgenre && (
            <DnaCard label="Genere dedotto" value={dnaLock.inferredSubgenre} />
          )}
          {dnaLock.tone && <DnaCard label="Tono" value={dnaLock.tone} />}
          {dnaLock.targetReader && <DnaCard label="Target" value={dnaLock.targetReader} />}
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2">
          {ready ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-300" />
          )}
          <p className="text-sm font-medium">{getDnaLockReadinessMessage(dnaLock)}</p>
        </div>
        {!ready && dnaLock.dnaQuality?.issues?.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-amber-200/90">
            {dnaLock.dnaQuality.issues.map((issue) => (
              <li key={issue}>• {issue}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-200">
            <ShieldCheck className="h-4 w-4" />
            Il libro è
          </h4>

          {dnaLock.whatBookIs.length > 0 ? (
            <ul className="space-y-2 text-sm leading-6 text-slate-300">
              {dnaLock.whatBookIs.map((item, index) => (
                <li key={`${item}-${index}`} className="rounded-xl bg-black/20 p-3">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Non ancora abbastanza chiaro.</p>
          )}
        </div>

        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/5 p-4">
          <h4 className="mb-3 text-sm font-semibold text-rose-200">Cosa NON è</h4>
          <ul className="space-y-2 text-sm leading-6 text-slate-300">
            {dnaLock.whatBookIsNot.map((item, index) => (
              <li key={`${item}-${index}`} className="rounded-xl bg-black/20 p-3">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4">
          <h4 className="mb-3 text-sm font-semibold text-violet-200">Regole anti-drift</h4>
          <ul className="space-y-2 text-sm leading-6 text-slate-300">
            {dnaLock.antiDriftRules.map((item, index) => (
              <li key={`${item}-${index}`} className="rounded-xl bg-black/20 p-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {dnaLock.missingCriticalAnswers.length > 0 && (
        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
          <h4 className="text-sm font-semibold text-amber-200">Segnali ancora mancanti</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {dnaLock.missingCriticalAnswers.map((field) => (
              <span
                key={field}
                className="rounded-full border border-amber-300/20 bg-black/20 px-3 py-1 text-xs text-amber-100"
              >
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onContinueInterview}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
        >
          <Pencil className="h-4 w-4" />
          Correggi / Continua intervista
        </button>

        <button
          type="button"
          onClick={onConfirmDna}
          disabled={!ready}
          className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Conferma DNA
        </button>
      </div>
    </section>
  );
}

function DnaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-1 line-clamp-2 text-xs font-semibold text-white">{value}</p>
    </div>
  );
}
