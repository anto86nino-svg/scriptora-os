import type { AuthorIdentity } from "@/types/book";

const AUTHOR_IDENTITIES_KEY = "scriptora-author-identities-v1";

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

export function saveAuthorIdentity(identity: AuthorIdentity): AuthorIdentity {
  const now = new Date().toISOString();
  const saved: AuthorIdentity = {
    ...identity,
    id: identity.id?.startsWith("custom-") ? identity.id : `custom-${crypto.randomUUID()}`,
    name: identity.name.trim() || identity.penName.trim() || identity.realName?.trim() || "Nuovo autore",
    realName: String(identity.realName || "").trim(),
    penName: identity.penName.trim() || identity.name.trim() || "Autore",
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
