import type { AuthorIdentity } from "@/types/book";

const AUTHOR_IDENTITIES_KEY = "scriptora-author-identities-v1";
export const SELECTED_AUTHOR_IDENTITY_KEY = "scriptora-selected-author-identity-v1";
export const AUTHOR_IDENTITY_CHANGED_EVENT = "scriptora-author-identity-change";

const BUILTIN_PLACEHOLDER_PEN_NAMES = new Set(["scriptora studio"]);

export const DEFAULT_AUTHOR_IDENTITIES: AuthorIdentity[] = [
  {
    id: "builtin-scriptora-cinematic",
    name: "Autore Cinematico",
    realName: "",
    penName: "Scriptora Studio",
    copyrightName: "Scriptora Studio",
    archetype: "Narratore visivo, emotivo, ad alta tensione",
    biography: "Autore abituato a costruire libri con scene forti, ritmo editoriale e immagini memorabili.",
    authorNote: "Scrive per trasformare idee e immaginazione in libri completi, coerenti e leggibili.",
    voice: "Frasi pulite, sensoriali, con alternanza di pause intime e accelerazioni narrative.",
    signatureMoves: "Aperture in scena; dettagli fisici precisi; finali di capitolo con domanda emotiva o rivelazione.",
    forbiddenMoves: "Non usare spiegoni, frasi generiche, moralismi o metafore ripetute.",
    recurringThemes: "Desiderio, trasformazione, potere personale, conseguenze emotive.",
    language: "Italian",
  },
  {
    id: "builtin-dark-romance",
    name: "Penna Dark Romance",
    realName: "",
    penName: "Livia Noir",
    copyrightName: "Livia Noir",
    archetype: "Autrice di romance oscuro, tensione psicologica e desiderio trattenuto",
    biography: "Scrive storie dove attrazione, colpa e vulnerabilità si intrecciano in ambientazioni dense.",
    authorNote: "Crede nelle storie dove desiderio e paura si sfiorano senza cancellare le conseguenze emotive.",
    voice: "Intensa, elegante, carnale senza diventare volgare; dialoghi con sottotesto e silenzi pesanti.",
    signatureMoves: "Quasi-contatto; conflitto interiore; oggetti simbolici; cliffhanger emotivi.",
    forbiddenMoves: "Non far confessare tutto troppo presto. Non risolvere la tensione senza conseguenza.",
    recurringThemes: "Ossessione, redenzione, fiducia, controllo, resa emotiva.",
    language: "Italian",
  },
  {
    id: "builtin-clear-nonfiction",
    name: "Saggista Chiaro",
    realName: "",
    penName: "A. Verdi",
    copyrightName: "A. Verdi",
    archetype: "Esperto pratico, autorevole, orientato alla trasformazione",
    biography: "Autore di manuali e self-help costruiti su esempi concreti, framework e applicazione immediata.",
    authorNote: "Scrive per rendere chiari problemi complessi e trasformarli in azioni concrete.",
    voice: "Chiara, diretta, calma; alterna storia, principio, esempio e azione pratica.",
    signatureMoves: "Framework numerati; domande diagnostiche; checklist; esempi quotidiani.",
    forbiddenMoves: "Non usare motivazione vaga, gergo inutile o promesse non dimostrate.",
    recurringThemes: "Metodo, abitudini, identità, decisioni, risultati misurabili.",
    language: "Italian",
  },
];

function safeParseIdentities(raw: string | null): AuthorIdentity[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item?.id && item?.penName);
  } catch {
    return [];
  }
}

export function loadAuthorIdentities(): AuthorIdentity[] {
  if (typeof window === "undefined") return DEFAULT_AUTHOR_IDENTITIES;
  const custom = safeParseIdentities(localStorage.getItem(AUTHOR_IDENTITIES_KEY));
  const customIds = new Set(custom.map((item) => item.id));
  return [
    ...DEFAULT_AUTHOR_IDENTITIES.filter((item) => !customIds.has(item.id)),
    ...custom,
  ];
}

