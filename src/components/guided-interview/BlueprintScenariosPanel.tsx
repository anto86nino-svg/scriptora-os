import type { BlueprintScenario } from "@/lib/guided-interview/blueprint-scenarios";
import { cn } from "@/lib/utils";

export type BlueprintScenariosPanelProps = {
  scenarios: BlueprintScenario[];
  selectedId?: string;
  onSelect: (scenario: BlueprintScenario) => void;
  onModify?: (scenario: BlueprintScenario, tone: "darker" | "commercial" | "poetic") => void;
  onEdit?: (scenario: BlueprintScenario) => void;
  compact?: boolean;
  className?: string;
};

const VARIANT_STYLES: Record<BlueprintScenario["variant"], string> = {
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
    <section className={cn("space-y-3", className)} aria-label="Scenari blueprint">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200/85">
          Direzioni blueprint
        </p>
        <p className="mt-1 text-sm text-white/60">
          Scriptora ha preparato 3 direzioni blueprint. Scegli quella più vicina al tuo libro.
        </p>
      </div>

      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "md:grid-cols-3")}>
        {scenarios.map((scenario) => (
          <article
            key={scenario.id}
            className={cn(
              "rounded-2xl border p-4",
              VARIANT_STYLES[scenario.variant],
              selectedId === scenario.id && "ring-2 ring-violet-400/40",
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
              {scenario.label}
            </p>
            <h3 className="mt-1 text-base font-semibold text-white">{scenario.title}</h3>
            <p className="mt-2 text-xs leading-5 text-white/65">{scenario.logline}</p>

            <dl className="mt-3 space-y-1.5 text-[11px] leading-5 text-white/55">
              <Row label="Promessa" value={scenario.promise} />
              <Row label="Protagonisti" value={scenario.protagonists} />
              <Row label="Conflitto" value={scenario.conflict} />
              <Row label="Struttura" value={scenario.structure} />
              <Row label="Tono" value={scenario.tone} />
              <Row label="Finale" value={scenario.ending} />
            </dl>

            {scenario.editorialRisks.length > 0 && (
              <p className="mt-2 text-[10px] leading-4 text-white/40">
                Rischio: {scenario.editorialRisks[0]}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onSelect(scenario)}
                className="rounded-xl bg-violet-500 px-3 py-2.5 text-xs font-semibold text-white"
              >
                Usa questo e genera blueprint
              </button>
              <div className="flex flex-wrap gap-1.5">
                {onModify && (
                  <>
                    <MiniBtn label="Più oscuro" onClick={() => onModify(scenario, "darker")} />
                    <MiniBtn label="Più commerciale" onClick={() => onModify(scenario, "commercial")} />
                    <MiniBtn label="Più poetico" onClick={() => onModify(scenario, "poetic")} />
                  </>
                )}
                {onEdit && <MiniBtn label="Modifica prima" onClick={() => onEdit(scenario)} />}
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
      <dd>{value}</dd>
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
