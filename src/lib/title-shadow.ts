import type { BookConfig, Genre, Language } from "@/types/book";

export interface ShadowTitleCandidate {
  title: string;
  subtitle: string;
  angle: string;
  keywords: string[];
  confidence: number;
}

export interface ShadowTitleInput {
  title?: string;
  subtitle?: string;
  idea?: string;
  genre?: string;
  category?: string;
  subcategory?: string;
  targetAudience?: string;
  readerPromise?: string;
  language?: Language | string;
  tone?: string;
}

const WEAK_TITLE_RE = /^(untitled|untitled book|untitled bestseller|generating|generating book|to be generated|senza titolo|libro senza titolo|romanzo senza titolo)$/i;
const WEAK_SUBTITLE_RE = /^(subtitle|sottotitolo|to be generated|da generare|n\/a|-|_)$/i;

function cleanPhrase(value?: string, fallback = ""): string {
  return String(value || fallback)
    .replace(/\s+/g, " ")
    .replace(/^[#:"'\s-]+|[#:"'\s-]+$/g, "")
    .trim();
}

function isFictionGenre(value?: string): boolean {
  const genre = String(value || "").toLowerCase();
  return ["romance", "dark-romance", "thriller", "fantasy", "horror", "sci-fi", "historical", "fairy-tale", "poetry", "jokes"].some((item) => genre.includes(item));
}

export function isWeakBookTitle(value?: string): boolean {
  const title = cleanPhrase(value);
  return !title || WEAK_TITLE_RE.test(title) || title.length < 4;
}

export function isWeakBookSubtitle(value?: string): boolean {
  const subtitle = cleanPhrase(value);
  return !subtitle || WEAK_SUBTITLE_RE.test(subtitle) || subtitle.length < 8;
}

function topicFromInput(input: ShadowTitleInput): string {
  const fromSubcategory = cleanPhrase(input.subcategory);
  if (fromSubcategory) return fromSubcategory;

  const fromCategory = cleanPhrase(input.category);
  if (fromCategory && !["fiction", "non-fiction", "self help"].includes(fromCategory.toLowerCase())) return fromCategory;

  const fromIdea = cleanPhrase(input.idea || input.readerPromise || input.title);
  if (fromIdea) {
    return fromIdea
      .replace(/^(un|una|a|an|the|il|lo|la|l'|gli|le)\s+/i, "")
      .split(/[.?!:;,-]/)[0]
      .split(/\s+/)
      .slice(0, 7)
      .join(" ");
  }

  const genre = cleanPhrase(input.genre || "self-help");
  return genre.replace(/-/g, " ");
}

function audienceFromInput(input: ShadowTitleInput): string {
  const audience = cleanPhrase(input.targetAudience);
  if (audience) return audience;
  if (String(input.language || "").toLowerCase().includes("ital")) return "lettori che vogliono un risultato concreto";
  return "readers who want a clear, practical result";
}

function titleCase(value: string): string {
  return cleanPhrase(value)
    .split(" ")
    .map((word) => {
      if (word.length <= 2 && word === word.toLowerCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function truncate(value: string, max: number): string {
  const clean = cleanPhrase(value);
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, "").trim();
}

export function generateShadowTitleSet(input: ShadowTitleInput, limit = 8): ShadowTitleCandidate[] {
  const language = String(input.language || "English").toLowerCase();
  const italian = language.includes("ital");
  const topic = titleCase(topicFromInput(input));
  const audience = audienceFromInput(input);
  const genre = cleanPhrase(input.genre || input.category || "self-help").replace(/-/g, " ");
  const fiction = isFictionGenre(input.genre || input.category);
  const promise = cleanPhrase(input.readerPromise);

  const candidates: ShadowTitleCandidate[] = fiction
    ? [
        {
          title: italian ? `La Promessa di ${topic}` : `The Promise of ${topic}`,
          subtitle: italian ? "Un romanzo di desiderio, conflitto e conseguenze" : "A novel of desire, conflict, and consequence",
          angle: "emotional hook",
        },
        {
          title: italian ? `Dove ${topic} Brucia` : `Where ${topic} Burns`,
          subtitle: italian ? "Una storia intensa di tensione, segreti e scelta" : "An intense story of tension, secrets, and choice",
          angle: "cinematic tension",
        },
        {
          title: italian ? `Il Segreto di ${topic}` : `The Secret of ${topic}`,
          subtitle: italian ? "Il primo libro di una serie ad alta tensione" : "The first book in a high-tension series",
          angle: "series starter",
        },
      ]
    : [
        {
          title: italian ? `${topic} Senza Confusione` : `${topic} Without Confusion`,
          subtitle: promise || (italian ? `Il metodo pratico per ${audience}` : `A practical method for ${audience}`),
          angle: "clarity promise",
        },
        {
          title: italian ? `Il Metodo ${topic}` : `The ${topic} Method`,
          subtitle: italian ? "Una guida passo dopo passo per ottenere risultati reali" : "A step-by-step guide to real results",
          angle: "method brand",
        },
        {
          title: italian ? `${topic}: La Guida Chiara` : `${topic}: The Clear Guide`,
          subtitle: italian ? `Strategie semplici per ${audience}` : `Simple strategies for ${audience}`,
          angle: "search-friendly guide",
        },
        {
          title: italian ? `${topic} in 30 Giorni` : `${topic} in 30 Days`,
          subtitle: italian ? "Un percorso concreto per partire, migliorare e restare costanti" : "A concrete path to start, improve, and stay consistent",
          angle: "time-bound plan",
        },
      ];

  const expanded = [
    ...candidates,
    {
      title: italian ? `Manuale Pratico di ${topic}` : `The Practical ${topic} Handbook`,
      subtitle: italian ? `Strumenti, esempi e piano d'azione per ${audience}` : `Tools, examples, and an action plan for ${audience}`,
      angle: "handbook",
    },
    {
      title: italian ? `${topic} per Principianti` : `${topic} for Beginners`,
      subtitle: italian ? "Le basi essenziali spiegate in modo semplice e applicabile" : "The essentials explained in a simple, usable way",
      angle: "beginner entry",
    },
    {
      title: italian ? `Oltre ${topic}` : `Beyond ${topic}`,
      subtitle: italian ? "La guida avanzata per trasformare conoscenza in risultati" : "The advanced guide to turn knowledge into results",
      angle: "advanced follow-up",
    },
  ];

  const seen = new Set<string>();
  return expanded
    .map((item, index) => ({
      title: truncate(item.title, 92),
      subtitle: truncate(item.subtitle, 150),
      angle: item.angle,
      keywords: [topic.toLowerCase(), genre.toLowerCase(), item.angle].filter(Boolean),
      confidence: Math.max(72, 94 - index * 3),
    }))
    .filter((item) => {
      const key = item.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return Boolean(item.title && item.subtitle);
    })
    .slice(0, limit);
}

export function ensureBookTitleMetadata<T extends Partial<BookConfig>>(
  config: T,
  context: ShadowTitleInput = {},
): T & { title: string; subtitle: string; shadowTitleOptions: ShadowTitleCandidate[] } {
  const merged: ShadowTitleInput = { ...context, ...config };
  const shadowTitleOptions = generateShadowTitleSet(merged, 8);
  const best = shadowTitleOptions[0] || {
    title: "Scriptora Book",
    subtitle: "A clear, complete book generated from a strategic editorial brief",
    angle: "fallback",
    keywords: [],
    confidence: 60,
  };

  return {
    ...config,
    title: isWeakBookTitle(config.title) ? best.title : truncate(config.title || best.title, 120),
    subtitle: isWeakBookSubtitle(config.subtitle) ? best.subtitle : truncate(config.subtitle || best.subtitle, 180),
    shadowTitleOptions,
  };
}
