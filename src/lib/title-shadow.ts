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
  titleLanguage?: Language | string;
  characterBible?: string;
  manualCharacterNames?: string;
  tone?: string;
  seed?: number;
}

const WEAK_TITLE_RE = /^(untitled|untitled book|untitled bestseller|generating|generating book|to be generated|senza titolo|libro senza titolo|romanzo senza titolo)$/i;
const WEAK_SUBTITLE_RE = /^(subtitle|sottotitolo|to be generated|da generare|n\/a|-|_)$/i;
const DESCRIPTION_VERBS_RE = /\b(is|are|was|were|becomes|discovers|must|has to|viene|deve|scopre|porta|arriva|vuole|crede|cerca|trova|impara)\b/i;

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
  const looksLikeDescription =
    title.length > 78 ||
    (title.length > 48 && /[,.;:]/.test(title)) ||
    (title.split(/\s+/).length > 11 && DESCRIPTION_VERBS_RE.test(title));
  return !title || WEAK_TITLE_RE.test(title) || title.length < 4 || looksLikeDescription;
}

export function isWeakBookSubtitle(value?: string): boolean {
  const subtitle = cleanPhrase(value);
  const looksLikeFullPlot = subtitle.length > 180 || (subtitle.split(/\s+/).length > 24 && DESCRIPTION_VERBS_RE.test(subtitle));
  return !subtitle || WEAK_SUBTITLE_RE.test(subtitle) || subtitle.length < 8 || looksLikeFullPlot;
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

function titleLanguageFromInput(input: ShadowTitleInput): string {
  return String(input.titleLanguage || input.language || "English").toLowerCase();
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

function storyTopicFromInput(input: ShadowTitleInput): string {
  const fromIdea = cleanPhrase(input.idea || input.readerPromise || input.title);
  if (fromIdea) {
    return fromIdea
      .replace(/^(un|una|un'|un’|a|an|the|il|lo|la|l'|gli|le)\s*/i, "")
      .split(/[.?!:;,-]/)[0]
      .split(/\s+/)
      .slice(0, 5)
      .join(" ");
  }
  return topicFromInput(input);
}

function extractProperCharacterName(idea: string): string {
  const first = idea.match(/^([A-ZÀ-Ý][\wÀ-ÿ-]{2,})(?:,|\s)/)?.[1] || "";
  const lower = first.toLowerCase();
  if (!first || ["un", "una", "uno", "il", "lo", "la", "l", "the", "a", "an"].includes(lower)) return "";
  if (/[’']/.test(first)) return "";
  if (["Una", "Un", "Uno", "Il", "Lo", "La", "The"].includes(first)) return "";
  return first;
}

function extractCanonicalCharacterName(input: ShadowTitleInput): string {
  const manual = cleanPhrase(input.manualCharacterNames || "")
    .split(/[\n,;]/)[0]
    .replace(/^(nome|name):\s*/i, "")
    .trim();
  const fromManual = manual.match(/^([A-ZÀ-Ý][\wÀ-ÿ'-]{2,}(?:\s+[A-ZÀ-Ý][\wÀ-ÿ'-]{2,})?)/)?.[1] || "";
  if (fromManual) return fromManual;

  const fromBible = String(input.characterBible || "").match(/^(?:Nome|Name):\s*([^\n]{2,64})/im)?.[1] || "";
  const cleanBibleName = cleanPhrase(fromBible).replace(/\b(Cognome|Surname):.*$/i, "").trim();
  if (cleanBibleName && !/^(un|una|uno|il|lo|la|the|a|an)\b/i.test(cleanBibleName)) return cleanBibleName;

  return extractProperCharacterName(cleanPhrase(input.idea || ""));
}

function extractRoleNoun(idea: string): string {
  const match = idea.match(/(?:una|un|uno|un'|un’|a|an)\s*([^,.]{4,54})/i)?.[1] || "";
  return titleCase(
    match
      .replace(/\b(nella|nel|nello|nella sua|sua|suo|his|her|their|che|whose|who)\b.*$/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 3)
      .join(" "),
  );
}

function roleWithArticle(role: string, italian: boolean): string {
  const clean = cleanPhrase(role);
  if (!clean) return "";
  if (!italian) return `The ${clean}`;
  return /^[aeiouàèéìòù]/i.test(clean) ? `L'${clean}` : `La ${clean}`;
}

function genreLabelForFiction(input: ShadowTitleInput, italian: boolean): string {
  const genre = cleanPhrase(input.genre || "").toLowerCase();
  const subcategory = cleanPhrase(input.subcategory || "").toLowerCase();
  const combined = `${genre} ${subcategory}`;

  if (combined.includes("portal")) return "portal fantasy";
  if (combined.includes("romantasy")) return "romantasy";
  if (combined.includes("dark") && combined.includes("romance")) return "dark romance";
  if (combined.includes("fantasy")) return italian ? "romanzo fantasy" : "fantasy";
  if (combined.includes("thriller") || combined.includes("crime") || combined.includes("noir")) return "thriller";
  if (combined.includes("horror")) return italian ? "romanzo horror" : "horror";
  if (combined.includes("sci")) return italian ? "romanzo fantascientifico" : "science fiction";
  if (combined.includes("historical") || combined.includes("storico")) return italian ? "romanzo storico" : "historical";
  if (combined.includes("romance")) return "romance";
  return italian ? "romanzo" : "novel";
}

function detectStorySymbol(input: ShadowTitleInput, italian: boolean) {
  const lower = [
    input.idea,
    input.title,
    input.subtitle,
    input.subcategory,
    input.genre,
    input.tone,
    input.targetAudience,
    input.characterBible,
    input.manualCharacterNames,
  ].filter(Boolean).join(" ").toLowerCase();

  const symbolKey =
    lower.includes("cattedrale") || lower.includes("cathedral") ? "cathedral" :
    lower.includes("portal") || lower.includes("portale") || lower.includes("soglia") || lower.includes("dimension") ? "threshold" :
    lower.includes("santa") || lower.includes("saint") ? "saint" :
    lower.includes("ombra") || lower.includes("shadow") ? "shadow" :
    lower.includes("nebbia") || lower.includes("fog") || lower.includes("mist") ? "mist" :
    lower.includes("luce") || lower.includes("light") ? "light" :
    lower.includes("campana") || lower.includes("bell") ? "bells" :
    lower.includes("sangue") || lower.includes("blood") ? "blood" :
    lower.includes("memoria") || lower.includes("memory") ? "memory" :
    lower.includes("reliquia") || lower.includes("relic") ? "relic" :
    lower.includes("fantasy") ? "threshold" :
    lower.includes("thriller") ? "secret" :
    "topic";

  const symbol =
    symbolKey === "cathedral" ? (italian ? "Cattedrale" : "Cathedral") :
    symbolKey === "threshold" ? (italian ? "Soglia" : "Threshold") :
    symbolKey === "saint" ? (italian ? "Santa" : "Saint") :
    symbolKey === "shadow" ? (italian ? "Ombre" : "Shadows") :
    symbolKey === "mist" ? (italian ? "Nebbia" : "Mist") :
    symbolKey === "light" ? (italian ? "Luce" : "Light") :
    symbolKey === "bells" ? (italian ? "Campane" : "Bells") :
    symbolKey === "blood" ? (italian ? "Sangue" : "Blood") :
    symbolKey === "memory" ? (italian ? "Memoria" : "Memory") :
    symbolKey === "relic" ? (italian ? "Reliquia" : "Relic") :
    symbolKey === "secret" ? (italian ? "Segreto" : "Secret") :
    titleCase(storyTopicFromInput(input));

  const plural = ["Ombre", "Campane", "Shadows", "Bells"].includes(symbol);
  return {
    key: symbolKey,
    symbol,
    article: italian ? (plural ? "le" : "la") : "the",
    articleTitle: italian ? (plural ? "Le" : "La") : "The",
    of: italian ? (plural ? `delle ${symbol}` : `della ${symbol}`) : `of the ${symbol}`,
    broken: italian ? (plural ? `${symbol} Spezzate` : `${symbol} Spezzata`) : `Broken ${symbol}`,
    burns: italian ? (plural ? `Dove le ${symbol} Bruciano` : `Dove la ${symbol} Brucia`) : (plural ? `Where the ${symbol} Burn` : `Where the ${symbol} Burns`),
  };
}

function seedFromInput(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

function rotateBySeed<T>(items: T[], seed: number): T[] {
  if (!items.length) return items;
  const offset = seed % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function fictionSignals(input: ShadowTitleInput) {
  const idea = cleanPhrase(input.idea || input.title || input.readerPromise || "");
  const language = titleLanguageFromInput(input);
  const italian = language.includes("ital");
  const protagonist = extractCanonicalCharacterName(input);
  const storySymbol = detectStorySymbol(input, italian);
  const role = extractRoleNoun(idea);
  const roleLabel = roleWithArticle(role, italian);
  const genreLabel = genreLabelForFiction(input, italian);

  return {
    protagonist,
    symbolKey: storySymbol.key,
    symbol: storySymbol.symbol,
    symbolArticle: storySymbol.article,
    symbolArticleTitle: storySymbol.articleTitle,
    symbolOf: storySymbol.of,
    brokenSymbol: storySymbol.broken,
    burningTitle: storySymbol.burns,
    role,
    roleLabel,
    genreLabel,
    italian,
  };
}

type FictionSignal = ReturnType<typeof fictionSignals>;

function titleLocale(language: string): "en" | "it" | "es" | "fr" | "de" {
  if (language.includes("ital")) return "it";
  if (language.includes("span") || language.includes("espa")) return "es";
  if (language.includes("french") || language.includes("fran")) return "fr";
  if (language.includes("german") || language.includes("ted")) return "de";
  return "en";
}

function premiumSymbolTitle(signal: FictionSignal, language: string): string {
  const locale = titleLocale(language);
  const key = signal.symbolKey;

  if (locale === "it") {
    if (key === "cathedral") return "La Cattedrale delle Anime Dimenticate";
    if (key === "threshold") return "La Soglia delle Anime Dimenticate";
    if (key === "shadow") return "La Casa delle Ombre Dimenticate";
    if (key === "saint") return "La Santa delle Anime Perdute";
    if (key === "mist") return "La Cattedrale nella Nebbia";
    return `${signal.symbolArticleTitle} ${signal.symbol} delle Anime Dimenticate`;
  }

  if (locale === "es") {
    if (key === "cathedral") return "La Catedral de las Almas Olvidadas";
    if (key === "threshold") return "El Umbral de las Almas Olvidadas";
    if (key === "shadow") return "La Casa de las Sombras Olvidadas";
    return "La Deuda de las Almas Olvidadas";
  }

  if (locale === "fr") {
    if (key === "cathedral") return "La Cathédrale des Âmes Oubliées";
    if (key === "threshold") return "Le Seuil des Âmes Oubliées";
    if (key === "shadow") return "La Maison des Ombres Oubliées";
    return "La Dette des Âmes Oubliées";
  }

  if (locale === "de") {
    if (key === "cathedral") return "Die Kathedrale der vergessenen Seelen";
    if (key === "threshold") return "Die Schwelle der vergessenen Seelen";
    if (key === "shadow") return "Das Haus der vergessenen Schatten";
    return "Die Schuld der vergessenen Seelen";
  }

  if (key === "cathedral") return "The Cathedral of Forgotten Souls";
  if (key === "threshold") return "The Threshold of Forgotten Souls";
  if (key === "shadow") return "The House of Forgotten Shadows";
  if (key === "saint") return "The Saint of Forgotten Souls";
  if (key === "mist") return "The Cathedral in the Mist";
  return `The ${signal.symbol} of Forgotten Souls`;
}

function fictionTitlePool(signal: FictionSignal, language: string): string[] {
  const locale = titleLocale(language);
  const primary = premiumSymbolTitle(signal, language);

  if (locale === "it") {
    return [
      primary,
      `Il Debito ${signal.symbolOf}`,
      signal.protagonist ? `${signal.protagonist} e ${signal.symbolArticle} ${signal.symbol}` : `Oltre ${signal.symbolArticle} ${signal.symbol}`,
      `Il Segreto ${signal.symbolOf}`,
      signal.burningTitle,
      signal.protagonist ? `Il Destino di ${signal.protagonist}` : `La Prigione ${signal.symbolOf}`,
      `${signal.symbolArticleTitle} ${signal.symbol} Viventi`,
      signal.roleLabel ? `${signal.roleLabel} Perduta` : `La Promessa ${signal.symbolOf}`,
    ];
  }

  if (locale === "es") {
    return [
      primary,
      "La Deuda de las Almas",
      signal.protagonist ? `${signal.protagonist} y el Umbral` : "Más allá del Umbral",
      "El Secreto de la Catedral",
      "Donde arden las sombras",
      "La Prisión de la Santa",
      "Las Almas que Recuerdan",
      "El Precio de Cruzar",
    ];
  }

  if (locale === "fr") {
    return [
      primary,
      "La Dette des Âmes",
      signal.protagonist ? `${signal.protagonist} et le Seuil` : "Au-delà du Seuil",
      "Le Secret de la Cathédrale",
      "Là où brûlent les ombres",
      "La Prison de la Sainte",
      "Les Âmes qui se souviennent",
      "Le Prix du Passage",
    ];
  }

  if (locale === "de") {
    return [
      primary,
      "Die Schuld der Seelen",
      signal.protagonist ? `${signal.protagonist} und die Schwelle` : "Jenseits der Schwelle",
      "Das Geheimnis der Kathedrale",
      "Wo die Schatten brennen",
      "Das Gefängnis der Heiligen",
      "Die Seelen, die sich erinnern",
      "Der Preis des Übergangs",
    ];
  }

  return [
    primary,
    `The Debt of the ${signal.symbol}`,
    signal.protagonist ? `${signal.protagonist} and the ${signal.symbol}` : `Beyond the ${signal.symbol}`,
    `The Secret of the ${signal.symbol}`,
    signal.burningTitle,
    signal.protagonist ? `The Fate of ${signal.protagonist}` : `The Prison ${signal.symbolOf}`,
    `The Living ${signal.symbol}`,
    signal.roleLabel ? `${signal.roleLabel} Lost` : `The Promise ${signal.symbolOf}`,
  ];
}

function fictionTaglinePool(language: string): string[] {
  const locale = titleLocale(language);

  if (locale === "it") {
    return [
      "Ogni segreto ha un prezzo. Ogni anima reclama il proprio debito.",
      "La soglia si apre una sola volta. Il prezzo resta per sempre.",
      "Salvare una santa può significare diventare la sua prigione.",
      "La memoria non perdona. Il desiderio non dimentica.",
      "Alcuni mondi non muoiono. Aspettano di essere riaperti.",
      "La colpa chiede redenzione. L'amore chiede sacrificio.",
      "Dove finisce la fede, comincia il debito.",
      "Nessuna porta resta chiusa a chi porta la chiave nel sangue.",
    ];
  }

  if (locale === "es") {
    return [
      "Cada secreto tiene un precio. Cada alma reclama su deuda.",
      "El umbral se abre una vez. El precio queda para siempre.",
      "Salvar a una santa puede convertirte en su prisión.",
      "La memoria no perdona. El deseo no olvida.",
      "Algunos mundos no mueren. Esperan ser abiertos.",
      "La culpa pide redención. El amor exige sacrificio.",
      "Donde termina la fe, empieza la deuda.",
      "Ninguna puerta se cierra ante quien lleva la llave en la sangre.",
    ];
  }

  if (locale === "fr") {
    return [
      "Chaque secret a un prix. Chaque âme réclame sa dette.",
      "Le seuil ne s'ouvre qu'une fois. Le prix demeure.",
      "Sauver une sainte peut faire de vous sa prison.",
      "La mémoire ne pardonne pas. Le désir n'oublie rien.",
      "Certains mondes ne meurent pas. Ils attendent qu'on les rouvre.",
      "La faute demande rédemption. L'amour exige sacrifice.",
      "Là où finit la foi, la dette commence.",
      "Aucune porte ne résiste à qui porte la clé dans le sang.",
    ];
  }

  if (locale === "de") {
    return [
      "Jedes Geheimnis hat seinen Preis. Jede Seele fordert ihre Schuld.",
      "Die Schwelle öffnet sich nur einmal. Der Preis bleibt.",
      "Eine Heilige zu retten kann bedeuten, ihr Gefängnis zu werden.",
      "Erinnerung vergibt nicht. Verlangen vergisst nicht.",
      "Manche Welten sterben nicht. Sie warten darauf, geöffnet zu werden.",
      "Schuld verlangt Erlösung. Liebe verlangt Opfer.",
      "Wo der Glaube endet, beginnt die Schuld.",
      "Keine Tür bleibt verschlossen, wenn der Schlüssel im Blut liegt.",
    ];
  }

  return [
    "Every secret has a price. Every soul demands its debt.",
    "The threshold opens once. The price lasts forever.",
    "To save a saint, she may have to become the prison.",
    "Memory does not forgive. Desire does not forget.",
    "Some worlds do not die. They wait to be opened.",
    "Guilt asks for redemption. Love asks for sacrifice.",
    "Where faith ends, the debt begins.",
    "No door stays closed to the one who carries the key in blood.",
  ];
}

export function generateShadowTitleSet(input: ShadowTitleInput, limit = 8): ShadowTitleCandidate[] {
  const language = titleLanguageFromInput(input);
  const italian = language.includes("ital");
  const topic = titleCase(topicFromInput(input));
  const audience = audienceFromInput(input);
  const genre = cleanPhrase(input.genre || input.category || "self-help").replace(/-/g, " ");
  const fiction = isFictionGenre(input.genre || input.category);
  const promise = cleanPhrase(input.readerPromise);
  const seed = (input.seed ?? 0) + seedFromInput([input.idea, input.title, input.subtitle, input.genre, input.subcategory].filter(Boolean).join("|"));
  const fictionSignal = fictionSignals(input);
  const fictionTitles = fictionTitlePool(fictionSignal, language);
  const fictionTaglines = fictionTaglinePool(language);

  const candidates: ShadowTitleCandidate[] = fiction
    ? [
        {
          title: fictionTitles[0],
          subtitle: fictionTaglines[0],
          angle: "concept hook",
        },
        ...rotateBySeed([
          { title: fictionTitles[1], subtitle: fictionTaglines[1], angle: "mythic debt" },
          { title: fictionTitles[2], subtitle: fictionTaglines[2], angle: "character lock" },
          { title: fictionTitles[3], subtitle: fictionTaglines[3], angle: "secret hook" },
          { title: fictionTitles[4], subtitle: fictionTaglines[4], angle: "cinematic tension" },
          { title: fictionTitles[5], subtitle: fictionTaglines[5], angle: "emotional hook" },
        ], seed),
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

  const expanded = fiction
    ? [
        ...candidates,
        {
          title: fictionTitles[6],
          subtitle: fictionTaglines[6],
          angle: "market hook",
        },
        {
          title: fictionTitles[7],
          subtitle: fictionTaglines[7],
          angle: "dark positioning",
        },
      ]
    : [
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
          subtitle: italian ? "La guida avanzata per trasformare conoscenza in risultati" : "The advanced guide to turn knowledge in results",
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
