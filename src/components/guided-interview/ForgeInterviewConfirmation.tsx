import type { BookDnaLock } from "@/lib/guided-interview/dna-lock";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { cn } from "@/lib/utils";

export type ForgeInterviewConfirmationProps = {
  dnaLock: BookDnaLock;
  extracted: GuidedInterviewState["extracted"];
  onConfirm: () => void;
  onCorrect: () => void;
  className?: string;
};

function pick(...values: Array<string | undefined>): string {
  for (const v of values) {
    const t = v?.trim();
    if (t && t.length >= 2) return t;
  }
  return "—";
}

export function ForgeInterviewConfirmation({
  dnaLock,
  extracted,
  onConfirm,
  onCorrect,
  className,
}: ForgeInterviewConfirmationProps) {
  const bookType = pick(dnaLock.inferredBookType);
  const genre = pick(dnaLock.inferredSubgenre, dnaLock.inferredGenre);
  const promise = pick(dnaLock.promiseLock, extracted.promise, extracted.readerTransformation);
  const tone = pick(dnaLock.tone, dnaLock.emotionalLock, extracted.emotionalTone);
  const audience = pick(dnaLock.targetReader, extracted.targetReader);
  const notThis = dnaLock.whatBookIsNot[0] ?? "Non deve perdere il cuore che hai descritto.";

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
        {dnaLock.readyForBlueprint ? "Ho capito il cuore del libro" : "Sto ancora chiarendo il cuore del libro"}
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-white/55">
        {dnaLock.readyForBlueprint
          ? "Mi sembra che tu voglia scrivere qualcosa di preciso. Se ti risuona, confermiamo e apriamo il blueprint."
          : "Ho una direzione iniziale, ma mi manca ancora qualche risposta reale prima di aprire il blueprint."}
      </p>

      <dl className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <ConfirmRow label="Tipo libro" value={bookType} />
        <ConfirmRow label="Genere / filone" value={genre} />
        <ConfirmRow label="Promessa narrativa" value={promise} />
        <ConfirmRow label="Tono" value={tone} />
        <ConfirmRow label="Pubblico" value={audience} />
        <ConfirmRow label="Cosa non deve diventare" value={notThis} muted />
      </dl>

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!dnaLock.readyForBlueprint}
          className="rounded-2xl bg-violet-500 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
        >
          Conferma e crea blueprint
        </button>
        <button
          type="button"
          onClick={onCorrect}
          className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-white/85"
        >
          Correggi questa direzione
        </button>
      </div>

      {!dnaLock.readyForBlueprint && (
        <p className="mt-3 text-center text-xs leading-5 text-white/45">
          Ancora un dettaglio in più — correggi o continua a parlarmi del libro.
        </p>
      )}
    </section>
  );
}

function ConfirmRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">{label}</dt>
      <dd className={cn("mt-0.5 text-sm leading-6", muted ? "text-white/60" : "text-white/90")}>
        {value}
      </dd>
    </div>
  );
}
