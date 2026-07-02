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
    <section aria-labelledby="home-crea-title" className="scriptora-home-card rounded-[1.5rem] p-5 sm:p-6">
      <p className="scriptora-home-eyebrow">Nuovo</p>
      <h2 id="home-crea-title" className="mt-1 text-xl font-black text-[#1a1209] sm:text-2xl">
        Crea nuovo libro
      </h2>
      <p className="mt-1 text-sm text-[#5c4030]">
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
        className="mt-4 min-h-[132px] w-full resize-none rounded-2xl border border-[#d9c9b0] bg-[#faf6ee] px-4 py-3 text-sm leading-6 text-[#1a1209] outline-none transition placeholder:text-[#8b7355] focus:border-[#f2c400]/70 focus:bg-white focus:ring-2 focus:ring-[#f2c400]/25"
      />

      <button
        type="button"
        onClick={launch}
        disabled={!valid}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#f2c400] px-4 text-sm font-black text-[#1a1209] shadow-[0_12px_28px_rgba(242,196,0,0.22)] transition hover:bg-[#ffe06a] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <Sparkles className="h-4 w-4" />
        Crea il libro
        <ArrowRight className="h-4 w-4" />
      </button>
      {!valid && (
        <p className="mt-2 text-xs text-[#8b7355]">Almeno qualche parola — anche una frase grezza va bene.</p>
      )}
    </section>
  );
}
