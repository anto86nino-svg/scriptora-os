import type { AuthorIdentity, AuthorIdentityLock, BookConfig } from "@/types/book";
import { normalizeAuthorPlatform, normalizePublishedBooks } from "@/lib/author-brain/ecosystem";
import { normalizeAuthorPresence, normalizeReaderEmotionalGoals } from "@/lib/author-brain/voice-memory";

const AUTHOR_IDENTITIES_KEY = "scriptora-author-identities-v1";
export const SELECTED_AUTHOR_IDENTITY_KEY = "scriptora-selected-author-identity-v1";
export const AUTHOR_IDENTITY_CHANGED_EVENT = "scriptora-author-identity-change";
export const AUTHOR_IDENTITY_LOCK_VERSION = 2 as const;

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
    id: identity.id?.startsWith("custom-") ? identity.id : `custom-${crypto.randomUUID()}`,
    name: identity.name.trim() || identity.penName.trim() || identity.realName?.trim() || "Nuovo autore",
    realName: String(identity.realName || "").trim(),
    penName: identity.penName.trim() || identity.name.trim() || "Autore",
    copyrightName: String(identity.copyrightName || identity.realName || identity.penName || identity.name || "").trim(),
    biography: String(identity.biography || "").trim(),
    authorBrainSeed: String(identity.authorBrainSeed || "").trim(),
    publishedBooks: normalizePublishedBooks(identity.publishedBooks),
    authorPlatform: normalizeAuthorPlatform(identity.authorPlatform),
    authorPresence: normalizeAuthorPresence(identity.authorPresence),
    readerEmotionalGoals: normalizeReaderEmotionalGoals(identity.readerEmotionalGoals),
    authorMessage: String(identity.authorMessage || "").trim(),
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
    authorBrainSeed: String(identity.authorBrainSeed || "").trim(),
    publishedBooks: normalizePublishedBooks(identity.publishedBooks),
    authorPlatform: normalizeAuthorPlatform(identity.authorPlatform),
    authorPresence: normalizeAuthorPresence(identity.authorPresence),
    readerEmotionalGoals: normalizeReaderEmotionalGoals(identity.readerEmotionalGoals),
    authorMessage: String(identity.authorMessage || "").trim(),
    authorNote: String(identity.authorNote || "").trim(),
    voice: String(identity.voice || "").trim(),
    signatureMoves: String(identity.signatureMoves || "").trim(),
    forbiddenMoves: String(identity.forbiddenMoves || "").trim(),
    recurringThemes: String(identity.recurringThemes || "").trim(),
  };
}

export function applyAuthorIdentityToConfig<T extends { [key: string]: any }>(
  config: T,
  identity: AuthorIdentity | null = getSelectedAuthorIdentity(),
): T {
  const normalized = normalizeAuthorIdentity(identity);
  if (!normalized) return config;
  return {
    ...config,
    authorIdentityId: normalized.id,
    authorIdentity: normalized,
    authorName: normalized.penName,
    author: normalized.penName,
    writerName: normalized.penName,
    authorIdentityLock: buildAuthorIdentityLock(normalized),
  };
}

/** Stable fingerprint of voice-defining fields — detects accidental identity drift */
export function buildAuthorIdentityFingerprint(identity: AuthorIdentity): string {
  const payload = [
    identity.id,
    identity.penName,
    identity.voice,
    identity.signatureMoves,
    identity.forbiddenMoves,
    identity.archetype,
    identity.recurringThemes,
  ]
    .map((part) => String(part || "").trim().toLowerCase())
    .join("|");
  let hash = 0;
  for (let i = 0; i < payload.length; i += 1) {
    hash = (hash * 31 + payload.charCodeAt(i)) >>> 0;
  }
  return `v${AUTHOR_IDENTITY_LOCK_VERSION}-${hash.toString(16)}`;
}

export function buildAuthorIdentityLock(identity: AuthorIdentity): AuthorIdentityLock {
  const normalized = normalizeAuthorIdentity(identity);
  if (!normalized) {
    throw new Error("Cannot lock invalid author identity");
  }
  return {
    version: AUTHOR_IDENTITY_LOCK_VERSION,
    identityId: normalized.id,
    penName: normalized.penName,
    fingerprint: buildAuthorIdentityFingerprint(normalized),
    lockedAt: new Date().toISOString(),
  };
}

/**
 * Enforce author identity lock on a project config.
 * Never swaps a locked project to the globally selected author.
 */
export function enforceAuthorIdentityLock<T extends BookConfig>(config: T): T {
  const lock = config.authorIdentityLock;
  const lockedId = lock?.identityId || config.authorIdentityId;

  if (lockedId) {
    const resolved =
      resolveAuthorIdentity(config.authorIdentity, lockedId) ||
      findAuthorIdentity(lockedId);

    if (resolved) {
      const next = applyAuthorIdentityToConfig(config, resolved) as T;
      const fingerprint = buildAuthorIdentityFingerprint(resolved);
      if (lock && lock.fingerprint !== fingerprint) {
        return {
          ...next,
          authorIdentityLock: {
            ...lock,
            penName: resolved.penName,
            fingerprint,
          },
        };
      }
      return next;
    }

    if (config.authorIdentity && normalizeAuthorIdentity(config.authorIdentity)) {
      const embedded = normalizeAuthorIdentity(config.authorIdentity)!;
      return {
        ...config,
        authorIdentityId: embedded.id,
        authorName: embedded.penName,
        author: embedded.penName,
        writerName: embedded.penName,
        authorIdentityLock: lock || buildAuthorIdentityLock(embedded),
      };
    }
  }

  const hasAuthorName = !!String(config.authorName || config.author || config.writerName || "").trim();
  if (hasAuthorName && config.authorIdentity) {
    const embedded = normalizeAuthorIdentity(config.authorIdentity);
    if (embedded) {
      return {
        ...config,
        authorIdentityId: embedded.id,
        authorIdentityLock: lock || buildAuthorIdentityLock(embedded),
      } as T;
    }
  }

  if (!lockedId && !hasAuthorName) {
    return applyAuthorIdentityToConfig(config, getSelectedAuthorIdentity()) as T;
  }

  return config;
}

/** Validate localStorage author selection on app boot */
export function validateAuthorIdentityStorage(): void {
  if (typeof window === "undefined") return;
  const identities = loadAuthorIdentities();
  const selectedId = getSelectedAuthorIdentityId();
  const exists = identities.some((item) => item.id === selectedId);
  if (!exists && identities[0]) {
    setSelectedAuthorIdentityId(identities[0].id);
  }
}

export function assertAuthorIdentityMatch(config: BookConfig): boolean {
  const lock = config.authorIdentityLock;
  const identity = normalizeAuthorIdentity(config.authorIdentity);
  if (!lock || !identity) return true;
  return lock.identityId === identity.id && lock.penName === identity.penName;
}
