import {
  generateTitleSubtitleOptions,
  type FoundationGeneratorInput,
  type TitleSubtitleOption,
} from "@/lib/guided-interview/book-foundation-lock";

const SIMILAR_SEED_SUFFIXES = [
  "segreto centrale conseguenza scelta irreversibile",
  "desiderio conflitto promessa prezzo emotivo",
  "luogo simbolico memoria colpa rivelazione",
  "protagonista ferita obiettivo ostacolo trasformazione",
  "mercato lettore hook immagine titolo memorabile",
];

const GENRE_FALLBACK_TITLES: Record<string, string[]> = {
  "dark romance": ["La Ferita che Ti Somiglia", "Il Confine del Desiderio", "Nessuna Promessa Innocente", "La Regola dei Cuori Proibiti"],
  fantasy: ["La Selva che Ricorda", "Il Confine dei Ricordi", "Cenere e Corona"],
  "self-help": ["Ricomincia da Te", "Oltre il Blocco", "La Disciplina che Resta"],
};

function padSimilarPool(
  pool: TitleSubtitleOption[],
  baseInput: FoundationGeneratorInput,
  anchor: TitleSubtitleOption,
  seen: Set<string>,
): TitleSubtitleOption[] {
  if (pool.length >= 3) return pool;
  const genreKey = baseInput.genre.toLowerCase();
  const fallbacks =
    GENRE_FALLBACK_TITLES[genreKey] ??
    generateTitleSubtitleOptions(baseInput).map((o) => o.title);
  const ref = pool[0] ?? anchor;
  for (const candidate of fallbacks) {
    const key = candidate.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    pool.push({
      title: candidate,
      subtitle: ref.subtitle,
      commercialReason: `Alternativa coerente con «${anchor.title}»`,
      toneFit: ref.toneFit,
      genreFit: ref.genreFit,
      risk: "Variante titolo per posizionamento commerciale",
      source: "auto",
    });
    if (pool.length >= 3) break;
  }
  return pool;
}

/** Variant titles coherently different from anchor — reuses generateTitleSubtitleOptions only. */
export function regenerateSimilarTitleOptions(
  baseInput: FoundationGeneratorInput,
  anchor: TitleSubtitleOption,
): TitleSubtitleOption[] {
  const anchorKey = anchor.title.trim().toLowerCase();
  const seen = new Set<string>([anchorKey]);
  const pool: TitleSubtitleOption[] = [];

  const inputs: FoundationGeneratorInput[] = [
    baseInput,
    ...SIMILAR_SEED_SUFFIXES.map((suffix) => ({
      ...baseInput,
      ideaSeed: `${baseInput.ideaSeed} — ${suffix}`,
    })),
  ];

  for (const input of inputs) {
    for (const opt of generateTitleSubtitleOptions(input)) {
      const key = opt.title.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      pool.push({
        ...opt,
        source: "auto",
        commercialReason: `Variante nel mood di «${anchor.title}» — ${opt.commercialReason}`,
      });
      if (pool.length >= 3) return pool;
    }
  }

  const fallbacks: FoundationGeneratorInput[] = [
    { ...baseInput, lengthPreset: "lungo" },
    { ...baseInput, lengthPreset: "breve" },
    { ...baseInput, tone: baseInput.tone === "oscuro" ? "magnetico" : "oscuro" },
  ];
  for (const input of fallbacks) {
    for (const opt of generateTitleSubtitleOptions(input)) {
      const key = opt.title.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      pool.push({
        ...opt,
        source: "auto",
        commercialReason: `Variante nel mood di «${anchor.title}» — ${opt.commercialReason}`,
      });
      if (pool.length >= 3) return pool;
    }
  }

  return padSimilarPool(pool, baseInput, anchor, seen).slice(0, 3);
}
