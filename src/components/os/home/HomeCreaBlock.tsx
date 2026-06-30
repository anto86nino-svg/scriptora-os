import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

export const HOME_CREA_CHIPS = [
  "Romanzo",
  "Thriller",
  "Horror",
  "Fantasy",
  "Romance",
  "Manuale",
  "Business",
  "Self-help",
  "Workbook",
  "Memoir",
  "Ricettario",
  "Raccolta poetica",
] as const;

export type HomeCreaChip = (typeof HOME_CREA_CHIPS)[number];

type Props = {
  onStartOneFlow: (idea: string, genreHint?: HomeCreaChip) => void;
};

export function HomeCreaBlock({ onStartOneFlow }: Props) {
  const [idea, setIdea] = useState("");
  const valid = idea.trim().length >= 6;

  const launch = () => {
    if (!valid) return;
    onStartOneFlow(idea.trim());
  };

  return (
    <section aria-labelledby="home-crea-title" className="rounded-[1.5rem] bg-white/[0.04] p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Nuovo</p>
      <h2 id="home-crea-title" className="mt-1 text-xl font-bold text-white sm:text-2xl">
        Che libro vuoi creare?
      </h2>
      <p className="mt-1 text-sm text-white/50">
        Descrivi l&apos;idea — anche grezza. Poi confermi formato, genere, target e regole prima del blueprint.
      </p>

      <label htmlFor="home-crea-idea" className="sr-only">
        La tua idea di libro
      </label>
      <textarea
        id="home-crea-idea"
        value={idea}
        onChange={(event) => setIdea(event.target.value)}
        placeholder="Descrivi la tua idea, anche in modo grezzo..."
        rows={5}
        className="mt-4 min-h-[132px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-amber-200/45 focus:ring-2 focus:ring-amber-300/15"
      />

      <button
        type="button"
        onClick={launch}
        disabled={!valid}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <Sparkles className="h-4 w-4" />
        Crea il libro
        <ArrowRight className="h-4 w-4" />
      </button>
      {!valid && (
        <p className="mt-2 text-xs text-white/45">Almeno qualche parola — anche una frase grezza va bene.</p>
      )}
    </section>
  );
}