export function getSelectedAuthorIdentityId(): string {
  if (typeof window === "undefined") return DEFAULT_AUTHOR_IDENTITIES[0].id;
  return localStorage.getItem(SELECTED_AUTHOR_IDENTITY_KEY) || DEFAULT_AUTHOR_IDENTITIES[0].id;
}

export function setSelectedAuthorIdentityId(id: string): void {
  if (typeof window === "undefined" || !id) return;
  localStorage.setItem(SELECTED_AUTHOR_IDENTITY_KEY, id);
  window.dispatchEvent(new CustomEvent(AUTHOR_IDENTITY_CHANGED_EVENT, { detail: { id } }));
}

export function getSelectedAuthorIdentity(): AuthorIdentity {
  const identities = loadAuthorIdentities();
  const selectedId = getSelectedAuthorIdentityId();
  const selected = identities.find((item) => item.id === selectedId) || identities[0] || DEFAULT_AUTHOR_IDENTITIES[0];
  if (typeof window !== "undefined" && selected.id !== selectedId) {
    localStorage.setItem(SELECTED_AUTHOR_IDENTITY_KEY, selected.id);
  }
  return selected;
}

export function saveAuthorIdentity(identity: AuthorIdentity): AuthorIdentity {
  const now = new Date().toISOString();
  const saved: AuthorIdentity = {
    ...identity,
    id: identity.id?.startsWith("custom-") ? identity.id : `custom-${(
typeof crypto !== "undefined" &&
typeof crypto.randomUUID === "function"
? crypto.randomUUID()
: `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
)}`,
    name: String(identity.name || identity.penName || identity.realName || "Nuovo autore").trim(),
    realName: String(identity.realName || "").trim(),
    penName: String(identity.penName || identity.name || "Autore").trim(),
    copyrightName: String(identity.copyrightName || identity.realName || identity.penName || identity.name || "").trim(),
    biography: String(identity.biography || "").trim(),
    authorNote: String(identity.authorNote || "").trim(),
    updatedAt: now,
    createdAt: identity.createdAt || now,
  };

  const existing = loadAuthorIdentities().filter((item) => item.id.startsWith("custom-"));
  const without = existing.filter((item) => item.id !== saved.id);
  localStorage.setItem(AUTHOR_IDENTITIES_KEY, JSON.stringify([saved, ...without].slice(0, 30)));
  return saved;
}

export function deleteAuthorIdentity(id: string): void {
  if (!id.startsWith("custom-")) return;
  const remaining = loadAuthorIdentities()
    .filter((item) => item.id.startsWith("custom-") && item.id !== id);
  localStorage.setItem(AUTHOR_IDENTITIES_KEY, JSON.stringify(remaining));
}

export function findAuthorIdentity(id?: string): AuthorIdentity | null {
  if (!id) return null;
  return loadAuthorIdentities().find((item) => item.id === id) || null;
}

export function resolveAuthorIdentity(identity?: AuthorIdentity | null, id?: string): AuthorIdentity | null {
  return normalizeAuthorIdentity(identity) || normalizeAuthorIdentity(findAuthorIdentity(id));
}

export function isBuiltinPlaceholderIdentity(identity?: AuthorIdentity | null): boolean {
  if (!identity) return true;
  if (identity.id.startsWith("custom-")) return false;
  const pen = String(identity.penName || identity.name || "").trim().toLowerCase();
  return BUILTIN_PLACEHOLDER_PEN_NAMES.has(pen) || !identity.biography?.trim() || identity.biography.length < 24;
}

export function authorIdentityCompleteness(identity?: AuthorIdentity | null): number {
  const id = identity || getSelectedAuthorIdentity();
  const fields = [
    id.name,
    id.penName,
    id.copyrightName || id.realName,
    id.archetype,
    id.biography,
    id.authorNote,
    id.voice,
    id.signatureMoves,
    id.forbiddenMoves,
    id.recurringThemes,
  ];
  return Math.round((fields.filter((value) => String(value || "").trim().length > 8).length / fields.length) * 100);
}

/** True when the user saved a custom identity with enough public author data. */
export function isUserAuthorIdentityConfigured(identity?: AuthorIdentity | null): boolean {
  const id = identity || getSelectedAuthorIdentity();
  if (!id.id.startsWith("custom-")) return false;
  const penName = String(id.penName || "").trim();
  const biography = String(id.biography || "").trim();
  return penName.length >= 2 && biography.length >= 24 && authorIdentityCompleteness(id) >= 45;
}

export function generateAuthorIdentityDraft(genre = "fiction"): Partial<AuthorIdentity> {
  const isNonfiction = /self-help|business|manual|education|non/i.test(genre);
  return isNonfiction
    ? {
        archetype: "Esperto pratico, autorevole e orientato alla trasformazione del lettore.",
        biography: "Scrive manuali e saggi costruiti su esempi concreti, framework chiari e applicazione immediata.",
        authorNote: "La missione è rendere comprensibili problemi complessi e trasformarli in azioni concrete.",
        voice: "Chiara, diretta, calma; alterna principio, esempio e passo operativo.",
        signatureMoves: "Framework numerati; checklist; domande diagnostiche; esempi quotidiani.",
        forbiddenMoves: "Niente motivazione vaga, gergo inutile o promesse non dimostrate.",
        recurringThemes: "Metodo, identità, abitudini, decisioni, risultati misurabili.",
      }
    : {
        archetype: "Autore narrativo con controllo di scena, desiderio e conseguenze emotive.",
        biography: "Costruisce storie con ritmo editoriale, personaggi memorabili e payoff emotivi credibili.",
        authorNote: "Ogni libro deve suonare scritto dallo stesso autore, con voce riconoscibile pagina dopo pagina.",
        voice: "Sensoriale, cinematografica, con sottotesto emotivo e frasi pulite.",
        signatureMoves: "Aperture in scena; dettagli fisici; cliffhanger emotivi; dialoghi con sottotesto.",
        forbiddenMoves: "Non spiegare troppo. Non risolvere conflitti senza costo emotivo.",
        recurringThemes: "Desiderio, identità, memoria, scelta irreversibile, trasformazione.",
      };
}

export function normalizeAuthorIdentity(identity?: AuthorIdentity | null): AuthorIdentity | null {
  if (!identity) return null;
  const penName = String(identity.penName || identity.name || "").trim();
  if (!penName) return null;
  return {
    ...identity,
    name: String(identity.name || penName).trim(),
    realName: String(identity.realName || "").trim(),
    penName,
    copyrightName: String(identity.copyrightName || identity.realName || penName).trim(),
    archetype: String(identity.archetype || "").trim(),
    biography: String(identity.biography || "").trim(),
    authorNote: String(identity.authorNote || "").trim(),
    voice: String(identity.voice || "").trim(),
    signatureMoves: String(identity.signatureMoves || "").trim(),
    forbiddenMoves: String(identity.forbiddenMoves || "").trim(),
    recurringThemes: String(identity.recurringThemes || "").trim(),
  };
}

export function resolveAuthorIdentityForPublishing(identity?: AuthorIdentity | null): AuthorIdentity | null {
  if (!isUserAuthorIdentityConfigured(identity)) return null;
  return normalizeAuthorIdentity(identity || getSelectedAuthorIdentity());
}

export function applyAuthorIdentityToConfig<T extends { [key: string]: any }>(
  config: T,
  identity: AuthorIdentity | null = getSelectedAuthorIdentity(),
): T {
  const normalized = resolveAuthorIdentityForPublishing(identity);
  if (!normalized) return config;
  return {
    ...config,
    authorIdentityId: normalized.id,
    authorIdentity: normalized,
    authorName: normalized.penName,
    author: normalized.penName,
    writerName: normalized.penName,
  };
}

export function enforceAuthorIdentityLock<T extends { [key: string]: any }>(
  config: T,
): T {
  const identity = getSelectedAuthorIdentity();

  if (!identity) return config;

  return applyAuthorIdentityToConfig(config, identity);
}
