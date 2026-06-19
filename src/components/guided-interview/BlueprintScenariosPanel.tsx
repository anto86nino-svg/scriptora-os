import type { ExpressBookScenario } from "@/lib/guided-interview/express-book-package";
import { isNonfictionExpressGenre } from "@/lib/guided-interview/express-genre-config";
import { cn } from "@/lib/utils";

export type BlueprintScenariosPanelProps = {
  scenarios: ExpressBookScenario[];
  selectedId?: string;
  onSelect: (scenario: ExpressBookScenario) => void;
  onModify?: (scenario: ExpressBookScenario, tone: "darker" | "commercial" | "poetic") => void;
  onEdit?: (scenario: ExpressBookScenario) => void;
  compact?: boolean;
  className?: string;
};

const VARIANT_STYLES: Record<ExpressBookScenario["variant"], string> = {
  safe: "border-emerald-400/25 bg-emerald-500/8",
  commercial: "border-sky-400/25 bg-sky-500/8",
  bold: "border-amber-400/30 bg-amber-500/10",
};

export function BlueprintScenariosPanel({
  scenarios,
  selectedId,
  onSelect,
  onModify,
  onEdit,
  compact = false,
  className,
}: BlueprintScenariosPanelProps) {
  if (!scenarios.length) return null;

  return (
    <section className={cn("space-y-3", className)} aria-label="Libri Express">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200/85">
          Scriptora ha preparato 3 libri possibili
        </p>
        <p className="mt-1 text-sm text-white/60">
          Scegli il concept più vicino al tuo cuore. Ogni versione è un libro completo — struttura, promessa e percorso fino al finale.
        </p>
      </div>

      <div className={cn("grid gap-4", compact ? "grid-cols-1" : "lg:grid-cols-3")}>
        {scenarios.map((scenario) => (
          <article
            key={scenario.id}
            className={cn(
              "flex flex-col rounded-2xl border p-4",
              VARIANT_STYLES[scenario.variant],
              selectedId === scenario.id && "ring-2 ring-violet-400/40",
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
              {scenario.label}
            </p>
            <h3 className="mt-1 text-lg font-semibold leading-snug text-white">{scenario.title}</h3>
            {scenario.subtitle && (
              <p className="mt-1 text-xs italic text-white/55">{scenario.subtitle}</p>
            )}
            <p className="mt-2 text-[11px] font-medium text-violet-200/90">{scenario.hook}</p>

            <div className="mt-3 flex-1 rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
                Sinossi editoriale
              </p>
              <p className="mt-2 text-xs leading-6 text-white/75">{scenario.editorialSynopsis}</p>
            </div>

            <dl className="mt-3 space-y-1.5 text-[11px] leading-5 text-white/55">
              {isNonfictionExpressGenre(scenario.genre) ? (
                <>
                  <Row label="Problema lettore" value={scenario.readerProblem ?? scenario.centralConflict} />
                  <Row label="Promessa" value={scenario.transformationPromise ?? scenario.marketPromise} />
                  <Row label="Metodo" value={scenario.methodFramework ?? scenario.structurePreference} />
                  <Row label="Pubblico" value={scenario.idealReader ?? scenario.targetAudience} />
                  <Row
                    label="Esercizi"
                    value={(scenario.exercises ?? []).slice(0, 2).join(" · ") || "Esercizi progressivi per capitolo"}
                  />
                  <Row label="Struttura" value={`${scenario.chapterCount} capitoli`} />
                  <Row label="Payoff" value={scenario.finalEmotion} />
                </>
              ) : (
                <>
                  <Row label="Protagonisti" value={scenario.protagonist} />
                  <Row label="Ambientazione" value={scenario.setting} />
                  <Row label="Conflitto" value={scenario.centralConflict} />
                  <Row label="Ferita" value={scenario.emotionalWound} />
                  <Row label="Posta in gioco" value={scenario.stakes} />
                  <Row label="Struttura" value={`${scenario.chapterCount} capitoli`} />
                  <Row label="Finale" value={scenario.finalEmotion} />
                </>
              )}
            </dl>

            <p className="mt-2 text-[10px] text-emerald-300/80">{scenario.whyItSells}</p>
            {scenario.editorialRisks.length > 0 && (
              <p className="mt-1 text-[10px] leading-4 text-white/40">
                Rischio: {scenario.editorialRisks[0]}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onSelect(scenario)}
                className="rounded-xl bg-violet-500 px-3 py-3 text-sm font-semibold text-white"
              >
                Usa questo libro
              </button>
              <div className="flex flex-wrap gap-1.5">
                {onModify && (
                  <>
                    {isNonfictionExpressGenre(scenario.genre) ? (
                      <>
                        <MiniBtn label="Più pratico" onClick={() => onModify(scenario, "commercial")} />
                        <MiniBtn label="Più trasformativo" onClick={() => onModify(scenario, "darker")} />
                        <MiniBtn label="Più profondo" onClick={() => onModify(scenario, "poetic")} />
                      </>
                    ) : (
                      <>
                        <MiniBtn label="Più oscuro" onClick={() => onModify(scenario, "darker")} />
                        <MiniBtn label="Più commerciale" onClick={() => onModify(scenario, "commercial")} />
                        <MiniBtn label="Più poetico" onClick={() => onModify(scenario, "poetic")} />
                      </>
                    )}
                  </>
                )}
                {onEdit && <MiniBtn label="Modifica dettagli" onClick={() => onEdit(scenario)} />}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-white/40">{label}</dt>
      <dd className="line-clamp-3">{value}</dd>
    </div>
  );
}

function MiniBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-white/12 px-2 py-1 text-[10px] font-medium text-white/60"
    >
      {label}
    </button>
  );
}
